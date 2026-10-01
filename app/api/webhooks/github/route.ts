// GitHub webhook: push, pull_request, pull_request_review.
// Requires GITHUB_WEBHOOK_SECRET (the same secret entered in GitHub's webhook settings).

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { GitHubSyncService, type NormalizedEvidence } from "@/lib/integrations/github";
import { GITHUB_SYNC_VERSION, toEvidenceRow } from "@/lib/integrations/ingest";
import { applyTaskAutomation } from "@/lib/integrations/taskAutomation";
import { createActorResolver, loadMemberIdentities } from "@/lib/identity";

export const dynamic = "force-dynamic";

function validSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "hex");
  const actual = Buffer.from(header.slice("sha256=".length), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret isn't configured on the server (GITHUB_WEBHOOK_SECRET)." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  if (!validSignature(rawBody, request.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventType = request.headers.get("x-github-event");
  if (eventType === "ping") return NextResponse.json({ message: "Webhook connected." });
  if (!eventType || !["push", "pull_request", "pull_request_review"].includes(eventType)) {
    return NextResponse.json({ message: `Ignored event: ${eventType || "unknown"}` });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const fullName = String(payload.repository?.full_name || "").toLowerCase();
  if (!fullName) return NextResponse.json({ error: "No repository in payload" }, { status: 400 });
  const [owner, repo] = fullName.split("/");

  try {
    const admin = createAdminClient();
    const { data: integrations, error } = await admin
      .from("integrations")
      .select("id, workspace_id, selected_resources")
      .eq("provider", "github")
      .eq("status", "active");
    if (error) throw error;

    const matching = (integrations || []).filter((i: any) => {
      const res = i.selected_resources || {};
      return String(res.fullName || res.repo || "").toLowerCase() === fullName;
    });
    if (matching.length === 0) return NextResponse.json({ message: "No project uses this repository." });

    const service = new GitHubSyncService();
    const events: NormalizedEvidence[] = [];

    if (eventType === "push" && Array.isArray(payload.commits)) {
      for (const commit of payload.commits) {
        const message = String(commit.message || "");
        const { category, workType, conventionalType } = service.classifyCommitMessage(message);
        events.push({
          source: "github_commit",
          sourceId: commit.id,
          sourceUrl: commit.url || `https://github.com/${fullName}/commit/${commit.id}`,
          eventType: "commit",
          actorUsername: commit.author?.username || commit.author?.name || "unknown",
          actorEmail: commit.author?.email || undefined,
          timestamp: new Date(commit.timestamp || Date.now()),
          summary: message.split("\n")[0].substring(0, 200) || "Git commit",
          description: message.substring(0, 5000),
          category,
          workType,
          metadata: {
            sha: commit.id,
            conventionalType,
            messageLength: message.length,
            coAuthors: service.extractCoAuthors(message),
            isMerge: false,
          },
          baseWeight: 1.0,
        });
      }
    } else if (eventType === "pull_request" && payload.pull_request) {
      events.push(service.normalizePullRequest(payload.pull_request, owner, repo));
    } else if (eventType === "pull_request_review" && payload.review && payload.pull_request) {
      if (payload.review.submitted_at) {
        events.push(
          service.normalizeReview(payload.review, payload.pull_request.number, payload.pull_request.html_url)
        );
      }
    }

    let processed = 0;
    for (const integration of matching) {
      const workspaceId = integration.workspace_id as string;
      const { data: workspace } = await admin
        .from("workspaces")
        .select("id, name, task_key, status")
        .eq("id", workspaceId)
        .maybeSingle();
      if (!workspace) continue;

      const resolve = createActorResolver(await loadMemberIdentities(admin, workspaceId));
      const rows = events.map((e) => toEvidenceRow(workspaceId, e, resolve));
      if (rows.length === 0) continue;

      // PRs update in place (e.g. when merged); commits/reviews are insert-once
      const { error: upsertError } = await admin.from("evidence_items").upsert(rows, {
        onConflict: "workspace_id,source,source_id,sync_version",
        ignoreDuplicates: eventType !== "pull_request",
      });
      if (upsertError) {
        console.error("Webhook upsert error:", upsertError.message);
        continue;
      }
      processed += rows.length;

      await applyTaskAutomation(
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
        null
      );

      await admin
        .from("integrations")
        .update({ last_synced_at: new Date().toISOString(), sync_cursor: GITHUB_SYNC_VERSION })
        .eq("id", integration.id);
    }

    return NextResponse.json({ success: true, event: eventType, processed });
  } catch (err) {
    console.error("GitHub webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
