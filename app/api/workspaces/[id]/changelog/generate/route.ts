import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

    const admin = createAdminClient();

    // 1. Fetch workspace
    const { data: workspace, error: wsError } = await admin
      .from("workspaces")
      .select("id, name, description, start_date, end_date")
      .eq("id", params.id)
      .maybeSingle();

    if (wsError || !workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // 2. Fetch all evidence items
    const { data: evidence, error: evError } = await admin
      .from("evidence_items")
      .select("*")
      .eq("workspace_id", params.id)
      .order("timestamp", { ascending: false });

    if (evError) {
      return NextResponse.json({ error: evError.message }, { status: 500 });
    }

    const items = evidence || [];

    // Categorize items
    const features: string[] = [];
    const fixes: string[] = [];
    const refactors: string[] = [];
    const design: string[] = [];
    const docs: string[] = [];
    const contributorMap: Record<string, string[]> = {};

    for (const item of items) {
      const summary = item.summary || item.description || "Work item";
      const author = item.actor_username || "Team";
      if (!contributorMap[author]) contributorMap[author] = [];
      contributorMap[author].push(summary);

      const lower = summary.toLowerCase();
      const meta = item.metadata || {};

      if (meta.conventionalType === "feat" || lower.startsWith("feat") || item.source === "github_pr") {
        features.push(`- **${summary}** (@${author})`);
      } else if (meta.conventionalType === "fix" || lower.startsWith("fix") || lower.includes("bug")) {
        fixes.push(`- ${summary} (@${author})`);
      } else if (item.category === "design" || lower.includes("figma") || lower.includes("ui") || lower.includes("design")) {
        design.push(`- 🎨 **${summary}** (@${author})`);
      } else if (meta.conventionalType === "docs" || item.category === "documentation_research" || lower.startsWith("docs")) {
        docs.push(`- 📄 ${summary} (@${author})`);
      } else {
        refactors.push(`- 🛠️ ${summary} (@${author})`);
      }
    }

    const todayStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // Build Markdown Changelog
    let changelog = `# 🚀 Release & Sprint Digest — ${workspace.name}\n`;
    changelog += `*Generated on ${todayStr} · ${items.length} verified deliverables*\n\n`;

    if (workspace.description) {
      changelog += `> ${workspace.description}\n\n`;
    }

    if (features.length > 0) {
      changelog += `## 🌟 New Features & Deliverables\n${features.slice(0, 10).join("\n")}\n\n`;
    }

    if (design.length > 0) {
      changelog += `## 🎨 UI/UX & Design Systems\n${design.slice(0, 8).join("\n")}\n\n`;
    }

    if (fixes.length > 0) {
      changelog += `## 🐛 Bug Fixes & Stability\n${fixes.slice(0, 8).join("\n")}\n\n`;
    }

    if (refactors.length > 0) {
      changelog += `## 🛠️ Architecture & Maintenance\n${refactors.slice(0, 8).join("\n")}\n\n`;
    }

    if (docs.length > 0) {
      changelog += `## 📚 Documentation & Research\n${docs.slice(0, 5).join("\n")}\n\n`;
    }

    // Contributor spotlight
    changelog += `## 👥 Contributor Spotlights\n`;
    for (const [author, works] of Object.entries(contributorMap)) {
      changelog += `- **@${author}**: Shipped ${works.length} verified item${works.length !== 1 ? "s" : ""}\n`;
    }

    changelog += `\n---\n*Verified by TeamTrack AI — Cryptographic Proof of Work & Fair Attribution*`;

    return NextResponse.json({
      success: true,
      markdown: changelog,
      counts: {
        features: features.length,
        fixes: fixes.length,
        design: design.length,
        docs: docs.length,
        total: items.length,
      },
    });
  } catch (err: any) {
    console.error("Changelog generation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
