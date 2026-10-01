// Task persistence helpers. Server only.

import type { AdminClient } from "@/lib/supabase/admin";
import { HttpError, dbError, isUuid } from "@/lib/api/auth";
import type { Task, TaskStatus } from "@/types";

export async function loadTask(admin: AdminClient, workspaceId: string, taskId: string): Promise<Task> {
  if (!isUuid(taskId)) throw new HttpError(404, "Task not found.");
  const { data, error } = await admin
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw new HttpError(404, "Task not found.");
  return data as Task;
}

/** Timestamps that go with a status change. */
export function statusTimestamps(task: Pick<Task, "status" | "started_at"> | null, next: TaskStatus, now: string) {
  const patch: Partial<Task> = {};
  if (next === "todo") {
    patch.completed_at = null;
  }
  if (next === "in_progress") {
    patch.started_at = task?.started_at || now;
    patch.completed_at = null;
  }
  if (next === "done") {
    patch.started_at = task?.started_at || now;
    patch.completed_at = now;
  }
  if (task && task.status === "done" && next !== "done") {
    // Confirmations were for the finished state
    patch.confirmed_by = [];
  }
  return patch;
}

export async function maxPositions(admin: AdminClient, workspaceId: string): Promise<Record<TaskStatus, number>> {
  const { data, error } = await admin
    .from("tasks")
    .select("status, position")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: false })
    .limit(500);
  if (error) throw dbError(error);
  const max: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0 };
  for (const row of (data || []) as { status: TaskStatus; position: number }[]) {
    if (row.position > (max[row.status] ?? 0)) max[row.status] = row.position;
  }
  return max;
}
