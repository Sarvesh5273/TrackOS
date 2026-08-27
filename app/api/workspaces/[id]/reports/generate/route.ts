import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateContributionScores } from "@/lib/scoring/engine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const admin = createAdminClient();
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
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch all evidence items for this workspace
  const { data: rawEvidence } = await admin
    .from("evidence_items")
    .select("*")
    .eq("workspace_id", workspaceId);

  // Deduplicate evidence items
  const seenKeys = new Set<string>();
  const uniqueEvidence: any[] = [];

  for (const e of rawEvidence || []) {
    const key = e.source_id ? `${e.source}:${e.source_id}` : e.id;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueEvidence.push(e);
    }
  }

  // Fetch memberships
  const { data: memberships } = await admin
    .from("memberships")
    .select("*")
    .eq("workspace_id", workspaceId);

  // Lookup user metadata for all members
  const userDetailsMap = new Map<string, { displayName: string; email: string; avatarUrl: string }>();
  for (const m of memberships || []) {
    if (!m.user_id) continue;
    try {
      const { data: userData } = await admin.auth.admin.getUserById(m.user_id);
      const meta = userData?.user?.user_metadata || {};
      const name =
        meta.name ||
        meta.full_name ||
        meta.user_name ||
        userData?.user?.email?.split("@")[0] ||
        "Contributor";
      userDetailsMap.set(m.user_id, {
        displayName: name,
        email: userData?.user?.email || "",
        avatarUrl: meta.avatar_url || "",
      });
    } catch {
      userDetailsMap.set(m.user_id, {
        displayName: "Contributor",
        email: "",
        avatarUrl: "",
      });
    }
  }

  const categories = (workspace.categories || []) as Array<{ id: string; weight: number }>;
  const categoryWeights: Record<string, number> = {};
  categories.forEach((c) => { categoryWeights[c.id] = c.weight; });

  const scoringInput = {
    workspaceId: workspace.id,
    evidenceItems: uniqueEvidence.map((e) => ({
      id: e.id,
      source: e.source,
      summary: e.summary,
      category: e.category,
      actorId: e.actor_id || user.id,
      collaboratorIds: e.collaborator_ids || [],
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
    members: (memberships || []).map((m: any) => ({
      userId: m.user_id,
      declaredRoles: m.declared_contribution_roles || [],
    })),
    policyVersion: workspace.policy_version || 1,
  };

  const scoringOutput = calculateContributionScores(scoringInput);

  // Enrich with user details
  const enrichedResults = scoringOutput.memberResults.map((result) => {
    const u = userDetailsMap.get(result.userId);
    const fallbackName =
      result.userId === user.id
        ? user.user_metadata?.name || user.user_metadata?.user_name || user.email?.split("@")[0] || "Contributor"
        : "Team Member";
    return {
      ...result,
      displayName: u?.displayName || fallbackName,
      email: u?.email || (result.userId === user.id ? user.email : ""),
      avatarUrl: u?.avatarUrl || "",
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
