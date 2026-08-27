import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GitHubSyncService } from "@/lib/integrations/github";
import { createHmac } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const eventType = request.headers.get("x-github-event");
    const signature = request.headers.get("x-hub-signature-256");
    const rawBody = await request.text();

    if (!eventType) {
      return NextResponse.json({ error: "Missing x-github-event header" }, { status: 400 });
    }

    // Ping event test from GitHub webhook settings
    if (eventType === "ping") {
      return NextResponse.json({ message: "Pong! Webhook successfully configured." }, { status: 200 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const repoFullName = payload.repository?.full_name?.toLowerCase();
    if (!repoFullName) {
      return NextResponse.json({ error: "No repository information in payload" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Find integration matching repository
    const { data: integrations, error: intError } = await admin
      .from("integrations")
      .select("id, workspace_id, selected_resources, credential_ref")
      .eq("provider", "github")
      .eq("status", "active");

    if (intError || !integrations || integrations.length === 0) {
      return NextResponse.json({ message: "No active integrations found" }, { status: 200 });
    }

    // Match integration with repository
    const matchingIntegrations = integrations.filter((int: any) => {
      const res = int.selected_resources;
      if (!res) return false;
      const resRepo = (res.fullName || res.repo || "").toLowerCase();
      return (
        resRepo === repoFullName ||
        resRepo.endsWith(`/${repoFullName}`) ||
        repoFullName.endsWith(resRepo)
      );
    });

    if (matchingIntegrations.length === 0) {
      return NextResponse.json({ message: "No matching workspace for this repository" }, { status: 200 });
    }

    const syncService = new GitHubSyncService();
    let processedCount = 0;

    for (const integration of matchingIntegrations) {
      const workspaceId = integration.workspace_id;
      const newItems: any[] = [];

      // 1. Process PUSH event (commits)
      if (eventType === "push" && Array.isArray(payload.commits)) {
        for (const commit of payload.commits) {
          const message = commit.message || "";
          const coAuthors = syncService.extractCoAuthors(message);
          const firstLine = message.split("\n")[0];
          const summary = firstLine.length > 200 ? firstLine.substring(0, 197) + "..." : firstLine;
          const { category, workType, conventionalType } = syncService.classifyCommitMessage(firstLine);

          let baseWeight = 1.0;
          if (conventionalType === "feat") baseWeight = 1.4;
          else if (conventionalType === "fix") baseWeight = 1.3;
          else if (conventionalType === "refactor") baseWeight = 1.2;
          else if (conventionalType === "chore" || conventionalType === "style") baseWeight = 0.8;

          newItems.push({
            workspace_id: workspaceId,
            source: "github_commit",
            source_id: commit.id,
            source_url: commit.url || `https://github.com/${repoFullName}/commit/${commit.id}`,
            event_type: "commit",
            actor_username: commit.author?.username || commit.author?.name || "unknown",
            actor_email: commit.author?.email,
            collaborator_usernames: coAuthors,
            timestamp: new Date(commit.timestamp || Date.now()).toISOString(),
            summary: summary || "Git commit",
            description: message,
            category,
            work_type: workType,
            metadata: {
              sha: commit.id,
              conventionalType,
              messageLength: message.length,
              coAuthors,
              addedCount: commit.added?.length || 0,
              modifiedCount: commit.modified?.length || 0,
              removedCount: commit.removed?.length || 0,
            },
            base_weight: baseWeight,
            impact_factor: 1.0,
            quality_factor: 1.0,
            confidence_factor: 1.0,
            verification_state: "provider_verified",
          });
        }
      }

      // 2. Process PULL_REQUEST event
      else if (eventType === "pull_request" && payload.pull_request) {
        const pr = payload.pull_request;
        const isMerged = Boolean(pr.merged_at || payload.action === "closed" && pr.merged);
        const { category } = syncService.classifyCommitMessage(pr.title);

        newItems.push({
          workspace_id: workspaceId,
          source: "github_pr",
          source_id: String(pr.id || pr.number),
          source_url: pr.html_url,
          event_type: "pull_request",
          actor_username: pr.user?.login || "unknown",
          timestamp: new Date(pr.created_at || Date.now()).toISOString(),
          summary: pr.title.substring(0, 200),
          description: pr.body || undefined,
          category,
          work_type: isMerged ? "created" : "review",
          metadata: {
            prNumber: pr.number,
            state: pr.state,
            merged: isMerged,
            mergedAt: pr.merged_at,
            action: payload.action,
          },
          base_weight: 2.5,
          impact_factor: isMerged ? 1.5 : 1.0,
          quality_factor: 1.0,
          confidence_factor: 1.0,
          verification_state: "provider_verified",
        });
      }

      // 3. Process PULL_REQUEST_REVIEW event
      else if (eventType === "pull_request_review" && payload.review) {
        const review = payload.review;
        const pr = payload.pull_request;
        const body = (review.body || "").trim();
        const isSubstantive = body.length > 80 || body.includes("```") || body.includes("`");
        const isChangesRequested = review.state === "changes_requested" || review.state === "CHANGES_REQUESTED";

        let baseWeight = 1.5;
        let impactFactor = 1.0;
        if (isChangesRequested) {
          baseWeight = 2.5;
          impactFactor = 2.0;
        } else if (isSubstantive) {
          baseWeight = 2.0;
          impactFactor = 1.4;
        } else if (body.toLowerCase() === "lgtm" || body.length < 10) {
          baseWeight = 0.8;
          impactFactor = 0.6;
        }

        newItems.push({
          workspace_id: workspaceId,
          source: "github_review",
          source_id: String(review.id),
          source_url: review.html_url || pr?.html_url,
          event_type: "pr_review",
          actor_username: review.user?.login || "unknown",
          timestamp: new Date(review.submitted_at || Date.now()).toISOString(),
          summary: isChangesRequested
            ? `Requested changes on PR #${pr?.number || ""}`
            : isSubstantive
            ? `In-depth code review on PR #${pr?.number || ""}`
            : `Reviewed PR #${pr?.number || ""} (${review.state})`,
          description: body || undefined,
          category: "coordination_review",
          work_type: "review",
          metadata: {
            prNumber: pr?.number,
            reviewState: review.state,
            isSubstantive,
            feedbackLength: body.length,
          },
          base_weight: baseWeight,
          impact_factor: impactFactor,
          quality_factor: 1.0,
          confidence_factor: 1.0,
          verification_state: "provider_verified",
        });
      }

      // Upsert new items to Supabase
      if (newItems.length > 0) {
        const { error: upsertError } = await admin.from("evidence_items").upsert(newItems, {
          onConflict: "workspace_id,source,source_id",
          ignoreDuplicates: false,
        });

        if (!upsertError) {
          processedCount += newItems.length;
        } else {
          console.error("Webhook upsert error:", upsertError);
        }
      }

      // Update last_synced_at
      await admin
        .from("integrations")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", integration.id);
    }

    return NextResponse.json({
      success: true,
      event: eventType,
      processed: processedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("GitHub webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
