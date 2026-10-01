// lib/scoring/engine.ts
// Value of one item for one member:  V = B × I × A × Q × D
//   B base weight (by source), I impact (size / merged / review depth),
//   A attribution share, Q quality (verification), D duplication/bot filter
// Member score:  S_m = 100 × Σ_c(W_c × N_{m,c}) / Σ_j Σ_c(W_c × N_{j,c})
//   N_{m,c} = member's share of all value in category c, W_c = category weight

import type {
  ScoringInput,
  ScoringOutput,
  ScoringEvidenceItem,
  MemberResult,
  CategoryResult,
  ContributionCategory,
  ConfidenceLevel,
  EvidenceValue,
  ScoringMember,
} from "@/types";

// ============================================
// Base weights per source
// ============================================
const BASE_WEIGHTS: Record<string, number> = {
  github_commit: 1.0,
  github_pr: 2.5,
  github_issue: 1.5,
  github_review: 2.0,
  github_comment: 0.5,
  manual: 1.5,
  csv_import: 1.0,
  task: 2.0,
};

function calculateImpactFactor(item: ScoringEvidenceItem): number {
  let impact = item.impactFactor ?? 1.0;
  const meta = item.metadata || {};
  const source = String(item.source).toLowerCase();

  if (source === "github_pr" && meta.merged === true) impact *= 1.3;
  if (source === "github_issue" && meta.state === "closed") impact *= 1.2;
  if (source === "github_review" && String(meta.reviewState || meta.state || "").toUpperCase() === "APPROVED") {
    impact *= 1.2;
  }

  // Cap so no single event dominates
  return Math.min(impact, 5.0);
}

function calculateQualityFactor(item: ScoringEvidenceItem): number {
  const state = String(item.verificationState || "").toLowerCase();
  switch (state) {
    case "provider_verified":
      return 1.0;
    case "collaborator_confirmed":
      return 0.9;
    case "manual_submitted":
      return 0.7;
    case "disputed":
      return 0.3;
    default:
      return 0.6;
  }
}

function calculateDuplicationFactor(item: ScoringEvidenceItem): number {
  if (item.isDuplicate || item.isBotGenerated || item.isExcluded) return 0.0;
  return item.duplicationFactor ?? 1.0;
}

/**
 * Who gets credit for an item.
 * - Explicit shares (task splits, "credit follows the task") win.
 * - Otherwise the author and any co-authors share it equally.
 */
function calculateAttributionShares(
  item: ScoringEvidenceItem
): { userId: string; share: number; confidence: number }[] {
  if (item.shares && item.shares.length > 0) {
    const positive = item.shares.filter((s) => s.userId && s.share > 0);
    const total = positive.reduce((sum, s) => sum + s.share, 0);
    if (total > 0) {
      return positive.map((s) => ({ userId: s.userId, share: s.share / total, confidence: 1.0 }));
    }
  }

  const ids = Array.from(
    new Set([item.actorId, ...(item.collaboratorIds || [])].filter((id): id is string => Boolean(id)))
  );
  if (ids.length === 0) return [];
  const confidence = item.attributionConfidence ?? 1.0;
  return ids.map((userId) => ({ userId, share: 1 / ids.length, confidence }));
}

function attributedUserIds(item: ScoringEvidenceItem): string[] {
  return calculateAttributionShares(item).map((s) => s.userId);
}

