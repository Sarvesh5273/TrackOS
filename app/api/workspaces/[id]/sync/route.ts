import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GitHubSyncService } from "@/lib/integrations/github";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = params.id;

  // Check membership
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get integration
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", "github")
    .eq("status", "active")
    .single();

  if (!integration) {
    return NextResponse.json({ error: "No active GitHub integration" }, { status: 400 });
  }

  // Get user's GitHub token from provider (simplified — in production use encrypted storage)
  const { data: { session } } = await supabase.auth.getSession();
  const providerToken = session?.provider_token;

  if (!providerToken) {
    return NextResponse.json({ error: "GitHub token not available" }, { status: 400 });
  }

  const resources = integration.selected_resources as Array<{ id: string; name: string }>;
  const [owner, repo] = resources[0]?.id?.split("/") || [];

  if (!owner || !repo) {
    return NextResponse.json({ error: "Invalid repository config" }, { status: 400 });
  }

  // Get workspace dates
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("start_date, end_date")
    .eq("id", workspaceId)
    .single();

  try {
    const syncService = new GitHubSyncService(providerToken);
    const evidence = await syncService.syncRepository({
      accessToken: providerToken,
      owner,
      repo,
      since: new Date(workspace?.start_date || "2024-01-01"),
      until: new Date(workspace?.end_date || Date.now()),
    });

    // Insert evidence
    const syncVersion = `sync-${Date.now()}`;
    const evidenceToInsert = evidence.map((e) => ({
      workspace_id: workspaceId,
      source: e.source,
      source_id: e.sourceId,
      source_url: e.sourceUrl,
      event_type: e.eventType,
      actor_username: e.actorUsername,
      actor_email: e.actorEmail,
      timestamp: e.timestamp.toISOString(),
      summary: e.summary,
      description: e.description,
      category: e.category,
      work_type: e.workType,
      metadata: e.metadata,
      base_weight: e.baseWeight,
      sync_version: syncVersion,
      verification_state: "provider_verified",
      is_bot_generated: e.actorUsername?.includes("[bot]") || e.actorUsername?.includes("bot"),
    }));

    const { error: insertError } = await supabase
      .from("evidence_items")
      .upsert(evidenceToInsert, { onConflict: "workspace_id,source,source_id,sync_version" });

    if (insertError) throw insertError;

    // Update integration last_synced
    await supabase
      .from("integrations")
      .update({ last_synced_at: new Date().toISOString(), sync_cursor: syncVersion })
      .eq("id", integration.id);

    // Try to auto-map identities
    const { data: existingMappings } = await supabase
      .from("memberships")
      .select("user_id, user:auth.users(raw_user_meta_data)")
      .eq("workspace_id", workspaceId);

    const usernameToUserId = new Map<string, string>();
    existingMappings?.forEach((m: any) => {
      const username = m.user?.raw_user_meta_data?.user_name;
      if (username) usernameToUserId.set(username, m.user_id);
    });

    // Update evidence with mapped actor_ids
    for (const item of evidenceToInsert) {
      const userId = usernameToUserId.get(item.actor_username);
      if (userId) {
        await supabase
          .from("evidence_items")
          .update({ actor_id: userId, attribution_confidence: 1.0, mapping_status: "mapped" })
          .eq("workspace_id", workspaceId)
          .eq("source_id", item.source_id)
          .eq("sync_version", syncVersion);
      }
    }

    return NextResponse.json({
      synced: evidenceToInsert.length,
      syncVersion,
      message: `Synced ${evidenceToInsert.length} evidence items`,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
