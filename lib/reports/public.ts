// Public reports are projections of the signed private snapshot. Never return
// raw evidence descriptions, private repository activity or arbitrary JSON keys.

import type { ReportScoringLogic } from "./types";

export interface PublicEvidence {
  id: string;
  source: string;
  source_url: string | null;
  summary: string | null;
  timestamp: string;
  is_sensitive: boolean;
  is_excluded: boolean;
  is_duplicate: boolean;
  is_bot_generated: boolean;
}

function publicGithubUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function publicHighlights(evidence: PublicEvidence[], publicRepo: boolean) {
  if (!publicRepo) return [];
  return evidence.flatMap((item) => {
    const url = publicGithubUrl(item.source_url);
    if (
      !item.source.startsWith("github_") ||
      !url ||
      item.is_sensitive ||
      item.is_excluded ||
      item.is_duplicate ||
      item.is_bot_generated
    ) return [];
    return [{ id: item.id, source: item.source, url, summary: item.summary, timestamp: item.timestamp }];
  });
}

export function publicMemberResults(
  results: Record<string, any>[],
  logic: ReportScoringLogic,
  highlights: ReturnType<typeof publicHighlights>
) {
  const byId = new Map(highlights.map((item) => [item.id, item] as const));
  const taskNames = new Map((logic.tasks || []).map((task) => [`task:${task.id}`, task.title] as const));

  return results.map((member) => ({
    userId: member.userId,
    displayName:
      typeof member.displayName === "string" && !member.displayName.includes("@")
        ? member.displayName
        : "Teammate",
    avatarUrl: member.avatarUrl || "",
    githubLogin: member.githubLogin || null,
    contributionShare: member.contributionShare,
    confidenceLevel: member.confidenceLevel,
    confidenceReasons: member.confidenceReasons || [],
    categoryResults: member.categoryResults || [],
    evidenceCoverage: member.evidenceCoverage,
    tasksDone: member.tasksDone,
    taskPoints: member.taskPoints,
    importantExclusions: member.importantExclusions || [],
    positiveContributors: (member.positiveContributors || []).map((contribution: any) => ({
      evidenceId: contribution.evidenceId,
      impact: contribution.impact,
      description: taskNames.get(contribution.evidenceId) ||
        byId.get(contribution.evidenceId)?.summary ||
        (String(contribution.evidenceId).startsWith("task:") ? "Completed task" : "Activity details hidden"),
    })),
  }));
}

export function publicScoringLogic(logic: ReportScoringLogic): ReportScoringLogic {
  return {
    formula: logic.formula,
    categoryWeightsApplied: logic.categoryWeightsApplied,
    totalEvidenceItems: logic.totalEvidenceItems,
    excludedItems: logic.excludedItems,
    botItems: logic.botItems,
    rules: logic.rules,
    taskKey: logic.taskKey,
    tasks: logic.tasks,
    integrity: logic.integrity,
    counts: logic.counts,
    period: logic.period,
    summary: logic.summary,
    openIssues: logic.openIssues,
  };
}
