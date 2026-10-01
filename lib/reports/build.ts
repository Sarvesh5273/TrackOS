// Builds a provisional credit report from done tasks + GitHub/manual activity.
// Server only.

import type { AdminClient } from "@/lib/supabase/admin";
import { calculateContributionScores } from "@/lib/scoring/engine";
import {
  createActorResolver,
  isBotActor,
  loadMemberIdentities,
  resolveCoAuthors,
  type MemberIdentity,
} from "@/lib/identity";
import {
  CATEGORY_IDS,
  DEFAULT_CATEGORY_WEIGHTS,
  SIZE_POINTS,
  effectiveSplit,
  extractTaskRefs,
  formatTaskRef,
  isTaskVerified,
  linkEvidenceToTasks,
  taskKeyOf,
  verifyingTaskLinks,
} from "@/lib/tasks";
import { dbError, isMissingSchema } from "@/lib/api/auth";
import { CREDIT_RULES, type IntegrityCheck, type ReportScoringLogic, type SnapshotTask } from "@/lib/reports/types";
import type { ContributionCategory, ScoringEvidenceItem, Task } from "@/types";

const DAY = 24 * 60 * 60 * 1000;

export async function loadTasks(admin: AdminClient, workspaceId: string): Promise<{ tasks: Task[]; ready: boolean }> {
  const { data, error } = await admin
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true });
  if (error) {
    if (isMissingSchema(error)) return { tasks: [], ready: false };
    throw dbError(error);
  }
  return { tasks: (data || []) as Task[], ready: true };
}

/** De-duplicates evidence rows by source + source_id (keeps the first seen). */
export function dedupeEvidence<T extends { id: string; source: string; source_id: string | null }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = row.source_id ? `${row.source}:${row.source_id}` : row.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function categoryWeightsOf(workspace: Record<string, any>): Record<string, number> {
  const configured = Array.isArray(workspace.categories) ? workspace.categories : [];
  const source = configured.length > 0 ? configured : DEFAULT_CATEGORY_WEIGHTS;
  const weights: Record<string, number> = {};
  for (const c of source) {
    if (c && CATEGORY_IDS.includes(c.id)) weights[c.id] = Number(c.weight) || 0;
  }
  return weights;
}

