// A teammate who isn't on a done task confirms it happened (counts it fully).

import { NextResponse } from "next/server";
import {
  HttpError,
  assertWorkspaceOpen,
  audit,
  dbError,
  handle,
  loadWorkspace,
  requireMember,
} from "@/lib/api/auth";
import { loadTask } from "@/lib/api/taskStore";
import { formatTaskRef, taskKeyOf } from "@/lib/tasks";
import type { Task } from "@/types";

export const dynamic = "force-dynamic";

type Params = { params: { id: string; taskId: string } };

async function setConfirmation(params: Params["params"], confirm: boolean) {
  // Reviewers (e.g. a TA) can confirm too
  const { admin, user } = await requireMember(params.id);
  const workspace = await loadWorkspace(admin, params.id);
  assertWorkspaceOpen(workspace);
  const task = await loadTask(admin, params.id, params.taskId);

  if (task.assignee_ids.includes(user.id)) {
    throw new HttpError(400, "You can't confirm a task you're on. Ask a teammate.");
  }
  if (confirm && task.status !== "done") {
    throw new HttpError(400, "Only done tasks can be confirmed.");
  }

  const current = task.confirmed_by || [];
  const next = confirm
    ? Array.from(new Set([...current, user.id]))
    : current.filter((id) => id !== user.id);

  const { data, error } = await admin
    .from("tasks")
    .update({ confirmed_by: next })
    .eq("id", task.id)
    .eq("workspace_id", params.id)
    .select("*")
    .single();
  if (error) throw dbError(error);

  await audit(admin, {
    actorId: user.id,
    workspaceId: params.id,
    action: confirm ? "task.confirmed" : "task.unconfirmed",
    objectType: "task",
    objectId: task.id,
    newValue: { ref: formatTaskRef(taskKeyOf(workspace), task.number) },
  });

  return NextResponse.json({ task: data as Task });
}

export async function POST(_request: Request, { params }: Params) {
  return handle(() => setConfirmation(params, true));
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(() => setConfirmation(params, false));
}
