// AI drafts a starter backlog from the project brief. Nothing is saved:
// the team picks which suggestions to add.

import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handle, loadWorkspace, readJson, requireMember } from "@/lib/api/auth";
import { AIUnavailableError, asData, generateJson } from "@/lib/ai";
import { loadTasks } from "@/lib/reports/build";
import { CATEGORY_IDS } from "@/lib/tasks";
import type { ContributionCategory, TaskSize } from "@/types";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  brief: z.string().max(8000).optional(),
});

const SCHEMA = {
  type: "OBJECT",
  properties: {
    tasks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          category: { type: "STRING", enum: CATEGORY_IDS },
          size: { type: "STRING", enum: ["S", "M", "L"] },
        },
        required: ["title", "category", "size"],
      },
    },
  },
  required: ["tasks"],
};

interface Suggestion {
  title: string;
  description: string;
  category: ContributionCategory;
  size: TaskSize;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin } = await requireMember(params.id, { edit: true });
    const workspace = await loadWorkspace(admin, params.id);
    const body = await readJson(request, bodySchema);

    const brief = (body.brief ?? workspace.project_brief ?? "").trim();
    if (brief.length < 20) {
      throw new HttpError(400, "Add a project brief (a few sentences about what you're building) first.");
    }

    const { tasks: existing } = await loadTasks(admin, params.id);
    const { count: teamSize } = await admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", params.id)
      .eq("invitation_state", "accepted");

    const prompt = [
      `Project: ${workspace.name}`,
      workspace.description ? `Short description: ${workspace.description}` : "",
      `Dates: ${String(workspace.start_date).slice(0, 10)} to ${String(workspace.end_date).slice(0, 10)}`,
      `Team size: ${teamSize || 1}`,
      "Project brief:",
      asData(brief),
      existing.length > 0 ? "Tasks already on the board (don't repeat these):" : "",
      existing.length > 0 ? asData(existing.map((t) => `- ${t.title}`).join("\n")) : "",
      "",
      "Draft 8 to 15 tasks for the board. Each task should be one concrete, checkable piece of work that one or two students can finish in 1 to 3 days.",
      "Cover everything the project needs: building features, design, research or docs, testing, coordination, and the final demo or presentation.",
      "Titles start with a verb and are under 80 characters. Descriptions are one sentence saying what 'done' means.",
      "Size: S = a few hours, M = about a day, L = two to three days.",
    ]
      .filter(Boolean)
      .join("\n");

    let raw: { tasks?: unknown[] };
    try {
      raw = await generateJson<{ tasks?: unknown[] }>({
        system:
          "You help student teams plan projects on a simple task board. You write clear, specific, realistic tasks.",
        prompt,
        schema: SCHEMA,
        temperature: 0.4,
      });
    } catch (err) {
      if (err instanceof AIUnavailableError) throw new HttpError(503, err.message, "AI_UNAVAILABLE");
      throw err;
    }

    const seen = new Set(existing.map((t) => t.title.trim().toLowerCase()));
    const suggestions: Suggestion[] = [];
    for (const item of Array.isArray(raw?.tasks) ? raw.tasks : []) {
      const t = item as Record<string, unknown>;
      const title = typeof t.title === "string" ? t.title.trim().slice(0, 200) : "";
      if (!title || seen.has(title.toLowerCase())) continue;
      seen.add(title.toLowerCase());
      suggestions.push({
        title,
        description: typeof t.description === "string" ? t.description.trim().slice(0, 1000) : "",
        category: CATEGORY_IDS.includes(t.category as ContributionCategory)
          ? (t.category as ContributionCategory)
          : "development",
        size: t.size === "S" || t.size === "L" ? (t.size as TaskSize) : "M",
      });
      if (suggestions.length >= 20) break;
    }

    if (suggestions.length === 0) {
      throw new HttpError(503, "The AI didn't come up with usable tasks. Try adding more detail to the brief.", "AI_UNAVAILABLE");
    }

    return NextResponse.json({ suggestions });
  });
}
