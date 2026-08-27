import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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
      .select("*")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", params.id)
      .single();

    if (wsError || !workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const { data: evidence } = await supabase
      .from("evidence_items")
      .select("*")
      .eq("workspace_id", params.id)
      .order("timestamp", { ascending: false });

    return NextResponse.json({ workspace, evidence: evidence || [] });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
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
    const { name, description, status, categories } = body as {
      name?: string;
      description?: string;
      status?: string;
      categories?: any[];
    };

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (categories !== undefined) updateData.categories = categories;

    const { data: workspace, error: updateError } = await supabase
      .from("workspaces")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ workspace });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this workspace" },
        { status: 403 }
      );
    }

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    // 1. Delete all child tables explicitly to guarantee complete cleanup in Supabase
    await Promise.allSettled([
      admin.from("evidence_items").delete().eq("workspace_id", params.id),
      admin.from("manual_evidence").delete().eq("workspace_id", params.id),
      admin.from("integrations").delete().eq("workspace_id", params.id),
      admin.from("reports").delete().eq("workspace_id", params.id),
      admin.from("disputes").delete().eq("workspace_id", params.id),
      admin.from("notifications").delete().eq("workspace_id", params.id),
      admin.from("audit_events").delete().eq("workspace_id", params.id),
      admin.from("memberships").delete().eq("workspace_id", params.id),
    ]);

    // 2. Delete the workspace record itself
    const { error: wsDeleteError } = await admin
      .from("workspaces")
      .delete()
      .eq("id", params.id);

    if (wsDeleteError) {
      console.error("Failed to delete workspace from Supabase:", wsDeleteError);
      return NextResponse.json({ error: wsDeleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Workspace and all related records deleted from Supabase",
    });
  } catch (err: any) {
    console.error("API error during workspace deletion:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}