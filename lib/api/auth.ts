// Shared auth + error helpers for API routes.
// Every route authorizes in code, then uses the service-role client.

import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import type { MembershipRole } from "@/types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

export interface MembershipRow {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MembershipRole;
  invitation_state: string;
}

export interface MemberContext {
  user: User;
  membership: MembershipRow;
  admin: AdminClient;
  isLeader: boolean;
  /** leaders and members can edit; reviewers are read-only */
  canEdit: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export async function getSessionUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Please sign in first.");
  return user;
}

/**
 * Ensures the caller is an accepted member of the workspace.
 * - leader: only the project leader
 * - edit: leaders and members (reviewers are read-only)
 */
export async function requireMember(
  workspaceId: string,
  opts: { leader?: boolean; edit?: boolean } = {}
): Promise<MemberContext> {
  if (!isUuid(workspaceId)) throw new HttpError(404, "Project not found.");
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: membership, error } = await admin
    .from("memberships")
    .select("id, workspace_id, user_id, role, invitation_state")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("invitation_state", "accepted")
    .maybeSingle();

  if (error) throw dbError(error);
  if (!membership) throw new HttpError(403, "You're not a member of this project.");

  const isLeader = membership.role === "leader";
  const canEdit = isLeader || membership.role === "member";

  if (opts.leader && !isLeader) {
    throw new HttpError(403, "Only the project leader can do this.");
  }
  if (opts.edit && !canEdit) {
    throw new HttpError(403, "Reviewers can view the project but can't change it.");
  }

  return { user, membership: membership as MembershipRow, admin, isLeader, canEdit };
}

const MIGRATION_CODES = new Set(["PGRST205", "PGRST204", "42P01", "42703"]);

/** Maps a Supabase/PostgREST error to an HttpError with a helpful message. */
export function dbError(error: { code?: string; message?: string }): HttpError {
  if (error.code && MIGRATION_CODES.has(error.code)) {
    return new HttpError(
      503,
      "Database update needed: run the SQL files in supabase/migrations in the Supabase SQL editor.",
      "MIGRATION_REQUIRED"
    );
  }
  console.error("Database error:", error);
  return new HttpError(500, "Something went wrong talking to the database.");
}

export function isMissingSchema(error: { code?: string } | null | undefined): boolean {
  return Boolean(error?.code && MIGRATION_CODES.has(error.code));
}

/** Wraps a route handler with consistent error responses. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    if (err instanceof ZodError) {
      const issue = err.errors[0];
      const field = issue?.path?.join(".");
      return NextResponse.json(
        { error: field ? `${field}: ${issue.message}` : issue?.message || "Invalid input" },
        { status: 400 }
      );
    }
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function readJson<S extends ZodTypeAny>(request: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
  return schema.parse(body);
}

export async function audit(
  admin: AdminClient,
  entry: {
    actorId: string;
    workspaceId: string | null;
    action: string;
    objectType: string;
    objectId?: string | null;
    previousValue?: unknown;
    newValue?: unknown;
  }
): Promise<void> {
  const { error } = await admin.from("audit_events").insert({
    actor_id: entry.actorId,
    workspace_id: entry.workspaceId,
    action: entry.action,
    object_type: entry.objectType,
    object_id: entry.objectId ?? null,
    previous_value: entry.previousValue ?? null,
    new_value: entry.newValue ?? null,
  });
  if (error) console.error("Audit log failed:", error.message);
}

/** Reads the workspace row; 404 if missing. */
export async function loadWorkspace(admin: AdminClient, workspaceId: string) {
  const { data, error } = await admin.from("workspaces").select("*").eq("id", workspaceId).maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw new HttpError(404, "Project not found.");
  return data as Record<string, any>;
}

/** Published projects are read-only until the leader reopens them. */
export function assertWorkspaceOpen(workspace: { status?: string }) {
  if (workspace.status === "published" || workspace.status === "archived") {
    throw new HttpError(409, "This project is published. The leader can reopen it to make changes.");
  }
}
