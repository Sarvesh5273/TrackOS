// Public page data for a PUBLISHED report. No emails, no invite data.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySeal } from "@/lib/reports/seal";
import { isUuid } from "@/lib/api/auth";
import { publicHighlights, publicMemberResults, publicScoringLogic, type PublicEvidence } from "@/lib/reports/public";
import type { ReportScoringLogic } from "@/lib/reports/types";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { reportId: string } }) {
  try {
    if (!isUuid(params.reportId)) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    const admin = createAdminClient();

    const { data: report, error } = await admin
      .from("reports")
      .select("*")
      .eq("id", params.reportId)
      .maybeSingle();
    if (error) throw error;
    if (!report || report.status !== "published") {
      return NextResponse.json({ error: "This report isn't published." }, { status: 404 });
    }

    const [{ data: workspace }, { data: newer }, { data: integration, error: integrationError }] = await Promise.all([
      admin
        .from("workspaces")
        .select("id, name, description, start_date, end_date, categories")
        .eq("id", report.workspace_id)
        .maybeSingle(),
      admin
        .from("reports")
        .select("id, version")
        .eq("workspace_id", report.workspace_id)
        .eq("status", "published")
        .gt("version", report.version)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("integrations")
        .select("selected_resources")
        .eq("workspace_id", report.workspace_id)
        .eq("provider", "github")
        .eq("status", "active")
        .order("connected_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (integrationError) throw integrationError;

    // Highlights: the top GitHub items behind each person's share, with links
    const memberResults = (report.member_results || []) as any[];
    const highlightIds = Array.from(
      new Set(
        memberResults.flatMap((m) =>
          (m.positiveContributors || [])
            .map((c: any) => String(c.evidenceId))
            .filter((id: string) => isUuid(id))
        )
      )
    ).slice(0, 60);

    let highlights: ReturnType<typeof publicHighlights> = [];
    if (highlightIds.length > 0) {
      const { data, error: evidenceError } = await admin
        .from("evidence_items")
        .select("id, source, source_url, summary, timestamp, is_sensitive, is_excluded, is_duplicate, is_bot_generated")
        .eq("workspace_id", report.workspace_id)
        .in("id", highlightIds);
      if (evidenceError) throw evidenceError;
      highlights = publicHighlights(data as PublicEvidence[] || [], integration?.selected_resources?.isPrivate === false);
    }

    const logic = (report.scoring_logic || {}) as ReportScoringLogic;
    const sealCheck = verifySeal(report as any);

    return NextResponse.json({
      report: {
        id: report.id,
        version: report.version,
        published_at: report.published_at,
        overall_confidence: report.overall_confidence,
        coverage_score: report.coverage_score,
        limitations: report.limitations,
        member_results: publicMemberResults(memberResults, logic, highlights),
        scoring_logic: publicScoringLogic(logic),
      },
      workspace,
      highlights,
      seal: {
        status: sealCheck.status,
        sealedAt: sealCheck.seal?.sealedAt || null,
        contentHash: sealCheck.seal?.contentHash || null,
      },
      supersededBy: newer ? { id: newer.id, version: newer.version } : null,
    });
  } catch (err) {
    console.error("Public report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
