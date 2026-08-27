import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { calculateContributionScores } from "@/lib/scoring/engine";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .eq("workspace_id", params.id)
      .order("version", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: workspace } = await admin
      .from("workspaces")
      .select("*")
      .eq("id", params.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Fetch all evidence items
    const { data: rawEvidence } = await admin
      .from("evidence_items")
      .select("*")
      .eq("workspace_id", params.id);

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

    // Fetch memberships and enrich user metadata
    const { data: memberships } = await admin
      .from("memberships")
      .select("*")
      .eq("workspace_id", params.id);

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
    categories.forEach((c) => {
      categoryWeights[c.id] = c.weight;
    });

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

    const { data: lastReport } = await admin
      .from("reports")
      .select("version")
      .eq("workspace_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (lastReport?.version || 0) + 1;

    const { data: report, error } = await admin
      .from("reports")
      .insert({
        workspace_id: params.id,
        version: nextVersion,
        status: "provisional",
        member_results: enrichedResults,
        overall_confidence: scoringOutput.overallConfidence,
        coverage_score:
          scoringOutput.overallConfidence === "HIGH"
            ? 0.85
            : scoringOutput.overallConfidence === "MEDIUM"
            ? 0.6
            : 0.3,
        limitations: scoringOutput.coverageWarnings.join("\n"),
        scoring_logic: scoringOutput.scoringLogic,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin
      .from("workspaces")
      .update({ status: "under_review" })
      .eq("id", params.id);

    await admin.from("audit_events").insert({
      actor_id: user.id,
      workspace_id: params.id,
      action: "report.generated",
      object_type: "report",
      object_id: report.id,
      new_value: { version: report.version, confidence: report.overall_confidence },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}