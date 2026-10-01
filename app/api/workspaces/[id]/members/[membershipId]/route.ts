import { NextResponse } from "next/server";
import { HttpError, audit, dbError, handle, isUuid, requireMember } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/** Leader removes a member or revokes a pending invite. */
export async function DELETE(_request: Request, { params }: { params: { id: string; membershipId: string } }) {
  return handle(async () => {
    const { admin, user } = await requireMember(params.id, { leader: true });
    if (!isUuid(params.membershipId)) throw new HttpError(404, "Member not found.");

    const { data: target, error } = await admin
      .from("memberships")
      .select("id, user_id, role, invitation_state")
      .eq("id", params.membershipId)
      .eq("workspace_id", params.id)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!target) throw new HttpError(404, "Member not found.");
    if (target.role === "leader") throw new HttpError(400, "The project leader can't be removed.");

    const { error: delError } = await admin
      .from("memberships")
      .delete()
      .eq("id", target.id)
      .eq("workspace_id", params.id);
    if (delError) throw dbError(delError);

    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: target.invitation_state === "pending" ? "invite.revoked" : "member.removed",
      objectType: "membership",
      objectId: target.id,
      previousValue: { user_id: target.user_id, role: target.role },
    });

    return NextResponse.json({ success: true });
  });
}
