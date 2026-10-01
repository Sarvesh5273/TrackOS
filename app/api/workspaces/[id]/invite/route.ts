import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { HttpError, audit, dbError, handle, readJson, requireMember } from "@/lib/api/auth";
import { inviteOrigin } from "@/lib/invites/url";

export const dynamic = "force-dynamic";

const INVITE_TTL_DAYS = 7;

const bodySchema = z.object({
  role: z.enum(["member", "reviewer"]).default("member"),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin, user } = await requireMember(params.id, { leader: true });
    const { role } = await readJson(request, bodySchema);
    const base = inviteOrigin(request.url, process.env.NEXT_PUBLIC_APP_URL, process.env.NODE_ENV === "production");
    if (!base) throw new HttpError(503, "Set NEXT_PUBLIC_APP_URL to your public HTTPS site URL before creating invites.");

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await admin
      .from("memberships")
      .insert({
        workspace_id: params.id,
        user_id: null,
        role,
        invitation_state: "pending",
        invitation_token: token,
        invitation_expires_at: expiresAt,
        joined_at: null,
      })
      .select("id")
      .single();
    if (error) throw dbError(error);

    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: "invite.created",
      objectType: "membership",
      objectId: data.id,
      newValue: { role, expiresAt },
    });

    return NextResponse.json({ inviteUrl: `${base}/invite/${token}`, expiresAt, role }, { status: 201 });
  });
}
