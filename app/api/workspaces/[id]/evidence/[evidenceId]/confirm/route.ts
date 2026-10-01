// A teammate co-signs a self-reported (manual) evidence item.

import { NextResponse } from "next/server";
import { HttpError, assertWorkspaceOpen, audit, dbError, handle, isUuid, loadWorkspace, requireMember } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string; evidenceId: string } }) {
  return handle(async () => {
    const { admin, user } = await requireMember(params.id);
    assertWorkspaceOpen(await loadWorkspace(admin, params.id));
    if (!isUuid(params.evidenceId)) throw new HttpError(404, "Item not found.");

    const { data: item, error } = await admin
      .from("evidence_items")
      .select("id, source, source_id, actor_id, metadata, verification_state")
      .eq("id", params.evidenceId)
      .eq("workspace_id", params.id)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!item) throw new HttpError(404, "Item not found.");
    if (item.source !== "manual") throw new HttpError(400, "Only self-reported items need a teammate's confirmation.");
    if (!item.actor_id || item.actor_id === user.id) {
      throw new HttpError(400, "You can't confirm your own work. Ask a teammate.");
    }

    const meta = (item.metadata || {}) as Record<string, any>;
    const confirmations = Array.isArray(meta.confirmations) ? meta.confirmations : [];
    if (confirmations.some((c: any) => c.userId === user.id)) {
      return NextResponse.json({ success: true, message: "You already confirmed this." });
    }
    const nextConfirmations = [...confirmations, { userId: user.id, confirmedAt: new Date().toISOString() }];

    const { error: upError } = await admin
      .from("evidence_items")
      .update({
        verification_state: "collaborator_confirmed",
        quality_factor: 0.9,
        metadata: { ...meta, confirmations: nextConfirmations },
      })
      .eq("id", item.id);
    if (upError) throw dbError(upError);

    await admin
      .from("manual_evidence")
      .update({ review_status: "approved", confirmations: nextConfirmations })
      .eq("id", item.source_id)
      .eq("workspace_id", params.id);

    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: "evidence.confirmed",
      objectType: "evidence",
      objectId: item.id,
    });

    return NextResponse.json({ success: true, message: "Confirmed. Thanks for vouching for your teammate." });
  });
}
