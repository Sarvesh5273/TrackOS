// Weekly update: computed from tasks + GitHub activity. Server only.

import type { AdminClient } from "@/lib/supabase/admin";
import { dbError } from "@/lib/api/auth";
import { createActorResolver, isBotActor, loadMemberIdentities } from "@/lib/identity";
import { dedupeEvidence, loadTasks } from "@/lib/reports/build";
import { SIZE_POINTS, effectiveSplit, formatTaskRef, isOverdue, taskKeyOf } from "@/lib/tasks";
import type { Task } from "@/types";

const DAY = 24 * 60 * 60 * 1000;

export interface DigestTask {
  ref: string;
  title: string;
  assignees: string[];
  size: string;
  at: string | null;
}

export interface DigestPerson {
  userId: string;
  name: string;
  avatarUrl: string;
  tasksDone: number;
  points: number;
  commits: number;
  prsMerged: number;
  reviews: number;
  lastActiveAt: string | null;
  inactive: boolean;
}

export interface Digest {
  project: string;
  period: { from: string; to: string; days: number | null };
  totals: {
    tasksDone: number;
    pointsDone: number;
    inProgress: number;
    openTasks: number;
    overdue: number;
    commits: number;
    prsMerged: number;
    reviews: number;
  };
  completed: DigestTask[];
  inProgress: DigestTask[];
  overdue: DigestTask[];
  dueSoon: DigestTask[];
  merged: { title: string; author: string; url: string | null; at: string }[];
  people: DigestPerson[];
  unmatchedCount: number;
  tasksReady: boolean;
  markdown: string;
}

