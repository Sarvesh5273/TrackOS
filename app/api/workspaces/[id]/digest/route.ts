import { NextResponse } from "next/server";
import { handle, loadWorkspace, requireMember } from "@/lib/api/auth";
import { buildDigest } from "@/lib/digest";

export const dynamic = "force-dynamic";

/** ?days=7 (default), 14, 30, or 0 for the whole project. */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin } = await requireMember(params.id);
    const workspace = await loadWorkspace(admin, params.id);
    const raw = Number(new URL(request.url).searchParams.get("days") ?? 7);
    const days = [7, 14, 30].includes(raw) ? raw : raw === 0 ? null : 7;
    const digest = await buildDigest(admin, workspace, days);
    return NextResponse.json({ digest });
  });
}
