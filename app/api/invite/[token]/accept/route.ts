import { NextResponse } from "next/server";
import { HttpError, audit, dbError, handle, requireUser } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { token: string } }) {
  return handle(async () => {
    const user = await requireUser();
    if (!/^[0-9a-f-]{36}$/i.test(params.token)) throw new HttpError(404, "Invite link is invalid or has expired.");
    const admin = createAdminClient();

    const { data: invite, error } = await admin
      .from("memberships")
      .select("id, workspace_id, role, invitation_expires_at")
      .eq("invitation_token", params.token)
      .eq("invitation_state", "pending")
      .is("user_id", null)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!invite || (invite.invitation_expires_at && Date.parse(invite.invitation_expires_at) < Date.now())) {
      throw new HttpError(404, "Invite link is invalid or has expired.");
    }

    const { data: existing } = await admin
      .from("memberships")
      .select("id")
      .eq("workspace_id", invite.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ success: true, workspaceId: invite.workspace_id, alreadyJoined: true });
    }

    // Conditional update so two people can't claim the same invite
    const now = new Date().toISOString();
    const { data: claimed, error: claimError } = await admin
      .from("memberships")
      .update({
        user_id: user.id,
        invitation_state: "accepted",
        invitation_token: null,
        joined_at: now,
        consent_given_at: now,
      })
      .eq("id", invite.id)
      .eq("invitation_state", "pending")
      .is("user_id", null)
      .select("id");
    if (claimError) throw dbError(claimError);
    if (!claimed || claimed.length === 0) throw new HttpError(409, "This invite was just used by someone else.");

    await audit(admin, {
      actorId: user.id,
      workspaceId: invite.workspace_id,
      action: "invite.accepted",
      objectType: "membership",
      objectId: invite.id,
      newValue: { role: invite.role },
    });

    return NextResponse.json({ success: true, workspaceId: invite.workspace_id, alreadyJoined: false });
  });
}
