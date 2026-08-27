import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    const admin = createAdminClient();

    // 1. Fetch report
    const { data: report, error: reportError } = await admin
      .from("reports")
      .select("*")
      .eq("id", params.reportId)
      .maybeSingle();

    if (reportError || !report) {
      return NextResponse.json(
        { error: "Report not found or has expired" },
        { status: 404 }
      );
    }

    // 2. Fetch workspace
    const { data: workspace, error: wsError } = await admin
      .from("workspaces")
      .select("id, name, description, status, project_type, start_date, end_date, categories")
      .eq("id", report.workspace_id)
      .maybeSingle();

    if (wsError || !workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // 3. Fetch workspace memberships & user profiles
    const { data: memberships } = await admin
      .from("memberships")
      .select("*")
      .eq("workspace_id", workspace.id);

    const enrichedMembers = await Promise.all(
      (memberships || []).map(async (m: any) => {
        if (!m.user_id) return { ...m, user: null };
        try {
          const { data: userData } = await admin.auth.admin.getUserById(m.user_id);
          const meta = userData?.user?.user_metadata || {};
          return {
            ...m,
            user: {
              id: m.user_id,
              email: userData?.user?.email || "member@team",
              name: meta.name || meta.full_name || meta.user_name || userData?.user?.email?.split("@")[0] || "Contributor",
              username: meta.user_name || meta.preferred_username || "",
              avatarUrl: meta.avatar_url || "",
            },
          };
        } catch {
          return {
            ...m,
            user: {
              id: m.user_id,
              email: "member@team",
              name: "Contributor",
              username: "",
              avatarUrl: "",
            },
          };
        }
      })
    );

    // 4. Generate deterministic verification signature
    const payloadToSign = `${report.id}:${workspace.id}:${report.published_at || report.created_at}:${report.version}:${JSON.stringify(report.member_results)}`;
    const verificationHash = createHash("sha256").update(payloadToSign).digest("hex");

    return NextResponse.json({
      report,
      workspace,
      members: enrichedMembers,
      verification: {
        hash: verificationHash,
        verifiedAt: report.published_at || report.created_at,
        isPublished: report.status === "published",
        algorithmVersion: report.scoring_logic?.algorithm || "weighted_normalized_v1",
      },
    });
  } catch (err: any) {
    console.error("Public verification API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
