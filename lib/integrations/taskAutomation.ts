// Moves tasks when GitHub activity mentions them. Server only.
//  - any commit/PR mentioning KEY-12 moves a "To do" task to "In progress"
//  - a merged PR saying "closes KEY-12" moves the task to "Done"

import type { AdminClient } from "@/lib/supabase/admin";
import { audit, isMissingSchema } from "@/lib/api/auth";
import { extractClosingRefs, extractTaskRefs, formatTaskRef, taskKeyOf } from "@/lib/tasks";
import type { Task } from "@/types";

export interface AutomationItem {
  source: string;
  summary?: string | null;
  description?: string | null;
  metadata?: Record<string, any> | null;
  actorId?: string | null;
  timestamp: string;
}

export async function applyTaskAutomation(
  admin: AdminClient,
  workspace: { id: string; task_key?: string | null; name?: string | null; status?: string | null },
  items: AutomationItem[],
  fallbackActorId: string | null
): Promise<{ started: number; completed: number }> {
  const result = { started: 0, completed: 0 };
  if (workspace.status === "published" || workspace.status === "archived") return result;

  const key = taskKeyOf(workspace);
  const mentions = new Map<number, { startAt: string; actorId: string | null }>();
  const closes = new Map<number, { doneAt: string; actorId: string | null }>();

  for (const item of items) {
    const text = [item.summary, item.description].filter(Boolean).join("\n");
    const refs = extractTaskRefs(text, key);
    if (refs.length === 0) continue;
    for (const n of refs) {
      const prev = mentions.get(n);
      if (!prev || item.timestamp < prev.startAt) mentions.set(n, { startAt: item.timestamp, actorId: item.actorId || null });
    }
    const merged = item.source === "github_pr" && item.metadata?.merged === true;
    if (merged) {
      const doneAt = item.metadata?.mergedAt || item.timestamp;
      for (const n of extractClosingRefs(text, key)) closes.set(n, { doneAt, actorId: item.actorId || null });
    }
  }

  const numbers = Array.from(new Set(Array.from(mentions.keys()).concat(Array.from(closes.keys()))));
  if (numbers.length === 0) return result;

  const { data, error } = await admin
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspace.id)
    .in("number", numbers);
  if (error) {
    if (!isMissingSchema(error)) console.error("Task automation lookup failed:", error.message);
    return result;
  }

  for (const task of (data || []) as Task[]) {
    const close = closes.get(task.number);
    const mention = mentions.get(task.number);
    let update: Partial<Task> | null = null;
    let action = "";

    if (close && task.status !== "done") {
      update = {
        status: "done",
        completed_at: close.doneAt,
        started_at: task.started_at || mention?.startAt || close.doneAt,
      };
      action = "task.auto_done";
      result.completed++;
    } else if (mention && task.status === "todo") {
      update = { status: "in_progress", started_at: mention.startAt };
      action = "task.auto_started";
      result.started++;
    }
    if (!update) continue;

    const { error: upError } = await admin.from("tasks").update(update).eq("id", task.id);
    if (upError) {
      console.error("Task automation update failed:", upError.message);
      continue;
    }
    const actorId = close?.actorId || mention?.actorId || fallbackActorId;
    if (actorId) {
      await audit(admin, {
        actorId,
        workspaceId: workspace.id,
        action,
        objectType: "task",
        objectId: task.id,
        previousValue: { status: task.status },
        newValue: { status: update.status, ref: formatTaskRef(key, task.number), via: "github" },
      });
    }
  }

  return result;
}