// ============================================
// Main scoring function
// ============================================
export function calculateContributionScores(input: ScoringInput): ScoringOutput {
  const { evidenceItems, categoryWeights } = input;
  const members = input.members.filter((m: ScoringMember) => Boolean(m.userId));

  const validationIssues: string[] = [];

  if (evidenceItems.length === 0) {
    validationIssues.push("No work found yet: no done tasks and no GitHub activity.");
  }

  const countable = evidenceItems.filter((e) => calculateDuplicationFactor(e) > 0);
  const unmappedItems = countable.filter((e) => attributedUserIds(e).length === 0);
  if (unmappedItems.length > 0) {
    validationIssues.push(`${unmappedItems.length} items aren't matched to any teammate, so they count for no one.`);
  }

  const membersWithNoEvidence = members.filter(
    (m) => !countable.some((e) => attributedUserIds(e).includes(m.userId))
  );
  if (membersWithNoEvidence.length > 0) {
    validationIssues.push(`${membersWithNoEvidence.length} members have no credited work.`);
  }

  // Step 1: per-item value for each credited member
  const evidenceValues = new Map<string, EvidenceValue>();
  const sharesByItem = new Map<string, { userId: string; share: number; confidence: number }[]>();

  evidenceItems.forEach((item) => {
    const srcKey = String(item.source).toLowerCase();
    const baseWeight = item.baseWeight ?? BASE_WEIGHTS[srcKey] ?? 1.0;
    const impactFactor = calculateImpactFactor(item);
    const qualityFactor = calculateQualityFactor(item);
    const duplicationFactor = calculateDuplicationFactor(item);
    const shares = calculateAttributionShares(item);
    sharesByItem.set(item.id, shares);

    shares.forEach(({ userId, share, confidence }) => {
      const value = baseWeight * impactFactor * share * confidence * qualityFactor * duplicationFactor;
      evidenceValues.set(`${item.id}:${userId}`, {
        baseWeight,
        impactFactor,
        attributionShare: share,
        attributionConfidence: confidence,
        qualityFactor,
        duplicationFactor,
        calculatedValue: value,
      });
    });
  });

  // Step 2: aggregate by member and category
  const memberCategoryValues = new Map<string, Map<ContributionCategory, number>>();
  const memberEvidenceCounts = new Map<string, Map<ContributionCategory, number>>();

  evidenceItems.forEach((item) => {
    (sharesByItem.get(item.id) || []).forEach(({ userId }) => {
      if (!memberCategoryValues.has(userId)) {
        memberCategoryValues.set(userId, new Map());
        memberEvidenceCounts.set(userId, new Map());
      }
      const catValues = memberCategoryValues.get(userId)!;
      const catCounts = memberEvidenceCounts.get(userId)!;
      const ev = evidenceValues.get(`${item.id}:${userId}`);
      if (ev && ev.calculatedValue > 0) {
        catValues.set(item.category, (catValues.get(item.category) || 0) + ev.calculatedValue);
        catCounts.set(item.category, (catCounts.get(item.category) || 0) + 1);
      }
    });
  });

  // Step 3: diminishing returns for very high-frequency activity
  memberCategoryValues.forEach((catMap, userId) => {
    catMap.forEach((value, category) => {
      const count = memberEvidenceCounts.get(userId)?.get(category) || 0;
      if (count > 50) {
        const capFactor = 1 + Math.log10(count / 50) * 0.1;
        catMap.set(category, value / capFactor);
      }
    });
  });

  // Step 4: normalize within each category
  const categoryTotals = new Map<ContributionCategory, number>();
  memberCategoryValues.forEach((catMap) => {
    catMap.forEach((value, category) => {
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + value);
    });
  });

  const normalizedMemberCategoryValues = new Map<string, Map<ContributionCategory, number>>();
  memberCategoryValues.forEach((catMap, userId) => {
    const normalized = new Map<ContributionCategory, number>();
    catMap.forEach((value, category) => {
      const total = categoryTotals.get(category) || 1;
      normalized.set(category, value / total);
    });
    normalizedMemberCategoryValues.set(userId, normalized);
  });

  // Step 5: weighted scores (only members count; non-members' shares are dropped)
  const memberWeightedScores = new Map<string, number>();
  let totalWeightedScore = 0;

  members.forEach((member) => {
    const normalizedCats = normalizedMemberCategoryValues.get(member.userId) || new Map();
    let weightedScore = 0;
    Object.entries(categoryWeights).forEach(([category, weight]) => {
      weightedScore += (Number(weight) || 0) * (normalizedCats.get(category as ContributionCategory) || 0);
    });
    memberWeightedScores.set(member.userId, weightedScore);
    totalWeightedScore += weightedScore;
  });

  // Step 6: percentages
  const memberResults: MemberResult[] = members.map((member) => {
    const weightedScore = memberWeightedScores.get(member.userId) || 0;
    const share =
      totalWeightedScore > 0
        ? Math.round((weightedScore / totalWeightedScore) * 10000) / 100
        : 0;

    const normalizedCats = normalizedMemberCategoryValues.get(member.userId) || new Map();
    const catCounts = memberEvidenceCounts.get(member.userId) || new Map();

    const categoryResults: CategoryResult[] = Object.keys(categoryWeights).map((category) => {
      const normValue = normalizedCats.get(category as ContributionCategory) || 0;
      const count = catCounts.get(category as ContributionCategory) || 0;
      return {
        category: category as ContributionCategory,
        normalizedValue: Math.round(normValue * 10000) / 10000,
        rawValue: Math.round(normValue * (categoryTotals.get(category as ContributionCategory) || 0) * 100) / 100,
        evidenceCount: count,
        confidence: count > 0 ? 1.0 : 0.0,
      };
    });

    const { confidenceLevel, confidenceReasons, evidenceCoverage } = calculateConfidence(
      member.userId,
      countable,
      categoryResults
    );

    const positiveContributors = evidenceItems
      .filter((e) => (sharesByItem.get(e.id) || []).some((s) => s.userId === member.userId))
      .map((e) => {
        const ev = evidenceValues.get(`${e.id}:${member.userId}`);
        return {
          evidenceId: e.id,
          description:
            e.summary || (e.metadata?.title as string) || `${String(e.source).replace("_", " ")} contribution`,
          impact: Math.round((ev?.calculatedValue || 0) * 100) / 100,
        };
      })
      .filter((c) => c.impact > 0)
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 5);

    const importantExclusions = evidenceItems
      .filter((e) => {
        const isRelevant = e.actorId === member.userId || (e.collaboratorIds || []).includes(member.userId);
        return isRelevant && (e.isExcluded || e.isDuplicate || e.isBotGenerated);
      })
      .map((e) => ({
        evidenceId: e.id,
        reason: e.isExcluded
          ? "Excluded by policy"
          : e.isDuplicate
          ? "Duplicate of another event"
          : "Detected as automated/bot activity",
      }));

    return {
      userId: member.userId,
      displayName: "", // filled by caller
      contributionShare: share,
      confidenceLevel,
      confidenceReasons,
      categoryResults,
      positiveContributors,
      importantExclusions,
      evidenceCoverage,
    };
  });

  // Make shares sum to exactly 100 (rounding drift goes to the largest share)
  const totalShare = memberResults.reduce((sum, m) => sum + m.contributionShare, 0);
  if (totalShare > 0 && Math.abs(totalShare - 100) > 0.001) {
    const largest = memberResults.reduce((a, b) => (b.contributionShare > a.contributionShare ? b : a));
    largest.contributionShare = Math.round((largest.contributionShare + (100 - totalShare)) * 100) / 100;
  }

  const overallConfidence = calculateOverallConfidence(memberResults, countable, unmappedItems.length);

  const coverageWarnings: string[] = [];
  const categoriesWithEvidence = new Set(countable.map((e) => e.category));
  Object.keys(categoryWeights).forEach((cat) => {
    if (!categoriesWithEvidence.has(cat as ContributionCategory)) {
      coverageWarnings.push(`No work recorded for category: ${cat.replace(/_/g, " ")}`);
    }
  });
  if (countable.length > 0 && unmappedItems.length > countable.length * 0.2) {
    coverageWarnings.push("More than 20% of activity isn't matched to a teammate.");
  }

  return {
    memberResults,
    overallConfidence,
    coverageWarnings,
    policyVersion: input.policyVersion,
    generatedAt: new Date(),
    validationIssues,
    scoringLogic: {
      formula: "S_m = 100 × Σ_c(W_c × N_{m,c}) / Σ_jΣ_c(W_c × N_{j,c})",
      categoryWeightsApplied: categoryWeights,
      totalEvidenceItems: evidenceItems.length,
      excludedItems: evidenceItems.filter((e) => e.isExcluded).length,
      botItems: evidenceItems.filter((e) => e.isBotGenerated).length,
    },
  };
}

