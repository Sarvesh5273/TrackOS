import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

const INVITE_TTL_HOURS = 24;

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || membership.role !== "leader") {
      return NextResponse.json({ error: "Forbidden: Leader only" }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body as { role?: string };

    const validRoles = ["member", "reviewer"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: "Role must be member or reviewer" }, { status: 400 });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

    const { data: invite, error: insertError } = await supabase
      .from("memberships")
      .insert({
        workspace_id: params.id,
        role,
        user_id: null,
        invitation_state: "pending",
        invitation_token: token,
        invitation_expires_at: expiresAt.toISOString(),
        joined_at: null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const origin = new URL(request.url).origin;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
    const inviteUrl = `${appUrl}/invite/${token}`;

    return NextResponse.json(
      { inviteUrl, expiresAt: expiresAt.toISOString() },
      { status: 201 }
    );
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}