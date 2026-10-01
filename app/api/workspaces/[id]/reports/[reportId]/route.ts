import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, audit, dbError, handle, isUuid, readJson, requireMember } from "@/lib/api/auth";
import { verifySeal } from "@/lib/reports/seal";
import type { AdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Params = { params: { id: string; reportId: string } };

async function loadReport(admin: AdminClient, workspaceId: string, reportId: string) {
  if (!isUuid(reportId)) throw new HttpError(404, "Report not found.");
  const { data, error } = await admin
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw new HttpError(404, "Report not found.");
  return data as Record<string, any>;
}

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { admin } = await requireMember(params.id);
    const report = await loadReport(admin, params.id, params.reportId);
    const seal = report.status === "published" ? verifySeal(report as any).status : null;
    return NextResponse.json({ report, seal });
  });
}

const patchSchema = z.object({
  summary: z.string().max(3000, "Keep the summary under 3000 characters").nullable(),
  aiAssisted: z.boolean().default(false),
});

/** Leader edits the project summary shown on the public page (before publishing). */
export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const { admin, user } = await requireMember(params.id, { leader: true });
    const report = await loadReport(admin, params.id, params.reportId);
    if (report.status !== "provisional") throw new HttpError(409, "Published reports can't be edited.");
    const input = await readJson(request, patchSchema);

    const text = input.summary?.trim() || "";
    const scoringLogic = {
      ...(report.scoring_logic || {}),
      summary: text
        ? { text, aiAssisted: input.aiAssisted, updatedAt: new Date().toISOString(), updatedBy: user.id }
        : null,
    };

    const { data, error } = await admin
      .from("reports")
      .update({ scoring_logic: scoringLogic })
      .eq("id", report.id)
      .select()
      .single();
    if (error) throw dbError(error);

    return NextResponse.json({ report: data });
  });
}

/** Only provisional reports can be deleted; published ones are permanent. */
export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    const { admin, user } = await requireMember(params.id, { leader: true });
    const report = await loadReport(admin, params.id, params.reportId);
    if (report.status === "published") {
      throw new HttpError(409, "Published reports can't be deleted. Generate and publish a new version instead.");
    }

    await admin
      .from("reports")
      .update({ previous_version_id: report.previous_version_id || null })
      .eq("workspace_id", params.id)
      .eq("previous_version_id", report.id);

    const { error } = await admin.from("reports").delete().eq("id", report.id).eq("workspace_id", params.id);
    if (error) throw dbError(error);

    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: "report.deleted",
      objectType: "report",
      objectId: report.id,
      previousValue: { version: report.version },
    });

    return NextResponse.json({ success: true });
  });
}
