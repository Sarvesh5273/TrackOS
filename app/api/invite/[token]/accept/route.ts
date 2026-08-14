import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
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

    const { data: invite } = await supabase
      .from("memberships")
      .select("id, workspace_id, role")
      .eq("invitation_token", params.token)
      .eq("invitation_state", "pending")
      .is("user_id", null)
      .gt("invitation_expires_at", new Date().toISOString())
      .maybeSingle();

    if (!invite) {
      return NextResponse.json(
        { error: "Invite link is invalid or has expired" },
        { status: 404 }
      );
    }

    // Already a member? Make accepting idempotent.
    const { data: existing } = await supabase
      .from("memberships")
      .select("id")
      .eq("workspace_id", invite.workspace_id)
      .eq("user_id", user.id)
      .eq("invitation_state", "accepted")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        workspaceId: invite.workspace_id,
        alreadyJoined: true,
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("memberships")
      .update({
        user_id: user.id,
        invitation_state: "accepted",
        joined_at: new Date().toISOString(),
      })
      .eq("id", invite.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      workspaceId: invite.workspace_id,
      alreadyJoined: false,
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}