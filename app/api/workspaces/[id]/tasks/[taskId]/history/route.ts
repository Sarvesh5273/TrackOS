import { NextResponse } from "next/server";
import { dbError, handle, isUuid, HttpError, requireMember } from "@/lib/api/auth";
import { loadMemberIdentities } from "@/lib/identity";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string; taskId: string } }) {
  return handle(async () => {
    const { admin } = await requireMember(params.id);
    if (!isUuid(params.taskId)) throw new HttpError(404, "Task not found.");

    const [{ data, error }, members] = await Promise.all([
      admin
        .from("audit_events")
        .select("id, actor_id, action, previous_value, new_value, created_at")
        .eq("workspace_id", params.id)
        .eq("object_type", "task")
        .eq("object_id", params.taskId)
        .order("created_at", { ascending: false })
        .limit(50),
      loadMemberIdentities(admin, params.id),
    ]);
    if (error) throw dbError(error);

    const names = new Map(members.map((m) => [m.userId, m.name] as [string, string]));
    const events = (data || []).map((e: any) => ({
      id: e.id,
      action: e.action as string,
      actorName: names.get(e.actor_id) || "Former member",
      previous: e.previous_value,
      next: e.new_value,
      at: e.created_at as string,
    }));

    return NextResponse.json({ events });
  });
}
