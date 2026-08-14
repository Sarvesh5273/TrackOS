import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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
    const { provider, config } = body as { provider: string; config: { repo?: string } };

    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 });
    }

    if (provider === "github" && !config?.repo) {
      return NextResponse.json({ error: "Repository is required for GitHub" }, { status: 400 });
    }

    const repoRegex = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/;
    if (provider === "github" && !repoRegex.test(config.repo)) {
      return NextResponse.json(
        { error: "Invalid repository format. Use owner/repo" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("workspace_id", params.id)
      .eq("provider", provider)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Integration already exists. Use disconnect first to reconnect." },
        { status: 400 }
      );
    }

    const { data: integration, error: insertError } = await supabase
      .from("integrations")
      .insert({
        workspace_id: params.id,
        provider,
        selected_resources: config ? { repo: config.repo } : null,
        status: "pending",
        connected_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ integration }, { status: 201 });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}