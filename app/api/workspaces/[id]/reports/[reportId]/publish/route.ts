import { NextResponse } from "next/server";
import { HttpError, audit, dbError, handle, isUuid, loadWorkspace, requireMember } from "@/lib/api/auth";
import { loadMemberIdentities } from "@/lib/identity";
import { createSeal } from "@/lib/reports/seal";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string; reportId: string } }) {
  return handle(async () => {
    const { admin, user } = await requireMember(params.id, { leader: true });
    await loadWorkspace(admin, params.id);
    if (!isUuid(params.reportId)) throw new HttpError(404, "Report not found.");

    const { data: report, error } = await admin
      .from("reports")
      .select("*")
      .eq("id", params.reportId)
      .eq("workspace_id", params.id)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!report) throw new HttpError(404, "Report not found.");
    if (report.status === "published") throw new HttpError(409, "This report is already published.");

    const { data: latest } = await admin
      .from("reports")
      .select("id, version")
      .eq("workspace_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest && latest.id !== report.id) {
      throw new HttpError(409, `A newer version (v${latest.version}) exists. Publish that one instead.`);
    }

    // Issues still open are shown on the public page
    const { data: openIssues, error: issueError } = await admin
      .from("disputes")
      .select("id, type, reason, requested_change, created_by, created_at")
      .eq("workspace_id", params.id)
      .in("state", ["open", "under_discussion"]);
    if (issueError) throw dbError(issueError);

    const names = new Map(
      (await loadMemberIdentities(admin, params.id)).map((m) => [m.userId, m.name] as [string, string])
    );
    if ((openIssues || []).length > 0) {
      await admin
        .from("disputes")
        .update({ state: "unresolved_at_publication", visible_in_published_report: true })
        .in(
          "id",
          (openIssues || []).map((d: any) => d.id)
        );
    }

    const publishedAt = new Date().toISOString();
    const scoringLogic = {
      ...(report.scoring_logic || {}),
      openIssues: (openIssues || []).map((d: any) => ({
        type: d.type,
        reason: d.reason,
        requestedChange: d.requested_change,
        raisedBy: names.get(d.created_by) || "Teammate",
        raisedAt: d.created_at,
      })),
    };

    const { data: published, error: pubError } = await admin
      .from("reports")
      .update({ status: "published", published_at: publishedAt, published_by: user.id, scoring_logic: scoringLogic })
      .eq("id", report.id)
      .select()
      .single();
    if (pubError) throw dbError(pubError);

    // Seal what's actually stored (read back), so the public page can detect edits
    const seal = createSeal(published as any, publishedAt);
    const { data: sealed, error: sealError } = await admin
      .from("reports")
      .update({ scoring_logic: { ...(published.scoring_logic || {}), seal } })
      .eq("id", report.id)
      .select()
      .single();
    if (sealError) throw dbError(sealError);

    await admin.from("workspaces").update({ status: "published" }).eq("id", params.id);

    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: "report.published",
      objectType: "report",
      objectId: report.id,
      newValue: { version: report.version, openIssues: (openIssues || []).length, contentHash: seal.contentHash },
    });

    return NextResponse.json({ report: sealed });
  });
}
