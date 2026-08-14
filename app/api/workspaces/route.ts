import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    weight: z.number(),
  })),
});

export async function POST(request: Request) {
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
    const parsed = createSchema.parse(body);

    // Insert workspace
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .insert({
        name: parsed.name,
        description: parsed.description || null,
        start_date: parsed.startDate,
        end_date: parsed.endDate,
        categories: parsed.categories,
        status: "draft",
      })
      .select()
      .single();

    if (wsError || !workspace) {
      console.error("Workspace insert error:", wsError);
      return NextResponse.json(
        { error: wsError?.message || "Failed to create workspace" },
        { status: 500 }
      );
    }

    // Insert membership as LEADER
    const { error: memError } = await supabase.from("memberships").insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "leader",
    });

    if (memError) {
      console.error("Membership insert error:", memError);
      // Try to clean up the orphaned workspace
      await supabase.from("workspaces").delete().eq("id", workspace.id);
      return NextResponse.json(
        { error: "Failed to create membership: " + memError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (err) {
    console.error("API error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const { data: memberships } = await supabase
      .from("memberships")
      .select("workspace_id")
      .eq("user_id", user.id);

    const workspaceIds = memberships?.map((m) => m.workspace_id) || [];

    if (workspaceIds.length === 0) {
      return NextResponse.json({ workspaces: [] });
    }

    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("*")
      .in("id", workspaceIds)
      .order("created_at", { ascending: false });

    return NextResponse.json({ workspaces: workspaces || [] });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}