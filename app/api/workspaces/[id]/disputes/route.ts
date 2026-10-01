// Report review issues ("Something looks wrong").
// Members raise them; the leader resolves or rejects with a note.

import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, audit, dbError, handle, isUuid, readJson, requireMember } from "@/lib/api/auth";
import { loadMemberIdentities } from "@/lib/identity";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin } = await requireMember(params.id);
    const [{ data, error }, members] = await Promise.all([
      admin.from("disputes").select("*").eq("workspace_id", params.id).order("created_at", { ascending: false }),
      loadMemberIdentities(admin, params.id),
    ]);
    if (error) throw dbError(error);

    const names = new Map(members.map((m) => [m.userId, m.name] as [string, string]));
    const disputes = (data || []).map((d: any) => ({
      ...d,
      created_by_name: names.get(d.created_by) || "Former member",
      resolved_by_name: d.resolved_by ? names.get(d.resolved_by) || "Former member" : null,
    }));
    return NextResponse.json({ disputes });
  });
}

const createSchema = z.object({
  type: z.enum(["score", "evidence", "attribution", "category"]),
  targetId: z.string().max(100).nullable().optional(),
  reason: z.string().trim().min(5, "Explain what's wrong (at least a few words)").max(2000),
  requestedChange: z.string().trim().min(3, "Say what should change").max(1000),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin, user } = await requireMember(params.id);
    const input = await readJson(request, createSchema);

    const { data, error } = await admin
      .from("disputes")
      .insert({
        workspace_id: params.id,
        created_by: user.id,
        type: input.type,
        target_id: input.targetId || null,
        reason: input.reason,
        requested_change: input.requestedChange,
        state: "open",
      })
      .select()
      .single();
    if (error) throw dbError(error);

    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: "dispute.raised",
      objectType: "dispute",
      objectId: data.id,
      newValue: { type: input.type, targetId: input.targetId || null },
    });

    return NextResponse.json({ dispute: data }, { status: 201 });
  });
}

const updateSchema = z.object({
  disputeId: z.string().uuid(),
  action: z.enum(["resolve", "reject", "withdraw"]),
  note: z.string().trim().max(1000).optional(),
});

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin, user, isLeader } = await requireMember(params.id);
    const input = await readJson(request, updateSchema);
    if (!isUuid(input.disputeId)) throw new HttpError(404, "Issue not found.");

    const { data: dispute, error } = await admin
      .from("disputes")
      .select("*")
      .eq("id", input.disputeId)
      .eq("workspace_id", params.id)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!dispute) throw new HttpError(404, "Issue not found.");
    if (!["open", "under_discussion"].includes(dispute.state)) throw new HttpError(409, "This issue is already closed.");

    if (input.action === "withdraw") {
      if (dispute.created_by !== user.id) throw new HttpError(403, "Only the person who raised it can withdraw it.");
    } else {
      if (!isLeader) throw new HttpError(403, "Only the project leader can resolve issues.");
      if (!input.note || input.note.length < 3) throw new HttpError(400, "Add a short note explaining the decision.");
    }

    const update = {
      state: input.action === "reject" ? "rejected" : "resolved",
      resolution: input.action === "withdraw" ? "withdrawn" : input.action === "resolve" ? "accepted" : "rejected",
      resolution_rationale: input.note || (input.action === "withdraw" ? "Withdrawn by the person who raised it." : null),
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    };

    const { data, error: upError } = await admin
      .from("disputes")
      .update(update)
      .eq("id", dispute.id)
      .select()
      .single();
    if (upError) throw dbError(upError);

    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: `dispute.${input.action === "resolve" ? "resolved" : input.action === "reject" ? "rejected" : "withdrawn"}`,
      objectType: "dispute",
      objectId: dispute.id,
      previousValue: { state: dispute.state },
      newValue: update,
    });

    return NextResponse.json({ dispute: data });
  });
}
