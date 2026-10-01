import { NextResponse } from "next/server";
import {
  HttpError,
  assertWorkspaceOpen,
  audit,
  dbError,
  handle,
  loadWorkspace,
  readJson,
  requireMember,
} from "@/lib/api/auth";
import { assertAssignable, updateTaskSchema } from "@/lib/api/taskInput";
import { loadTask, statusTimestamps } from "@/lib/api/taskStore";
import { formatTaskRef, taskKeyOf } from "@/lib/tasks";
import type { Task } from "@/types";

export const dynamic = "force-dynamic";

type Params = { params: { id: string; taskId: string } };

const TRACKED: (keyof Task)[] = [
  "title",
  "description",
  "status",
  "category",
  "size",
  "assignee_ids",
  "due_date",
  "link",
  "split",
];

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const { admin, user } = await requireMember(params.id, { edit: true });
    const workspace = await loadWorkspace(admin, params.id);
    assertWorkspaceOpen(workspace);
    const task = await loadTask(admin, params.id, params.taskId);
    const input = await readJson(request, updateTaskSchema);

    const patch: Partial<Task> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description?.trim() || null;
    if (input.category !== undefined) patch.category = input.category;
    if (input.size !== undefined) patch.size = input.size;
    if (input.dueDate !== undefined) patch.due_date = input.dueDate || null;
    if (input.link !== undefined) patch.link = input.link || null;
    if (input.position !== undefined) patch.position = input.position;

    if (input.status !== undefined && input.status !== task.status) {
      patch.status = input.status;
      Object.assign(patch, statusTimestamps(task, input.status, new Date().toISOString()));
    }

    if (input.assigneeIds !== undefined) {
      const ids = await assertAssignable(admin, params.id, input.assigneeIds);
      const changed =
        ids.length !== task.assignee_ids.length || ids.some((id) => !task.assignee_ids.includes(id));
      if (changed) {
        patch.assignee_ids = ids;
        // A custom split only makes sense for the people it was agreed with
        patch.split = null;
        patch.split_proposal = null;
        // Confirmations must come from people who aren't on the task
        patch.confirmed_by = (patch.confirmed_by ?? task.confirmed_by ?? []).filter((id) => !ids.includes(id));
      }
    }

    if (Object.keys(patch).length === 0) return NextResponse.json({ task });

    const { data, error } = await admin
      .from("tasks")
      .update(patch)
      .eq("id", task.id)
      .eq("workspace_id", params.id)
      .select("*")
      .single();
    if (error) throw dbError(error);

    // Only log meaningful changes (not drag reordering)
    const changedFields = TRACKED.filter(
      (k) => k in patch && JSON.stringify(patch[k]) !== JSON.stringify(task[k])
    );
    if (changedFields.length > 0) {
      const previous: Record<string, unknown> = {};
      const next: Record<string, unknown> = {};
      for (const k of changedFields) {
        previous[k] = task[k];
        next[k] = patch[k];
      }
      await audit(admin, {
        actorId: user.id,
        workspaceId: params.id,
        action: patch.status ? "task.status_changed" : "task.updated",
        objectType: "task",
        objectId: task.id,
        previousValue: previous,
        newValue: { ...next, ref: formatTaskRef(taskKeyOf(workspace), task.number) },
      });
    }

    return NextResponse.json({ task: data as Task });
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    const { admin, user, isLeader } = await requireMember(params.id, { edit: true });
    const workspace = await loadWorkspace(admin, params.id);
    assertWorkspaceOpen(workspace);
    const task = await loadTask(admin, params.id, params.taskId);

    if (!isLeader && task.created_by !== user.id) {
      throw new HttpError(403, "Only the person who created this task or the leader can delete it.");
    }

    const { error } = await admin.from("tasks").delete().eq("id", task.id).eq("workspace_id", params.id);
    if (error) throw dbError(error);

    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: "task.deleted",
      objectType: "task",
      objectId: task.id,
      previousValue: {
        ref: formatTaskRef(taskKeyOf(workspace), task.number),
        title: task.title,
        status: task.status,
        assignee_ids: task.assignee_ids,
      },
    });

    return NextResponse.json({ success: true });
  });
}
