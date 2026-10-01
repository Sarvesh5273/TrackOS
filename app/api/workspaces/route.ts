import { NextResponse } from "next/server";
import { z } from "zod";
import { audit, dbError, handle, isMissingSchema, readJson, requireUser } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_IDS, DEFAULT_CATEGORY_WEIGHTS, TASK_KEY_PATTERN, deriveTaskKey } from "@/lib/tasks";

export const dynamic = "force-dynamic";

const categorySchema = z.object({
  id: z.enum(CATEGORY_IDS as [string, ...string[]]),
  name: z.string().min(1).max(60),
  weight: z.number().min(0).max(1),
});

const createSchema = z
  .object({
    name: z.string().trim().min(1, "Project name is required").max(100),
    description: z.string().trim().max(500).optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "Deadline is required"),
    taskKey: z
      .string()
      .trim()
      .toUpperCase()
      .regex(TASK_KEY_PATTERN, "Task key: 2-6 letters/digits, starting with a letter")
      .optional(),
    categories: z.array(categorySchema).optional(),
  })
  .refine((v) => !Number.isNaN(Date.parse(v.startDate)) && !Number.isNaN(Date.parse(v.endDate)), {
    message: "Use valid dates",
  })
  .refine((v) => Date.parse(v.endDate) >= Date.parse(v.startDate), {
    message: "The deadline must be on or after the start date",
  })
  .refine(
    (v) => !v.categories || Math.abs(v.categories.reduce((s, c) => s + c.weight, 0) - 1) < 0.011,
    { message: "Credit weights must add up to 100%" }
  );

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const admin = createAdminClient();
    const input = await readJson(request, createSchema);

    const row: Record<string, unknown> = {
      name: input.name,
      description: input.description || null,
      start_date: input.startDate,
      end_date: input.endDate,
      categories: input.categories?.length ? input.categories : DEFAULT_CATEGORY_WEIGHTS,
      status: "active",
      task_key: input.taskKey || deriveTaskKey(input.name),
    };

    let { data: workspace, error } = await admin.from("workspaces").insert(row).select().single();
    if (error && isMissingSchema(error)) {
      // task_key column not added yet (migration pending): create without it
      delete row.task_key;
      ({ data: workspace, error } = await admin.from("workspaces").insert(row).select().single());
    }
    if (error || !workspace) throw dbError(error || { message: "Workspace insert returned no row" });

    const { error: memError } = await admin.from("memberships").insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "leader",
      invitation_state: "accepted",
      joined_at: new Date().toISOString(),
      consent_given_at: new Date().toISOString(),
    });
    if (memError) {
      await admin.from("workspaces").delete().eq("id", workspace.id);
      throw dbError(memError);
    }

    await audit(admin, {
      actorId: user.id,
      workspaceId: workspace.id,
      action: "workspace.created",
      objectType: "workspace",
      objectId: workspace.id,
      newValue: { name: workspace.name },
    });

    return NextResponse.json({ workspace }, { status: 201 });
  });
}

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const admin = createAdminClient();

    const { data: mine, error } = await admin
      .from("memberships")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .eq("invitation_state", "accepted");
    if (error) throw dbError(error);

    const ids = (mine || []).map((m: any) => m.workspace_id as string);
    if (ids.length === 0) return NextResponse.json({ workspaces: [] });
    const roleOf = new Map((mine || []).map((m: any) => [m.workspace_id, m.role] as [string, string]));

    const [{ data: workspaces, error: wsError }, { data: memberRows }, taskResult] = await Promise.all([
      admin.from("workspaces").select("*").in("id", ids).order("created_at", { ascending: false }),
      admin
        .from("memberships")
        .select("workspace_id")
        .in("workspace_id", ids)
        .eq("invitation_state", "accepted"),
      admin.from("tasks").select("workspace_id, status, assignee_ids, due_date").in("workspace_id", ids),
    ]);
    if (wsError) throw dbError(wsError);
    if (taskResult.error && !isMissingSchema(taskResult.error)) throw dbError(taskResult.error);

    const today = new Date().toISOString().slice(0, 10);
    const stats = new Map<string, { members: number; open: number; done: number; mine: number; overdue: number }>();
    for (const id of ids) stats.set(id, { members: 0, open: 0, done: 0, mine: 0, overdue: 0 });
    for (const m of memberRows || []) stats.get((m as any).workspace_id)!.members++;
    for (const t of (taskResult.data || []) as any[]) {
      const s = stats.get(t.workspace_id);
      if (!s) continue;
      if (t.status === "done") {
        s.done++;
      } else {
        s.open++;
        if ((t.assignee_ids || []).includes(user.id)) s.mine++;
        if (t.due_date && t.due_date < today) s.overdue++;
      }
    }

    return NextResponse.json({
      workspaces: (workspaces || []).map((w: any) => {
        const s = stats.get(w.id)!;
        return {
          ...w,
          my_role: roleOf.get(w.id) || "member",
          member_count: s.members,
          open_task_count: s.open,
          done_task_count: s.done,
          my_open_task_count: s.mine,
          overdue_task_count: s.overdue,
        };
      }),
    });
  });
}
