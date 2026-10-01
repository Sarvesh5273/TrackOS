import { NextResponse } from "next/server";
import { HttpError, audit, dbError, handle, isUuid, requireMember } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/** Disconnects GitHub (deletes the saved token). Synced activity stays. */
export async function DELETE(_request: Request, { params }: { params: { id: string; integrationId: string } }) {
  return handle(async () => {
    const { admin, user } = await requireMember(params.id, { leader: true });
    if (!isUuid(params.integrationId)) throw new HttpError(404, "Integration not found.");

    const { data, error } = await admin
      .from("integrations")
      .delete()
      .eq("id", params.integrationId)
      .eq("workspace_id", params.id)
      .select("id, selected_resources");
    if (error) throw dbError(error);
    if (!data || data.length === 0) throw new HttpError(404, "Integration not found.");

    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: "integration.disconnected",
      objectType: "integration",
      objectId: params.integrationId,
      previousValue: { repo: (data[0] as any).selected_resources?.fullName || null },
    });

    return NextResponse.json({ success: true });
  });
}
