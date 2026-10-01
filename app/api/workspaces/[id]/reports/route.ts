import { NextResponse } from "next/server";
import { assertWorkspaceOpen, audit, dbError, handle, loadWorkspace, requireMember } from "@/lib/api/auth";
import { generateReport } from "@/lib/reports/build";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin } = await requireMember(params.id);
    const { data, error } = await admin
      .from("reports")
      .select("*")
      .eq("workspace_id", params.id)
      .order("version", { ascending: false });
    if (error) throw dbError(error);
    return NextResponse.json({ reports: data || [] });
  });
}

/** Generates a new provisional report version. */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin, user } = await requireMember(params.id, { edit: true });
    const workspace = await loadWorkspace(admin, params.id);
    assertWorkspaceOpen(workspace);

    const report = await generateReport(admin, workspace, user.id);

    if (["draft", "active", "frozen"].includes(workspace.status)) {
      await admin.from("workspaces").update({ status: "under_review" }).eq("id", params.id);
    }

    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: "report.generated",
      objectType: "report",
      objectId: report.id,
      newValue: { version: report.version, confidence: report.overall_confidence },
    });

    return NextResponse.json({ report }, { status: 201 });
  });
}