function fmt(date: string | Date) {
  const d = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`) : new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function buildDigest(
  admin: AdminClient,
  workspace: Record<string, any>,
  days: number | null
): Promise<Digest> {
  const now = new Date();
  const projectStart = workspace.start_date ? new Date(workspace.start_date) : new Date(now.getTime() - 30 * DAY);
  const from = days ? new Date(now.getTime() - days * DAY) : projectStart;
  const inPeriod = (value?: string | null) => {
    if (!value) return false;
    const t = new Date(value).getTime();
    return t >= from.getTime() && t <= now.getTime();
  };

  const key = taskKeyOf(workspace);
  const [{ tasks, ready }, members, { data: rawEvidence, error }] = await Promise.all([
    loadTasks(admin, workspace.id),
    loadMemberIdentities(admin, workspace.id),
    admin
      .from("evidence_items")
      .select("id, source, source_id, source_url, actor_id, actor_username, actor_email, timestamp, summary, metadata, is_bot_generated, is_excluded")
      .eq("workspace_id", workspace.id)
      .gte("timestamp", new Date(from.getTime() - 60 * DAY).toISOString())
      .order("timestamp", { ascending: false })
      .limit(3000),
  ]);
  if (error) throw dbError(error);

  const nameOf = new Map(members.map((m) => [m.userId, m.name] as [string, string]));
  const names = (t: Task) => t.assignee_ids.map((id) => nameOf.get(id) || "Former member");
  const toDigestTask = (t: Task, at: string | null): DigestTask => ({
    ref: formatTaskRef(key, t.number),
    title: t.title,
    assignees: names(t),
    size: t.size,
    at,
  });

  const completedTasks = tasks.filter((t) => t.status === "done" && inPeriod(t.completed_at));
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const overdueTasks = tasks.filter((t) => isOverdue(t, now));
  const soon = new Date(now.getTime() + 7 * DAY).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const dueSoonTasks = tasks.filter((t) => t.status !== "done" && t.due_date && t.due_date >= today && t.due_date <= soon);

  // People
  const resolve = createActorResolver(members);
  const memberIds = new Set(members.map((m) => m.userId));
  const people = new Map<string, DigestPerson>(
    members
      .filter((m) => m.role !== "reviewer")
      .map(
        (m) =>
          [
            m.userId,
            {
              userId: m.userId,
              name: m.name,
              avatarUrl: m.avatarUrl,
              tasksDone: 0,
              points: 0,
              commits: 0,
              prsMerged: 0,
              reviews: 0,
              lastActiveAt: null,
              inactive: true,
            },
          ] as [string, DigestPerson]
      )
  );
  const touch = (userId: string, at: string | null | undefined) => {
    const p = people.get(userId);
    if (!p || !at) return;
    if (!p.lastActiveAt || at > p.lastActiveAt) p.lastActiveAt = at;
    if (inPeriod(at)) p.inactive = false;
  };

  for (const t of tasks) {
    const split = effectiveSplit(t);
    for (const id of t.assignee_ids) {
      touch(id, t.completed_at);
      touch(id, t.started_at);
      if (t.status === "done" && inPeriod(t.completed_at)) {
        const p = people.get(id);
        if (p) {
          p.tasksDone++;
          p.points += (SIZE_POINTS[t.size] * (split[id] || 0)) / 100;
        }
      }
    }
  }

  let commits = 0;
  let reviews = 0;
  let unmatchedCount = 0;
  const merged: Digest["merged"] = [];
  for (const e of dedupeEvidence((rawEvidence || []) as any[])) {
    if (e.is_bot_generated || e.is_excluded || isBotActor(e.actor_username)) continue;
    const meta = (e.metadata || {}) as Record<string, any>;
    const userId =
      e.actor_id && memberIds.has(e.actor_id) ? e.actor_id : resolve(e.actor_username, e.actor_email)?.userId || null;
    const at = e.source === "github_pr" && meta.merged ? meta.mergedAt || e.timestamp : e.timestamp;
    if (userId) touch(userId, at);
    if (!inPeriod(at)) continue;
    if (!userId && String(e.source).startsWith("github")) unmatchedCount++;
    const p = userId ? people.get(userId) : undefined;

    if (e.source === "github_commit" && !meta.isMerge) {
      commits++;
      if (p) p.commits++;
    } else if (e.source === "github_review") {
      reviews++;
      if (p) p.reviews++;
    } else if (e.source === "github_pr" && meta.merged) {
      merged.push({
        title: e.summary || "Pull request",
        author: userId ? nameOf.get(userId) || e.actor_username : e.actor_username || "unknown",
        url: e.source_url,
        at,
      });
      if (p) p.prsMerged++;
    }
  }

  const peopleList = Array.from(people.values())
    .map((p) => ({ ...p, points: Math.round(p.points * 10) / 10 }))
    .sort((a, b) => b.points - a.points || b.commits - a.commits);

  const digest: Omit<Digest, "markdown"> = {
    project: workspace.name,
    period: { from: from.toISOString(), to: now.toISOString(), days },
    totals: {
      tasksDone: completedTasks.length,
      pointsDone: completedTasks.reduce((s, t) => s + SIZE_POINTS[t.size], 0),
      inProgress: inProgressTasks.length,
      openTasks: tasks.filter((t) => t.status !== "done").length,
      overdue: overdueTasks.length,
      commits,
      prsMerged: merged.length,
      reviews,
    },
    completed: completedTasks
      .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))
      .map((t) => toDigestTask(t, t.completed_at)),
    inProgress: inProgressTasks.map((t) => toDigestTask(t, t.started_at)),
    overdue: overdueTasks.map((t) => toDigestTask(t, t.due_date)),
    dueSoon: dueSoonTasks
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
      .map((t) => toDigestTask(t, t.due_date)),
    merged: merged.sort((a, b) => b.at.localeCompare(a.at)),
    people: peopleList,
    unmatchedCount,
    tasksReady: ready,
  };

  return { ...digest, markdown: toMarkdown(digest) };
}

function list(items: DigestTask[], withDate?: "due") {
  return items
    .map((t) => {
      const who = t.assignees.length ? ` (${t.assignees.join(", ")})` : " (unassigned)";
      const when = withDate === "due" && t.at ? `, due ${fmt(t.at)}` : "";
      return `- ${t.ref} ${t.title}${who}${when}`;
    })
    .join("\n");
}

function toMarkdown(d: Omit<Digest, "markdown">): string {
  const range = `${fmt(d.period.from)} – ${fmt(d.period.to)}`;
  const lines: string[] = [`**${d.project}: update for ${range}**`, ""];

  lines.push(`**Done** (${d.totals.tasksDone} tasks, ${d.totals.pointsDone} points)`);
  lines.push(d.completed.length ? list(d.completed) : "- Nothing finished in this period.");
  lines.push("");

  if (d.inProgress.length) {
    lines.push("**In progress**", list(d.inProgress), "");
  }
  if (d.overdue.length) {
    lines.push("**Overdue**", list(d.overdue, "due"), "");
  }
  if (d.dueSoon.length) {
    lines.push("**Due in the next 7 days**", list(d.dueSoon, "due"), "");
  }

  lines.push(`**GitHub:** ${d.totals.prsMerged} PRs merged, ${d.totals.commits} commits, ${d.totals.reviews} reviews`, "");

  lines.push("**Team**");
  for (const p of d.people) {
    if (p.inactive) {
      lines.push(`- ${p.name}: no activity in this period`);
      continue;
    }
    const parts = [
      `${p.tasksDone} task${p.tasksDone === 1 ? "" : "s"} (${p.points} pts)`,
      p.commits ? `${p.commits} commits` : "",
      p.prsMerged ? `${p.prsMerged} PRs merged` : "",
      p.reviews ? `${p.reviews} reviews` : "",
    ].filter(Boolean);
    lines.push(`- ${p.name}: ${parts.join(", ")}`);
  }

  return lines.join("\n").trim();
}