// ============================================
// Confidence
// ============================================
function calculateConfidence(
  userId: string,
  evidenceItems: ScoringEvidenceItem[],
  categoryResults: CategoryResult[]
): { confidenceLevel: ConfidenceLevel; confidenceReasons: string[]; evidenceCoverage: number } {
  const reasons: string[] = [];

  const userEvidence = evidenceItems.filter((e) => attributedUserIds(e).includes(userId));
  const totalEvidence = evidenceItems.length;
  const evidenceCoverage = totalEvidence > 0 ? userEvidence.length / totalEvidence : 0;

  if (userEvidence.length === 0) {
    reasons.push("No credited work yet.");
  } else if (evidenceCoverage < 0.1) {
    reasons.push("Very few items are credited to this member.");
  }

  const lowConfidenceItems = userEvidence.filter((e) => (e.attributionConfidence ?? 1.0) < 0.95 && !e.shares);
  if (lowConfidenceItems.length > 0) {
    reasons.push(`${lowConfidenceItems.length} items were matched by a self-declared GitHub username.`);
  }

  const selfReported = userEvidence.filter((e) => String(e.verificationState).toLowerCase() === "manual_submitted");
  const verified = userEvidence.filter((e) => {
    const s = String(e.verificationState).toLowerCase();
    return s === "provider_verified" || s === "collaborator_confirmed";
  });
  if (selfReported.length > 0 && selfReported.length > verified.length) {
    reasons.push("Most of this member's work is self-reported (not linked to GitHub or confirmed by a teammate).");
  }

  const activeCategories = categoryResults.filter((c) => c.evidenceCount > 0).length;
  if (userEvidence.length > 0 && activeCategories === 0) {
    reasons.push("Credited work falls outside the configured categories.");
  }

  let level: ConfidenceLevel;
  if (reasons.length === 0) level = "HIGH";
  else if (userEvidence.length > 0 && reasons.length <= 1) level = "MEDIUM";
  else level = "LOW";

  return { confidenceLevel: level, confidenceReasons: reasons, evidenceCoverage };
}

function calculateOverallConfidence(
  memberResults: MemberResult[],
  evidenceItems: ScoringEvidenceItem[],
  unmappedCount: number
): ConfidenceLevel {
  const lowConfidenceMembers = memberResults.filter((m) => m.confidenceLevel === "LOW").length;
  const unmappedRatio = unmappedCount / Math.max(evidenceItems.length, 1);

  if (evidenceItems.length === 0 || lowConfidenceMembers > memberResults.length / 2 || unmappedRatio > 0.3) {
    return "LOW";
  }
  if (lowConfidenceMembers > 0 || unmappedRatio > 0.1) return "MEDIUM";
  return "HIGH";
}
