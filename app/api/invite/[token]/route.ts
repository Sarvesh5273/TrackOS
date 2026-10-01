import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Public: what an invite link is for (used before the visitor signs in). */
export async function GET(_request: Request, { params }: { params: { token: string } }) {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(params.token)) {
      return NextResponse.json({ error: "Invite link is invalid or has expired" }, { status: 404 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_invite_by_token", { p_token: params.token });
    if (error || !data) {
      return NextResponse.json({ error: "Invite link is invalid or has expired" }, { status: 404 });
    }

    // Don't expose the leader's full email to whoever holds the link
    const email = typeof data.inviter_email === "string" ? data.inviter_email.split("@")[0] : "";
    return NextResponse.json({
      workspace: { id: data.workspace_id, name: data.workspace_name },
      inviter: { name: data.inviter_name || null, email },
      role: data.role,
      expiresAt: data.expires_at,
    });
  } catch (err) {
    console.error("Invite lookup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
