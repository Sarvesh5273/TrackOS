import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
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

    // Requires the get_invite_by_token() security definer function (see supabase/invite_policies.sql)
    // so that anonymous users can read the workspace name + leader without tripping RLS.
    const { data, error } = await supabase.rpc("get_invite_by_token", {
      p_token: params.token,
    });

    if (error || !data) {
      return NextResponse.json(
        { error: "Invite link is invalid or has expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      workspace: { id: data.workspace_id, name: data.workspace_name },
      inviter: { name: data.inviter_name, email: data.inviter_email },
      role: data.role,
      expiresAt: data.expires_at,
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}