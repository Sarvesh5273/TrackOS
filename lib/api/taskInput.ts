// Validation for task create/update. Server only.

import { z } from "zod";
import type { AdminClient } from "@/lib/supabase/admin";
import { HttpError, dbError } from "@/lib/api/auth";
import { CATEGORY_IDS } from "@/lib/tasks";
import type { ContributionCategory } from "@/types";

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https?:\/\/[^\s]+$/i.test(v), "Link must start with http:// or https://");

export const taskFields = {
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(5000, "Description is too long").nullable(),
  status: z.enum(["todo", "in_progress", "done"]),
  category: z.enum(CATEGORY_IDS as [ContributionCategory, ...ContributionCategory[]]),
  size: z.enum(["S", "M", "L"]),
  assigneeIds: z.array(z.string().uuid()).max(10, "Up to 10 people per task"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date")
    .nullable(),
  link: z.union([httpUrl, z.literal("")]).nullable(),
};

export const createTaskSchema = z.object({
  title: taskFields.title,
  description: taskFields.description.optional(),
  status: taskFields.status.optional(),
  category: taskFields.category.optional(),
  size: taskFields.size.optional(),
  assigneeIds: taskFields.assigneeIds.optional(),
  dueDate: taskFields.dueDate.optional(),
  link: taskFields.link.optional(),
});

export const createTasksBody = z.union([
  createTaskSchema,
  z.object({ tasks: z.array(createTaskSchema).min(1).max(30, "Add up to 30 tasks at once") }),
]);

export const updateTaskSchema = z
  .object({
    title: taskFields.title,
    description: taskFields.description,
    status: taskFields.status,
    category: taskFields.category,
    size: taskFields.size,
    assigneeIds: taskFields.assigneeIds,
    dueDate: taskFields.dueDate,
    link: taskFields.link,
    position: z.number().finite(),
  })
  .partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/** Assignees must be accepted leaders/members of the project (not reviewers). */
export async function assertAssignable(admin: AdminClient, workspaceId: string, ids: string[]) {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return unique;
  const { data, error } = await admin
    .from("memberships")
    .select("user_id, role")
    .eq("workspace_id", workspaceId)
    .eq("invitation_state", "accepted")
    .in("user_id", unique);
  if (error) throw dbError(error);
  const allowed = new Set((data || []).filter((m: any) => m.role !== "reviewer").map((m: any) => m.user_id));
  const bad = unique.filter((id) => !allowed.has(id));
  if (bad.length > 0) throw new HttpError(400, "Tasks can only be assigned to project members (not reviewers).");
  return unique;
}
