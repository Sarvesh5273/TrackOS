import { NextResponse } from "next/server";
import { dbError, handle, requireMember } from "@/lib/api/auth";
import { loadMemberIdentities, toTeamMember } from "@/lib/identity";
import type { PendingInvite } from "@/types";
import { inviteOrigin } from "@/lib/invites/url";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin, user, membership, isLeader } = await requireMember(params.id);
    const members = await loadMemberIdentities(admin, params.id);

    // Only the leader sees pending invite links
    let invites: PendingInvite[] = [];
    if (isLeader) {
      const { data, error } = await admin
        .from("memberships")
        .select("id, role, invitation_token, invitation_expires_at")
        .eq("workspace_id", params.id)
        .eq("invitation_state", "pending")
        .is("user_id", null)
        .order("invitation_expires_at", { ascending: false });
      if (error) throw dbError(error);
      const now = Date.now();
       const origin = inviteOrigin(request.url, process.env.NEXT_PUBLIC_APP_URL, process.env.NODE_ENV === "production");
       invites = (data || [])
        .filter((i: any) => !i.invitation_expires_at || Date.parse(i.invitation_expires_at) > now)
        .map((i: any) => ({
          membershipId: i.id,
          role: i.role,
          expiresAt: i.invitation_expires_at,
           inviteUrl: origin && i.invitation_token ? `${origin}/invite/${i.invitation_token}` : null,
        }));
    }

    return NextResponse.json({
      members: members.map((m) => toTeamMember(m, { includeEmail: true })),
      invites,
      myRole: membership.role,
      currentUserId: user.id,
    });
  });
}
