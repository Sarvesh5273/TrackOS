// Optional AI paragraph for the weekly update, written only from computed facts.

import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handle, loadWorkspace, readJson, requireMember } from "@/lib/api/auth";
import { AIUnavailableError, asData, generate } from "@/lib/ai";
import { buildDigest } from "@/lib/digest";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ days: z.number().int().min(0).max(30).default(7) });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin } = await requireMember(params.id);
    const workspace = await loadWorkspace(admin, params.id);
    const { days } = await readJson(request, bodySchema);
    const digest = await buildDigest(admin, workspace, days === 0 ? null : days);

    const facts = {
      project: digest.project,
      period: digest.period,
      totals: digest.totals,
      completed: digest.completed.map((t) => ({ task: `${t.ref} ${t.title}`, by: t.assignees })),
      inProgress: digest.inProgress.map((t) => ({ task: `${t.ref} ${t.title}`, by: t.assignees })),
      overdue: digest.overdue.map((t) => ({ task: `${t.ref} ${t.title}`, by: t.assignees, due: t.at })),
      dueSoon: digest.dueSoon.map((t) => ({ task: `${t.ref} ${t.title}`, by: t.assignees, due: t.at })),
      mergedPullRequests: digest.merged.map((m) => ({ title: m.title, by: m.author })),
      people: digest.people.map((p) => ({
        name: p.name,
        tasksDone: p.tasksDone,
        points: p.points,
        commits: p.commits,
        prsMerged: p.prsMerged,
        reviews: p.reviews,
        activeInPeriod: !p.inactive,
      })),
    };

    try {
      const summary = await generate({
        system:
          "You write short status updates for student project teams. Use only the facts given. " +
          "Never invent work, numbers, or names. Plain, friendly language. No emojis, no hype, no headings.",
        prompt: [
          "Write a status update of 3 to 5 sentences for the team and their professor.",
          "Cover: what got done, what's in progress or due next, and any risks (overdue tasks, teammates with no activity).",
          "Facts:",
          asData(JSON.stringify(facts, null, 1)),
        ].join("\n"),
        temperature: 0.3,
        maxOutputTokens: 1024,
      });
      return NextResponse.json({ summary: summary.slice(0, 2000) });
    } catch (err) {
      if (err instanceof AIUnavailableError) throw new HttpError(503, err.message, "AI_UNAVAILABLE");
      throw err;
    }
  });
}
