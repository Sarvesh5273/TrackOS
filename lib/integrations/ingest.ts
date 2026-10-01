// Shared by manual sync and the webhook: turns normalized GitHub events
// into evidence rows with members matched. Server only.

import type { ActorResolver } from "@/lib/identity";
import { isBotActor, resolveCoAuthors } from "@/lib/identity";
import type { NormalizedEvidence } from "@/lib/integrations/github";

export const GITHUB_SYNC_VERSION = "v1";

export function toEvidenceRow(workspaceId: string, e: NormalizedEvidence, resolve: ActorResolver) {
  const match = resolve(e.actorUsername, e.actorEmail);
  const isBot = isBotActor(e.actorUsername);
  const coAuthorIds = resolveCoAuthors(resolve, (e.metadata as any)?.coAuthors);

  return {
    workspace_id: workspaceId,
    source: e.source,
    source_id: e.sourceId,
    source_url: e.sourceUrl,
    event_type: e.eventType,
    actor_id: match?.userId || null,
    actor_username: e.actorUsername,
    actor_email: e.actorEmail || null,
    attribution_confidence: match ? match.confidence : 0.5,
    mapping_status: match || coAuthorIds.length > 0 ? "mapped" : "unmapped",
    timestamp: e.timestamp.toISOString(),
    summary: e.summary,
    description: e.description || null,
    category: e.category,
    work_type: e.workType,
    metadata: e.metadata,
    base_weight: e.baseWeight,
    impact_factor: e.impactFactor ?? 1.0,
    quality_factor: 1.0,
    duplication_factor: 1.0,
    calculated_value: e.baseWeight,
    sync_version: GITHUB_SYNC_VERSION,
    verification_state: "provider_verified",
    is_duplicate: false,
    is_bot_generated: isBot,
    is_excluded: isBot,
    exclusion_reason: isBot ? "Automated bot activity" : null,
  };
}

export type EvidenceRow = ReturnType<typeof toEvidenceRow>;
