import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateContributionScores } from "@/lib/scoring/engine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = params.id;

  // Verify leader
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "leader") {
    return NextResponse.json({ error: "Forbidden: Leader only" }, { status: 403 });
  }

  // Get workspace with evidence and members
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*, evidence_items(*), memberships(*, user:auth.users(id, email, raw_user_meta_data))")
    .eq("id", workspaceId)
    .single();

  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Must be frozen or active
  if (workspace.status !== "frozen" && workspace.status !== "active") {
    return NextResponse.json(
      { error: "Workspace must be frozen before generating report" },
      { status: 400 }
    );
  }

  // Get manual evidence
  const { data: manualEvidence } = await supabase
    .from("manual_evidence")
    .select("*")
    .eq("workspace_id", workspaceId);

  // Combine evidence
  const allEvidence = [
    ...(workspace.evidence_items || []),
    ...(manualEvidence || []).map((m: any) => ({
      id: m.id,
      source: "manual" as const,
      category: m.category,
      actor_id: m.submitted_by,
      collaborator_ids: m.collaborator_ids || [],
      timestamp: m.start_date,
      base_weight: 1.5,
      impact_factor: m.effort_band === "EXTENSIVE" ? 3.0 : m.effort_band === "LARGE" ? 2.0 : m.effort_band === "MEDIUM" ? 1.5 : 1.0,
      quality_factor: m.review_status === "approved" ? 0.9 : 0.7,
      duplication_factor: 1.0,
      is_duplicate: false,
      is_bot_generated: false,
      is_excluded: false,
      verification_state: m.review_status === "approved" ? "collaborator_confirmed" : "manual_submitted",
      work_type: m.work_type,
      metadata: { manual: true, title: m.title },
    })),
  ];

  const categories = (workspace.categories || []) as Array<{ id: string; weight: number }>;
  const categoryWeights: Record<string, number> = {};
  categories.forEach((c) => { categoryWeights[c.id] = c.weight; });

  const scoringInput = {
    workspaceId: workspace.id,
    evidenceItems: allEvidence.map((e) => ({
      id: e.id,
      source: e.source,
      category: e.category,
      actorId: e.actor_id,
      collaborator_ids: e.collaborator_ids || [],
      timestamp: new Date(e.timestamp),
      baseWeight: e.base_weight || 1.0,
      impactFactor: e.impact_factor || 1.0,
      qualityFactor: e.quality_factor || 1.0,
      duplicationFactor: e.duplication_factor || 1.0,
      isDuplicate: e.is_duplicate,
      isBotGenerated: e.is_bot_generated,
      isExcluded: e.is_excluded,
      verificationState: e.verification_state,
      workType: e.work_type || "created",
      metadata: (e.metadata || {}) as Record<string, unknown>,
    })),
    categoryWeights,
    members: (workspace.memberships || []).map((m: any) => ({
      userId: m.user_id,
      declaredRoles: m.declared_contribution_roles || [],
    })),
    policyVersion: workspace.policy_version || 1,
  };

  const scoringOutput = calculateContributionScores(scoringInput);

  // Enrich with user details
  const enrichedResults = scoringOutput.memberResults.map((result) => {
    const member = (workspace.memberships || []).find((m: any) => m.user_id === result.userId);
    return {
      ...result,
      displayName: member?.user?.raw_user_meta_data?.name || member?.user?.email || "Unknown",
      email: member?.user?.email || "",
    };
  });

  // Get next version
  const { data: lastReport } = await supabase
    .from("reports")
    .select("version")
    .eq("workspace_id", workspaceId)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (lastReport?.version || 0) + 1;

  // Create report
  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      workspace_id: workspaceId,
      version: nextVersion,
      status: "provisional",
      member_results: enrichedResults,
      overall_confidence: scoringOutput.overallConfidence,
      coverage_score: scoringOutput.overallConfidence === "HIGH" ? 0.85 : scoringOutput.overallConfidence === "MEDIUM" ? 0.6 : 0.3,
      limitations: scoringOutput.coverageWarnings.join("\n"),
      scoring_logic: scoringOutput.scoringLogic,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update workspace status
  await supabase
    .from("workspaces")
    .update({ status: "under_review" })
    .eq("id", workspaceId);

  // Audit
  await supabase.from("audit_events").insert({
    actor_id: user.id,
    workspace_id: workspaceId,
    action: "report.generated",
    object_type: "report",
    object_id: report.id,
    new_value: { version: report.version, confidence: report.overall_confidence },
  });

  return NextResponse.json(report, { status: 201 });
}
