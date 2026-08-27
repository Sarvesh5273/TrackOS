import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GitHubSyncService } from "@/lib/integrations/github";

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

    const { data: integration, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("workspace_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ integration: integration || null });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    if (!membership) {
      return NextResponse.json({ error: "Forbidden: You must be a member of this workspace to connect integrations" }, { status: 403 });
    }

    const body = await request.json();
    const { provider, config } = body as {
      provider: string;
      config?: { repo?: string; token?: string };
    };

    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 });
    }

    if (provider === "github") {
      let rawRepo = (config?.repo || "").trim();
      if (!rawRepo) {
        return NextResponse.json({ error: "Repository is required for GitHub" }, { status: 400 });
      }

      // Normalize URL if full URL is pasted
      rawRepo = rawRepo.replace(/^https?:\/\/github\.com\//i, "");
      rawRepo = rawRepo.replace(/\.git$/i, "");
      rawRepo = rawRepo.replace(/^\/+|\/+$/g, "");

      const repoRegex = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/;
      if (!repoRegex.test(rawRepo)) {
        return NextResponse.json(
          { error: "Invalid repository format. Use 'owner/repo' (e.g. facebook/react)" },
          { status: 400 }
        );
      }

      const [owner, repoName] = rawRepo.split("/");
      const customToken = config?.token?.trim();

      // Resolve token for validation: custom token -> session token -> env token -> unauthenticated
      const { data: { session } } = await supabase.auth.getSession();
      const token = customToken || session?.provider_token || process.env.GITHUB_TOKEN;

      // Validate repository existence on GitHub
      const syncService = new GitHubSyncService(token);
      let repoDetails;
      try {
        repoDetails = await syncService.validateRepository(owner, repoName);
      } catch (err: any) {
        console.error("Repository validation failed:", err?.message || err);
        const status = err?.status;
        if (status === 404) {
          return NextResponse.json(
            { error: `Repository '${owner}/${repoName}' not found or is private. If it's private, please provide a GitHub Personal Access Token.` },
            { status: 400 }
          );
        } else if (status === 401 || status === 403) {
          return NextResponse.json(
            { error: `GitHub API error (${status}): ${err.message}. Please check your token.` },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: `Could not connect to GitHub repository: ${err.message || "Unknown error"}` },
          { status: 400 }
        );
      }

      // Check existing integration
      const { data: existing } = await supabase
        .from("integrations")
        .select("id")
        .eq("workspace_id", params.id)
        .eq("provider", provider)
        .maybeSingle();

      const selectedResources = {
        repo: `${owner}/${repoName}`,
        owner,
        name: repoName,
        fullName: repoDetails.fullName || `${owner}/${repoName}`,
        isPrivate: repoDetails.isPrivate,
        defaultBranch: repoDetails.defaultBranch,
      };

      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from("integrations")
          .update({
            selected_resources: selectedResources,
            status: "active",
            credential_ref: customToken || null,
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
        return NextResponse.json({ integration: updated }, { status: 200 });
      }

      const { data: integration, error: insertError } = await supabase
        .from("integrations")
        .insert({
          workspace_id: params.id,
          provider,
          selected_resources: selectedResources,
          status: "active",
          connected_by: user.id,
          credential_ref: customToken || null,
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ integration }, { status: 201 });
    }

    return NextResponse.json({ error: `Provider '${provider}' not supported` }, { status: 400 });
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}