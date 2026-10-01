import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, audit, dbError, handle, loadWorkspace, readJson, requireMember } from "@/lib/api/auth";
import { isAIConfigured } from "@/lib/ai";
import { dedupeEvidence } from "@/lib/reports/build";
import { createActorResolver, loadMemberIdentities, toTeamMember } from "@/lib/identity";
import { CATEGORY_IDS, TASK_KEY_PATTERN, taskKeyOf } from "@/lib/tasks";

export const dynamic = "force-dynamic";

/** Everything the project page needs in one call. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin, user, membership } = await requireMember(params.id);
    const workspace = await loadWorkspace(admin, params.id);

    const [{ data: evidence, error }, members] = await Promise.all([
      admin
        .from("evidence_items")
        .select("*")
        .eq("workspace_id", params.id)
        .order("timestamp", { ascending: false })
        .limit(2000),
      loadMemberIdentities(admin, params.id),
    ]);
    if (error) throw dbError(error);

    // Show who each item belongs to, even for rows synced before a teammate joined
    const resolve = createActorResolver(members);
    const memberIds = new Set(members.map((m) => m.userId));
    const items = dedupeEvidence((evidence || []) as any[]).map((e: any) => ({
      ...e,
      resolved_actor_id:
        e.actor_id && memberIds.has(e.actor_id) ? e.actor_id : resolve(e.actor_username, e.actor_email)?.userId || null,
    }));

    return NextResponse.json({
      workspace: { ...workspace, task_key: taskKeyOf(workspace) },
      evidence: items,
      members: members.map((m) => toTeamMember(m, { includeEmail: true })),
      myRole: membership.role,
      currentUserId: user.id,
      features: { ai: isAIConfigured() },
    });
  });
}

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).nullable(),
    project_brief: z.string().max(8000).nullable(),
    status: z.enum(["active", "archived"]),
    taskKey: z.string().trim().toUpperCase().regex(TASK_KEY_PATTERN, "Task key: 2-6 letters/digits, starting with a letter"),
    startDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid start date"),
    endDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid deadline"),
    categories: z
      .array(
        z.object({
          id: z.enum(CATEGORY_IDS as [string, ...string[]]),
          name: z.string().min(1).max(60),
          weight: z.number().min(0).max(1),
        })
      )
      .refine((c) => Math.abs(c.reduce((s, x) => s + x.weight, 0) - 1) < 0.011, "Credit weights must add up to 100%"),
  })
  .partial();

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireMember(params.id, { edit: true });
    const { admin, user, isLeader } = ctx;
    const workspace = await loadWorkspace(admin, params.id);
    const input = await readJson(request, updateSchema);

    const onlyBrief = Object.keys(input).every((k) => k === "project_brief");
    if (!onlyBrief && !isLeader) throw new HttpError(403, "Only the project leader can change project settings.");

    const update: Record<string, unknown> = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.description !== undefined) update.description = input.description || null;
    if (input.project_brief !== undefined) update.project_brief = input.project_brief?.trim() || null;
    if (input.status !== undefined) update.status = input.status;
    if (input.taskKey !== undefined) update.task_key = input.taskKey;
    if (input.startDate !== undefined) update.start_date = input.startDate;
    if (input.endDate !== undefined) update.end_date = input.endDate;
    if (input.categories !== undefined) {
      update.categories = input.categories;
      update.policy_version = (workspace.policy_version || 1) + 1;
    }

    const start = Date.parse(String(update.start_date ?? workspace.start_date));
    const end = Date.parse(String(update.end_date ?? workspace.end_date));
    if (end < start) throw new HttpError(400, "The deadline must be on or after the start date.");

    if (Object.keys(update).length === 0) return NextResponse.json({ workspace });

    const { data, error } = await admin.from("workspaces").update(update).eq("id", params.id).select().single();
    if (error) throw dbError(error);

    const previous: Record<string, unknown> = {};
    for (const k of Object.keys(update)) previous[k] = workspace[k];
    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: input.status ? `workspace.${input.status === "active" ? "reopened" : "archived"}` : "workspace.updated",
      objectType: "workspace",
      objectId: params.id,
      previousValue: previous,
      newValue: update,
    });

    return NextResponse.json({ workspace: { ...data, task_key: taskKeyOf(data) } });
  });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin, user } = await requireMember(params.id, { leader: true });
    const workspace = await loadWorkspace(admin, params.id);

    // The audit row survives deletion (workspace_id is set to null by the FK)
    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: "workspace.deleted",
      objectType: "workspace",
      objectId: params.id,
      previousValue: { name: workspace.name },
    });

    // Child rows are removed by ON DELETE CASCADE
    const { error } = await admin.from("workspaces").delete().eq("id", params.id);
    if (error) throw dbError(error);

    return NextResponse.json({ success: true });
  });
}
