import type { EvidenceItem } from "@/types";

export interface ContributorBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const ALL_BADGES: Record<string, ContributorBadge> = {
  feature_architect: {
    id: "feature_architect",
    name: "Feature Architect",
    description: "Built and delivered core system features and capabilities.",
    icon: "⚡",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-200",
  },
  code_guardian: {
    id: "code_guardian",
    name: "Code Guardian",
    description: "Provided in-depth code inspections and architecture reviews.",
    icon: "🛡️",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-200",
  },
  bug_slayer: {
    id: "bug_slayer",
    name: "Bug Slayer",
    description: "Squashed critical bugs and improved software stability.",
    icon: "🎯",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-200",
  },
  design_maestro: {
    id: "design_maestro",
    name: "Design Maestro",
    description: "Crafted UI/UX design systems and visual deliverables.",
    icon: "🎨",
    color: "text-pink-700",
    bgColor: "bg-pink-100",
    borderColor: "border-pink-200",
  },
  consensus_pillar: {
    id: "consensus_pillar",
    name: "Consensus Pillar",
    description: "Vouched for teammates and contributed to peer consensus.",
    icon: "🤝",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-200",
  },
  pace_setter: {
    id: "pace_setter",
    name: "Pace Setter",
    description: "Set early project momentum with swift initial deliverables.",
    icon: "🚀",
    color: "text-coral-700",
    bgColor: "bg-coral-100",
    borderColor: "border-coral-200",
  },
};

/**
 * Calculates earned achievement badges for a contributor based on their verified evidence items.
 */
export function calculateContributorBadges(
  userIdOrUsername: string,
  userEmail: string | undefined,
  evidence: EvidenceItem[]
): ContributorBadge[] {
  const earned: ContributorBadge[] = [];
  if (!evidence || evidence.length === 0) return earned;

  // Filter evidence attributed to this contributor
  const userEvidence = evidence.filter((item: any) => {
    const actorId = item.actor_id || "";
    const actorUser = (item.actor_username || "").toLowerCase();
    const target = userIdOrUsername.toLowerCase();
    const email = (userEmail || "").toLowerCase();
    const coAuthors: string[] = item.collaborator_usernames || item.metadata?.coAuthors || [];

    return (
      actorId === userIdOrUsername ||
      actorUser === target ||
      (email && item.actor_email?.toLowerCase() === email) ||
      coAuthors.some((u: string) => (u || "").toLowerCase() === target)
    );
  });

  if (userEvidence.length === 0) return earned;

  let featCount = 0;
  let reviewCount = 0;
  let fixCount = 0;
  let designCount = 0;
  let cosignedCount = 0;

  for (const item of userEvidence) {
    const rawItem = item as any;
    const summary = (item.summary || "").toLowerCase();
    const meta = (item.metadata || {}) as any;
    const coAuthors: string[] = rawItem.collaborator_usernames || meta.coAuthors || [];

    if (meta.conventionalType === "feat" || summary.startsWith("feat") || item.source === "github_pr") {
      featCount++;
    }
    if (item.source === "github_review" || item.work_type === "review" || item.category === "coordination_review") {
      reviewCount++;
    }
    if (meta.conventionalType === "fix" || summary.startsWith("fix") || summary.includes("bug")) {
      fixCount++;
    }
    if (item.category === "design" || summary.includes("figma") || summary.includes("ui") || summary.includes("ux")) {
      designCount++;
    }
    if (item.verification_state === "collaborator_confirmed" || coAuthors.length > 0) {
      cosignedCount++;
    }
  }

  if (featCount >= 1) earned.push(ALL_BADGES.feature_architect);
  if (reviewCount >= 1) earned.push(ALL_BADGES.code_guardian);
  if (fixCount >= 1) earned.push(ALL_BADGES.bug_slayer);
  if (designCount >= 1) earned.push(ALL_BADGES.design_maestro);
  if (cosignedCount >= 1) earned.push(ALL_BADGES.consensus_pillar);
  if (userEvidence.length >= 2) earned.push(ALL_BADGES.pace_setter);

  return earned;
}
