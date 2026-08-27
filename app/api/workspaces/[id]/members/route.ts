import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
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

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all memberships for this workspace
    const { data: rawMembers, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("workspace_id", params.id)
      .order("joined_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Resolve user profiles for every membership
    const admin = createAdminClient();
    const enrichedMembers = await Promise.all(
      (rawMembers || []).map(async (m: any) => {
        if (!m.user_id) {
          return {
            ...m,
            user: null,
          };
        }

        // If it's the current user, we already have their full profile
        if (m.user_id === user.id) {
          const meta = user.user_metadata || {};
          return {
            ...m,
            user: {
              id: user.id,
              email: user.email,
              raw_user_meta_data: {
                name: meta.name || meta.full_name || meta.user_name || user.email?.split("@")[0] || "Leader",
                user_name: meta.user_name || meta.preferred_username || "",
                avatar_url: meta.avatar_url || "",
              },
            },
          };
        }

        // For other members, fetch via admin client
        try {
          const { data: targetUser } = await admin.auth.admin.getUserById(m.user_id);
          if (targetUser?.user) {
            const meta = targetUser.user.user_metadata || {};
            return {
              ...m,
              user: {
                id: targetUser.user.id,
                email: targetUser.user.email,
                raw_user_meta_data: {
                  name: meta.name || meta.full_name || meta.user_name || targetUser.user.email?.split("@")[0] || "Member",
                  user_name: meta.user_name || meta.preferred_username || "",
                  avatar_url: meta.avatar_url || "",
                },
              },
            };
          }
        } catch (e) {
          console.error("Could not fetch user metadata for:", m.user_id);
        }

        return {
          ...m,
          user: {
            id: m.user_id,
            email: "team@member",
            raw_user_meta_data: {
              name: "Team Member",
              avatar_url: "",
            },
          },
        };
      })
    );

    return NextResponse.json({
      members: enrichedMembers,
      myRole: membership.role || "member",
    });
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}