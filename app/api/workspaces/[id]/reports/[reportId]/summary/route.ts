// AI drafts the project summary for the public report from the report snapshot.
// Nothing is saved here: the leader edits the draft and saves it with PATCH.

import { NextResponse } from "next/server";
import { HttpError, dbError, handle, isUuid, loadWorkspace, requireMember } from "@/lib/api/auth";
import { AIUnavailableError, asData, generate } from "@/lib/ai";
import type { ReportScoringLogic } from "@/lib/reports/types";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string; reportId: string } }) {
  return handle(async () => {
    const { admin } = await requireMember(params.id, { leader: true });
    const workspace = await loadWorkspace(admin, params.id);
    if (!isUuid(params.reportId)) throw new HttpError(404, "Report not found.");

    const { data: report, error } = await admin
      .from("reports")
      .select("*")
      .eq("id", params.reportId)
      .eq("workspace_id", params.id)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!report) throw new HttpError(404, "Report not found.");

    const logic = (report.scoring_logic || {}) as ReportScoringLogic;
    const facts = {
      project: workspace.name,
      description: workspace.description || null,
      dates: { start: logic.period?.start, end: logic.period?.end },
      contributors: ((report.member_results || []) as any[]).map((m) => ({
        name: m.displayName,
        share: `${Number(m.contributionShare || 0).toFixed(1)}%`,
        tasksDone: m.tasksDone ?? null,
        topWork: (m.positiveContributors || []).slice(0, 3).map((c: any) => c.description),
      })),
      doneTasks: (logic.tasks || []).slice(0, 40).map((t) => ({
        task: `${t.ref} ${t.title}`,
        type: t.category,
        by: t.assignees.map((a) => a.name),
        verified: t.verification,
      })),
      counts: logic.counts || null,
      checks: (logic.integrity || []).map((c) => `${c.label}: ${c.detail}`),
    };

    try {
      const summary = await generate({
        system:
          "You write the project summary shown to judges and professors on a team's contribution report. " +
          "Use only the facts given. Never invent features, numbers, or names. Neutral, specific, no hype, no emojis.",
        prompt: [
          "Write one or two short paragraphs (under 150 words total):",
          "1. What the team built, based on the done tasks.",
          "2. How the work was shared, naming each person's main area. Mention anything the checks flag.",
          "Facts:",
          asData(JSON.stringify(facts, null, 1)),
          workspace.project_brief ? "Project brief (for context only):" : "",
          workspace.project_brief ? asData(String(workspace.project_brief).slice(0, 3000)) : "",
        ]
          .filter(Boolean)
          .join("\n"),
        temperature: 0.3,
        maxOutputTokens: 1024,
      });
      return NextResponse.json({ summary: summary.slice(0, 3000) });
    } catch (err) {
      if (err instanceof AIUnavailableError) throw new HttpError(503, err.message, "AI_UNAVAILABLE");
      throw err;
    }
  });
}