export async function generateReport(
  admin: AdminClient,
  workspace: Record<string, any>,
  generatedBy: string
) {
  const workspaceId = workspace.id as string;
  const key = taskKeyOf(workspace);

  const [{ data: rawEvidence, error: evError }, { tasks }, members] = await Promise.all([
    admin.from("evidence_items").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
    loadTasks(admin, workspaceId),
    loadMemberIdentities(admin, workspaceId),
  ]);
  if (evError) throw dbError(evError);

  const evidence = dedupeEvidence((rawEvidence || []) as any[]);
  const memberIds = new Set(members.map((m) => m.userId));
  const resolve = createActorResolver(members);
  const tasksByNumber = new Map<number, Task>(tasks.map((t) => [t.number, t] as [number, Task]));
  const links = linkEvidenceToTasks(
    evidence.map((e) => ({
      ...e,
      resolved_actor_id:
        e.actor_id && memberIds.has(e.actor_id) ? e.actor_id : resolve(e.actor_username, e.actor_email)?.userId || null,
      is_bot_generated: Boolean(e.is_bot_generated) || isBotActor(e.actor_username),
    })),
    key
  );

  // ---------- Evidence -> scoring items ----------
  const items: ScoringEvidenceItem[] = [];
  let unattributedItems = 0;
  let outsideWindow = 0;
  const start = workspace.start_date ? new Date(workspace.start_date).getTime() : null;
  const end = workspace.end_date ? new Date(workspace.end_date).getTime() + DAY : null;

  for (const e of evidence) {
    const meta = (e.metadata || {}) as Record<string, any>;
    const resolved =
      e.actor_id && memberIds.has(e.actor_id)
        ? { userId: e.actor_id as string, confidence: Number(e.attribution_confidence) || 1 }
        : resolve(e.actor_username, e.actor_email);
    const actorId = resolved?.userId || null;
    const collaboratorIds = resolveCoAuthors(resolve, meta.coAuthors).filter((id) => id !== actorId);
    const isBot = Boolean(e.is_bot_generated) || isBotActor(e.actor_username);

    // Credit follows the task: linked work by an assignee uses the task's split
    let shares: { userId: string; share: number }[] | undefined;
    let sharedVia: string | null = null;
    if (actorId && e.source !== "manual") {
      const refs = extractTaskRefs(e.summary, key).concat(extractTaskRefs(e.description, key));
      for (const n of refs) {
        const task = tasksByNumber.get(n);
        if (task && task.assignee_ids.includes(actorId) && task.assignee_ids.length > 1) {
          shares = Object.entries(effectiveSplit(task))
            .filter(([userId]) => memberIds.has(userId))
            .map(([userId, pct]) => ({ userId, share: pct / 100 }));
          sharedVia = formatTaskRef(key, n);
          break;
        }
      }
    }

    const countable = !isBot && !e.is_excluded && !e.is_duplicate;
    if (countable && !actorId && collaboratorIds.length === 0) unattributedItems++;
    const ts = new Date(e.timestamp).getTime();
    if (countable && ((start && ts < start - DAY) || (end && ts > end))) outsideWindow++;

    items.push({
      id: e.id,
      source: e.source,
      summary: sharedVia ? `${e.summary || "Work item"} (shared via ${sharedVia})` : e.summary,
      category: (CATEGORY_IDS.includes(e.category) ? e.category : "development") as ContributionCategory,
      actorId,
      collaboratorIds,
      shares,
      attributionConfidence: resolved?.confidence ?? 1,
      timestamp: new Date(e.timestamp),
      baseWeight: e.base_weight ?? 1.0,
      impactFactor: e.impact_factor ?? 1.0,
      qualityFactor: e.quality_factor ?? 1.0,
      duplicationFactor: e.duplication_factor ?? 1.0,
      isDuplicate: e.is_duplicate,
      isBotGenerated: isBot,
      isExcluded: e.is_excluded,
      verificationState: e.verification_state,
      workType: e.work_type || "created",
      metadata: meta,
    });
  }

  // ---------- Done tasks -> scoring items ----------
  const nameOf = new Map<string, string>(members.map((m) => [m.userId, m.name] as [string, string]));
  const snapshotTasks: SnapshotTask[] = [];
  let selfReportedPoints = 0;
  let totalTaskPoints = 0;

  for (const task of tasks.filter((t) => t.status === "done")) {
    const linked = verifyingTaskLinks(task, links.get(task.number) || []);
    const verified = isTaskVerified(task, linked.length);
    const verification: SnapshotTask["verification"] =
      linked.length > 0 ? "github" : verified ? "teammate" : "self_reported";
    const split = effectiveSplit(task);
    const shares = Object.entries(split)
      .filter(([userId]) => memberIds.has(userId))
      .map(([userId, pct]) => ({ userId, share: pct / 100 }));
    const points = SIZE_POINTS[task.size] || 2;
    const ref = formatTaskRef(key, task.number);
    const completedAt = task.completed_at || task.updated_at;

    totalTaskPoints += points;
    if (verification === "self_reported") selfReportedPoints += points;
    const ts = new Date(completedAt).getTime();
    if ((start && ts < start - DAY) || (end && ts > end)) outsideWindow++;
    if (shares.length === 0) unattributedItems++;

    items.push({
      id: `task:${task.id}`,
      source: "task",
      summary: `${ref} · ${task.title}`,
      category: task.category,
      actorId: null,
      collaboratorIds: [],
      shares,
      timestamp: new Date(completedAt),
      impactFactor: points,
      verificationState:
        verification === "github" ? "provider_verified" : verification === "teammate" ? "collaborator_confirmed" : "manual_submitted",
      workType: "created",
      metadata: { taskId: task.id, ref },
    });

    snapshotTasks.push({
      id: task.id,
      ref,
      title: task.title,
      category: task.category,
      size: task.size,
      points,
      assignees: Object.entries(split).map(([userId, share]) => ({
        userId,
        name: nameOf.get(userId) || "Former member",
        share,
      })),
      completedAt,
      verified,
      verification,
      linkedCount: linked.length,
    });
  }

  // ---------- Score ----------
  const contributors = members.filter((m) => m.role !== "reviewer");
  const output = calculateContributionScores({
    workspaceId,
    evidenceItems: items,
    categoryWeights: categoryWeightsOf(workspace),
    members: contributors.map((m) => ({ userId: m.userId })),
    policyVersion: workspace.policy_version || 1,
  });

  const byId = new Map<string, MemberIdentity>(members.map((m) => [m.userId, m] as [string, MemberIdentity]));
  const memberResults = output.memberResults.map((r) => {
    const m = byId.get(r.userId);
    const myTasks = snapshotTasks.filter((t) => t.assignees.some((a) => a.userId === r.userId));
    const taskPoints = myTasks.reduce(
      (sum, t) => sum + (t.points * (t.assignees.find((a) => a.userId === r.userId)?.share || 0)) / 100,
      0
    );
    return {
      ...r,
      displayName: m?.name || "Teammate",
      avatarUrl: m?.avatarUrl || "",
      githubLogin: m?.githubLogin || null,
      tasksDone: myTasks.length,
      taskPoints: Math.round(taskPoints * 10) / 10,
    };
  });

  // ---------- Integrity checks ----------
  const githubItems = evidence.filter((e) => String(e.source).startsWith("github")).length;
  const countableItems = items.filter((i) => !i.isBotGenerated && !i.isExcluded && !i.isDuplicate).length;
  const integrity: IntegrityCheck[] = [];

  integrity.push(
    unattributedItems === 0
      ? { id: "attribution", label: "Attribution", status: "ok", detail: "All activity is matched to a teammate." }
      : {
          id: "attribution",
          label: "Attribution",
          status: "warn",
          detail: `${unattributedItems} of ${countableItems} items aren't matched to a teammate and count for no one.`,
        }
  );

  const selfPct = totalTaskPoints > 0 ? Math.round((selfReportedPoints / totalTaskPoints) * 100) : 0;
  integrity.push({
    id: "self_reported",
    label: "Verification",
    status: totalTaskPoints === 0 ? "info" : selfPct > 50 ? "warn" : "ok",
    detail:
      totalTaskPoints === 0
        ? "No done tasks yet."
        : `${100 - selfPct}% of task points are linked to GitHub or confirmed by a teammate; ${selfPct}% are self-reported.`,
  });

  integrity.push(
    outsideWindow === 0
      ? { id: "timing", label: "Timing", status: "ok", detail: "All work falls inside the project dates." }
      : {
          id: "timing",
          label: "Timing",
          status: "warn",
          detail: `${outsideWindow} items are dated outside the project dates.`,
        }
  );

  const sorted = [...memberResults].sort((a, b) => b.contributionShare - a.contributionShare);
  const top = sorted[0];
  const heavy =
    top && ((memberResults.length >= 3 && top.contributionShare > 50) || (memberResults.length === 2 && top.contributionShare > 75));
  integrity.push({
    id: "balance",
    label: "Balance",
    status: heavy ? "warn" : "info",
    detail: top
      ? `${top.displayName} has the largest share (${top.contributionShare.toFixed(1)}%).`
      : "No contributors yet.",
  });

  const inactive = memberResults.filter((m) => m.contributionShare === 0);
  integrity.push(
    inactive.length === 0
      ? { id: "inactive", label: "Participation", status: "ok", detail: "Everyone has credited work." }
      : {
          id: "inactive",
          label: "Participation",
          status: "warn",
          detail: `No credited work for ${inactive.map((m) => m.displayName).join(", ")}.`,
        }
  );

  const scoringLogic: ReportScoringLogic = {
    ...output.scoringLogic,
    rules: CREDIT_RULES,
    taskKey: key,
    tasks: snapshotTasks.sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt))),
    integrity,
    counts: {
      githubItems,
      doneTasks: snapshotTasks.length,
      openTasks: tasks.filter((t) => t.status !== "done").length,
      unattributedItems,
      manualItems: evidence.filter((e) => e.source === "manual").length,
    },
    period: { start: workspace.start_date || null, end: workspace.end_date || null },
    generatedBy,
    summary: null,
  };

  const coverage = countableItems > 0 ? Math.round(((countableItems - unattributedItems) / countableItems) * 100) / 100 : 0;
  const limitations = [...output.validationIssues, ...output.coverageWarnings].join("\n") || null;

  // ---------- Insert (retry if two people generate at once) ----------
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: last } = await admin
      .from("reports")
      .select("id, version")
      .eq("workspace_id", workspaceId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: report, error } = await admin
      .from("reports")
      .insert({
        workspace_id: workspaceId,
        version: (last?.version || 0) + 1,
        status: "provisional",
        member_results: memberResults,
        overall_confidence: output.overallConfidence,
        coverage_score: coverage,
        limitations,
        scoring_logic: scoringLogic,
        previous_version_id: last?.id || null,
      })
      .select()
      .single();

    if (!error && report) return report;
    if (error?.code === "23505") continue;
    throw dbError(error || { message: "Report insert returned no row" });
  }
  throw dbError({ message: "Could not allocate a report version" });
}
