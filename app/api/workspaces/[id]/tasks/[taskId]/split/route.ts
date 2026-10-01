// Credit split workflow for a task.
//  propose: leader -> applied now; assignee -> pending until the others approve
//  approve: assignee approves a pending proposal (leader approval applies it)
//  reject:  assignee or leader drops a pending proposal

import { NextResponse } from "next/server";
import { z } from "zod";
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
import { loadTask } from "@/lib/api/taskStore";
import { equalSplit, formatTaskRef, sameSplit, taskKeyOf, validateSplit, type Split } from "@/lib/tasks";
import type { SplitProposal, Task } from "@/types";

export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("propose"), split: z.record(z.string().uuid(), z.number().int()) }),
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject") }),
]);

export async function POST(request: Request, { params }: { params: { id: string; taskId: string } }) {
  return handle(async () => {
    const { admin, user, isLeader } = await requireMember(params.id, { edit: true });
    const workspace = await loadWorkspace(admin, params.id);
    assertWorkspaceOpen(workspace);
    const task = await loadTask(admin, params.id, params.taskId);
    const body = await readJson(request, bodySchema);

    const isAssignee = task.assignee_ids.includes(user.id);
    const ref = formatTaskRef(taskKeyOf(workspace), task.number);
    const toStored = (split: Split): Split | null =>
      sameSplit(split, equalSplit(task.assignee_ids)) ? null : split;

    let patch: Partial<Task>;
    let action: string;
    let message: string;

    if (body.action === "propose") {
      if (!isAssignee && !isLeader) throw new HttpError(403, "Only people on the task or the leader can change its split.");
      const problem = validateSplit(task.assignee_ids, body.split);
      if (problem) throw new HttpError(400, problem);

      const others = task.assignee_ids.filter((id) => id !== user.id);
      if (isLeader || others.length === 0) {
        patch = { split: toStored(body.split), split_proposal: null };
        action = "task.split_set";
        message = "Split updated.";
      } else {
        const proposal: SplitProposal = {
          proposedBy: user.id,
          split: body.split,
          approvals: [user.id],
          createdAt: new Date().toISOString(),
        };
        patch = { split_proposal: proposal };
        action = "task.split_proposed";
        message = "Split proposed. It applies once everyone on the task approves.";
      }
    } else if (body.action === "approve") {
      const proposal = task.split_proposal;
      if (!proposal) throw new HttpError(409, "There's no pending split to approve.");
      if (!isAssignee && !isLeader) throw new HttpError(403, "Only people on the task or the leader can approve.");
      if (validateSplit(task.assignee_ids, proposal.split)) {
        patch = { split_proposal: null };
        action = "task.split_rejected";
        message = "The proposal no longer matches the people on this task, so it was dropped.";
      } else {
        const approvals = Array.from(new Set([...(proposal.approvals || []), user.id]));
        const everyoneApproved = task.assignee_ids.every((id) => approvals.includes(id));
        if (isLeader || everyoneApproved) {
          patch = { split: toStored(proposal.split), split_proposal: null };
          action = "task.split_set";
          message = "Split approved and applied.";
        } else {
          patch = { split_proposal: { ...proposal, approvals } };
          action = "task.split_approved";
          message = "Approved. Waiting for the others on the task.";
        }
      }
    } else {
      if (!task.split_proposal) throw new HttpError(409, "There's no pending split.");
      if (!isAssignee && !isLeader) throw new HttpError(403, "Only people on the task or the leader can decline.");
      patch = { split_proposal: null };
      action = "task.split_rejected";
      message = "Split proposal declined.";
    }

    const { data, error } = await admin
      .from("tasks")
      .update(patch)
      .eq("id", task.id)
      .eq("workspace_id", params.id)
      .select("*")
      .single();
    if (error) throw dbError(error);

    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action,
      objectType: "task",
      objectId: task.id,
      previousValue: { split: task.split, split_proposal: task.split_proposal },
      newValue: { ref, split: (data as Task).split, split_proposal: (data as Task).split_proposal },
    });

    return NextResponse.json({ task: data as Task, message });
  });
}
