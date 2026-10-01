import { NextResponse } from "next/server";
import {
  assertWorkspaceOpen,
  audit,
  dbError,
  handle,
  loadWorkspace,
  readJson,
  requireMember,
} from "@/lib/api/auth";
import { assertAssignable, createTasksBody, type CreateTaskInput } from "@/lib/api/taskInput";
import { maxPositions, statusTimestamps } from "@/lib/api/taskStore";
import { loadTasks } from "@/lib/reports/build";
import { formatTaskRef, taskKeyOf } from "@/lib/tasks";
import type { Task, TaskStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin } = await requireMember(params.id);
    const { tasks, ready } = await loadTasks(admin, params.id);
    return NextResponse.json({ tasks, ready });
  });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin, user } = await requireMember(params.id, { edit: true });
    const workspace = await loadWorkspace(admin, params.id);
    assertWorkspaceOpen(workspace);

    const body = await readJson(request, createTasksBody);
    const inputs: CreateTaskInput[] = "tasks" in body ? body.tasks : [body];

    const allAssignees = inputs.flatMap((t) => t.assigneeIds || []);
    await assertAssignable(admin, params.id, allAssignees);

    const positions = await maxPositions(admin, params.id);
    const now = new Date().toISOString();

    const rows = inputs.map((t) => {
      const status: TaskStatus = t.status || "todo";
      positions[status] += 1000;
      return {
        workspace_id: params.id,
        title: t.title,
        description: t.description?.trim() || null,
        status,
        category: t.category || "development",
        size: t.size || "M",
        assignee_ids: Array.from(new Set(t.assigneeIds || [])),
        due_date: t.dueDate || null,
        link: t.link || null,
        position: positions[status],
        created_by: user.id,
        ...statusTimestamps(null, status, now),
      };
    });

    const { data, error } = await admin.from("tasks").insert(rows).select("*");
    if (error) throw dbError(error);

    const created = (data || []) as Task[];
    const key = taskKeyOf(workspace);
    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: created.length > 1 ? "task.bulk_created" : "task.created",
      objectType: "task",
      objectId: created.length === 1 ? created[0].id : null,
      newValue: { refs: created.map((t) => formatTaskRef(key, t.number)), titles: created.map((t) => t.title) },
    });

    return NextResponse.json({ tasks: created }, { status: 201 });
  });
}
