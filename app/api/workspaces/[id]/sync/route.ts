import { NextResponse } from "next/server";
import { HttpError, audit, dbError, handle, loadWorkspace, requireMember } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";
import { GitHubSyncService } from "@/lib/integrations/github";
import { GITHUB_SYNC_VERSION, toEvidenceRow } from "@/lib/integrations/ingest";
import { applyTaskAutomation } from "@/lib/integrations/taskAutomation";
import { createActorResolver, loadMemberIdentities } from "@/lib/identity";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin, user } = await requireMember(params.id);
    const workspace = await loadWorkspace(admin, params.id);

    const { data: integration, error: intError } = await admin
      .from("integrations")
      .select("*")
      .eq("workspace_id", params.id)
      .eq("provider", "github")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (intError) throw dbError(intError);
    if (!integration) throw new HttpError(400, "Connect a GitHub repository first.");

    const res = (integration.selected_resources || {}) as Record<string, any>;
    const [owner, repo] = res.owner && res.name ? [res.owner, res.name] : String(res.repo || "").split("/");
    if (!owner || !repo) throw new HttpError(400, "The saved repository is invalid. Reconnect GitHub.");

    // Token: saved PAT -> the caller's GitHub sign-in token -> server GITHUB_TOKEN -> none (public repos)
    const {
      data: { session },
    } = await createClient().auth.getSession();
    const token = integration.credential_ref || session?.provider_token || process.env.GITHUB_TOKEN || null;

    let normalized;
    try {
      normalized = await new GitHubSyncService(token).syncRepository({
        owner,
        repo,
        since: workspace.start_date ? new Date(workspace.start_date) : undefined,
        until: workspace.end_date ? new Date(new Date(workspace.end_date).getTime() + 24 * 3600 * 1000) : undefined,
      });
    } catch (err: any) {
      await admin
        .from("integrations")
        .update({ status: "error", error_message: String(err?.message || "Sync failed").slice(0, 300) })
        .eq("id", integration.id);
      throw new HttpError(502, "GitHub sync failed. Check the repository access and try again.");
    }

    const members = await loadMemberIdentities(admin, params.id);
    const resolve = createActorResolver(members);
    const memberIds = new Set(members.map((m) => m.userId));

    const { data: existing, error: exError } = await admin
      .from("evidence_items")
      .select("id, source, source_id, actor_id, actor_username, actor_email, metadata")
      .eq("workspace_id", params.id)
      .eq("sync_version", GITHUB_SYNC_VERSION);
    if (exError) throw dbError(exError);

    const existingByKey = new Map<string, any>();
    for (const row of existing || []) existingByKey.set(`${row.source}:${row.source_id}`, row);

    const rows = normalized.map((e) => toEvidenceRow(params.id, e, resolve));
    const toInsert = rows.filter((r) => !existingByKey.has(`${r.source}:${r.source_id}`));

    // Keep PR state fresh (e.g. merged after the last sync)
    const prUpdates = rows.filter((r) => {
      const prev = existingByKey.get(`${r.source}:${r.source_id}`);
      return prev && r.source === "github_pr" && prev.metadata?.merged !== (r.metadata as any)?.merged;
    });

    // Re-match older rows that nobody was matched to (e.g. a teammate joined later)
    const remaps = (existing || [])
      .filter((row: any) => !row.actor_id || !memberIds.has(row.actor_id))
      .map((row: any) => ({ row, match: resolve(row.actor_username, row.actor_email) }))
      .filter((x) => x.match && x.match.userId !== x.row.actor_id);

    for (let i = 0; i < toInsert.length; i += 200) {
      const { error } = await admin.from("evidence_items").insert(toInsert.slice(i, i + 200));
      if (error) throw dbError(error);
    }
    for (const r of prUpdates) {
      await admin
        .from("evidence_items")
        .update({ metadata: r.metadata, work_type: r.work_type, description: r.description, summary: r.summary })
        .eq("workspace_id", params.id)
        .eq("source", r.source)
        .eq("source_id", r.source_id);
    }
    for (const { row, match } of remaps) {
      await admin
        .from("evidence_items")
        .update({ actor_id: match!.userId, attribution_confidence: match!.confidence, mapping_status: "mapped" })
        .eq("id", row.id);
    }

    const automation = await applyTaskAutomation(
      admin,
      workspace as any,
      rows.map((r) => ({
        source: r.source,
        summary: r.summary,
        description: r.description,
        metadata: r.metadata as Record<string, any>,
        actorId: r.actor_id,
        timestamp: r.timestamp,
      })),
      user.id
    );

    await admin
      .from("integrations")
      .update({
        last_synced_at: new Date().toISOString(),
        sync_cursor: GITHUB_SYNC_VERSION,
        status: "active",
        error_message: null,
      })
      .eq("id", integration.id);

    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: "integration.synced",
      objectType: "integration",
      objectId: integration.id,
      newValue: {
        repo: `${owner}/${repo}`,
        newItems: toInsert.length,
        updatedPRs: prUpdates.length,
        rematched: remaps.length,
        tasksStarted: automation.started,
        tasksCompleted: automation.completed,
      },
    });

    const unmatched = rows.filter((r) => !r.actor_id && !r.is_bot_generated).length;
    const parts = [`${toInsert.length} new item${toInsert.length === 1 ? "" : "s"}`];
    if (automation.completed) parts.push(`${automation.completed} task${automation.completed === 1 ? "" : "s"} moved to Done`);
    if (automation.started) parts.push(`${automation.started} started`);

    return NextResponse.json({
      synced: toInsert.length,
      total: rows.length,
      unmatched,
      tasksCompleted: automation.completed,
      tasksStarted: automation.started,
      message: `Sync complete: ${parts.join(", ")}.`,
    });
  });
}
