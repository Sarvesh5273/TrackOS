import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GitHubSyncService } from "@/lib/integrations/github";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      .maybeSingle();

    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Get integration
    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("provider", "github")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (intError || !integration) {
      return NextResponse.json(
        { error: "No GitHub integration found. Please connect your repository first." },
        { status: 400 }
      );
    }

    // Parse repository owner and name from selected_resources
    let owner = "";
    let repo = "";

    const res = integration.selected_resources as any;
    if (res) {
      if (res.owner && res.name) {
        owner = res.owner;
        repo = res.name;
      } else if (typeof res.repo === "string") {
        const parts = res.repo.split("/");
        owner = parts[0];
        repo = parts[1];
      } else if (Array.isArray(res) && res[0]?.id) {
        const parts = String(res[0].id).split("/");
        owner = parts[0];
        repo = parts[1];
      }
    }

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Invalid repository configuration in integration." },
        { status: 400 }
      );
    }

    // Token resolution cascade:
    // 1. Stored integration token (PAT)
    // 2. User's Supabase session provider_token
    // 3. Server environment GITHUB_TOKEN
    // 4. undefined (unauthenticated access for public repos)
    const { data: { session } } = await supabase.auth.getSession();
    const token = integration.credential_ref || session?.provider_token || process.env.GITHUB_TOKEN;

    // Get workspace date range
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("start_date, end_date")
      .eq("id", workspaceId)
      .single();

    const syncService = new GitHubSyncService(token);
    const evidence = await syncService.syncRepository({
      accessToken: token,
      owner,
      repo,
      since: workspace?.start_date ? new Date(workspace.start_date) : undefined,
      until: workspace?.end_date ? new Date(workspace.end_date) : undefined,
    });

    if (!evidence || evidence.length === 0) {
      await supabase
        .from("integrations")
        .update({
          last_synced_at: new Date().toISOString(),
          status: "active",
          error_message: null,
        })
        .eq("id", integration.id);

      return NextResponse.json({
        synced: 0,
        message: "Sync completed. No commits or pull requests found in the workspace date range.",
      });
    }

    // Query workspace memberships for identity auto-mapping
    const { data: members } = await supabase
      .from("memberships")
      .select("user_id, role")
      .eq("workspace_id", workspaceId);

    // Fetch user profiles for mapped matching
    const memberUserIds = (members || []).map((m) => m.user_id).filter(Boolean);
    const usernameToUserId = new Map<string, string>();
    const emailToUserId = new Map<string, string>();

    // Link logged in user
    if (user.user_metadata?.user_name) {
      usernameToUserId.set(user.user_metadata.user_name.toLowerCase(), user.id);
    }
    if (user.email) {
      emailToUserId.set(user.email.toLowerCase(), user.id);
    }

    // Query existing evidence items in database to prevent duplicates
    const { data: existingItems } = await supabase
      .from("evidence_items")
      .select("id, source, source_id, created_at")
      .eq("workspace_id", workspaceId);

    // Identify and prune any duplicate records already in DB
    const existingKeyToId = new Map<string, string>();
    const duplicateIdsToDelete: string[] = [];

    for (const item of existingItems || []) {
      if (!item.source_id) continue;
      const key = `${item.source}:${item.source_id}`;
      if (existingKeyToId.has(key)) {
        duplicateIdsToDelete.push(item.id);
      } else {
        existingKeyToId.set(key, item.id);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      await supabase
        .from("evidence_items")
        .delete()
        .in("id", duplicateIdsToDelete);
    }

    // Populate evidence items with attribution
    const syncVersion = "v1";
    const newEvidenceToInsert: any[] = [];

    for (const e of evidence) {
      const key = `${e.source}:${e.sourceId}`;
      // Skip if already in database
      if (existingKeyToId.has(key)) {
        continue;
      }

      const lowerUsername = (e.actorUsername || "").toLowerCase();
      const lowerEmail = (e.actorEmail || "").toLowerCase();

      const matchedUserId =
        usernameToUserId.get(lowerUsername) ||
        (lowerEmail ? emailToUserId.get(lowerEmail) : undefined) ||
        null;

      const isBot = Boolean(
        lowerUsername.includes("[bot]") ||
        lowerUsername.includes("bot") ||
        lowerUsername.includes("actions-user") ||
        lowerUsername.includes("dependabot") ||
        lowerUsername.includes("renovate")
      );

      newEvidenceToInsert.push({
        workspace_id: workspaceId,
        source: e.source,
        source_id: e.sourceId,
        source_url: e.sourceUrl,
        event_type: e.eventType,
        actor_id: matchedUserId,
        actor_username: e.actorUsername,
        actor_email: e.actorEmail || null,
        attribution_confidence: matchedUserId ? 1.0 : 0.5,
        mapping_status: matchedUserId ? "mapped" : "unmapped",
        timestamp: e.timestamp.toISOString(),
        summary: e.summary,
        description: e.description || null,
        category: e.category,
        work_type: e.workType,
        metadata: e.metadata,
        base_weight: e.baseWeight,
        impact_factor: 1.0,
        quality_factor: 1.0,
        duplication_factor: 1.0,
        calculated_value: e.baseWeight,
        sync_version: syncVersion,
        verification_state: "provider_verified",
        is_duplicate: false,
        is_bot_generated: isBot,
        is_excluded: isBot,
        exclusion_reason: isBot ? "Detected as automated bot activity" : null,
      });

      // Mark key as seen
      existingKeyToId.set(key, "pending");
    }

    // Insert only new distinct evidence items
    if (newEvidenceToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("evidence_items")
        .insert(newEvidenceToInsert);

      if (insertError) {
        console.error("Failed to insert evidence items:", insertError);
        throw insertError;
      }
    }

    // Update integration status and timestamp
    await supabase
      .from("integrations")
      .update({
        last_synced_at: new Date().toISOString(),
        sync_cursor: syncVersion,
        status: "active",
        error_message: null,
      })
      .eq("id", integration.id);

    // Audit log
    await supabase.from("audit_events").insert({
      actor_id: user.id,
      workspace_id: workspaceId,
      action: "integration.synced",
      object_type: "integration",
      object_id: integration.id,
      new_value: {
        newItemsCount: newEvidenceToInsert.length,
        totalItemsCount: evidence.length,
        syncVersion,
        repo: `${owner}/${repo}`,
      },
    });

    return NextResponse.json({
      synced: newEvidenceToInsert.length,
      total: evidence.length,
      syncVersion,
      message: `Sync complete. ${newEvidenceToInsert.length} new items synced (${evidence.length} total in repo).`,
    });

  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync repository" }, { status: 500 });
  }
}

