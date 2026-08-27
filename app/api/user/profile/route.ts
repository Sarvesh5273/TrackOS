import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
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

    const meta = user.user_metadata || {};
    const name = meta.name || meta.full_name || meta.user_name || user.email?.split("@")[0] || "Developer";
    const username = meta.user_name || meta.preferred_username || "";
    const avatarUrl = meta.avatar_url || "";
    const declaredRoles = meta.declared_roles || ["Developer"];

    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        name,
        username,
        avatarUrl,
        declaredRoles,
      },
    });
  } catch (err: any) {
    console.error("Profile GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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

    const body = await request.json();
    const { name, declaredRoles } = body as {
      name?: string;
      declaredRoles?: string[];
    };

    const updatedMetadata = {
      ...user.user_metadata,
      ...(name ? { name } : {}),
      ...(declaredRoles ? { declared_roles: declaredRoles } : {}),
    };

    const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
      data: updatedMetadata,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        name: updatedUser.user.user_metadata?.name || name,
        username: updatedUser.user.user_metadata?.user_name || "",
        avatarUrl: updatedUser.user.user_metadata?.avatar_url || "",
        declaredRoles: updatedUser.user.user_metadata?.declared_roles || declaredRoles,
      },
    });
  } catch (err: any) {
    console.error("Profile PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
