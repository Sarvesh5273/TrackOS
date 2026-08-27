// lib/scoring/engine.ts
// SRS Section 9.3: Conceptual Scoring Model
// V_{m,e,c} = B_e × I_e × A_{m,e} × Q_e × D_e
// S_m = 100 × Σ_c(W_c × N_{m,c}) / Σ_jΣ_c(W_c × N_{j,c})

import {
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
// Configuration: Base weights per evidence type
// ============================================
const BASE_WEIGHTS: Record<string, number> = {
  github_commit: 1.0,
  github_pr: 2.5,
  github_issue: 1.5,
  github_review: 2.0,
  github_comment: 0.5,
  manual: 1.5,
  csv_import: 1.0,
};

// Impact multipliers based on observable indicators
function calculateImpactFactor(item: ScoringEvidenceItem): number {
  let impact = item.impactFactor || 1.0;
  const meta = item.metadata || {};
  const source = String(item.source).toLowerCase();

  // PR merged = higher impact than PR closed
  if (source === "github_pr" && meta.merged === true) {
    impact *= 1.3;
  }

  // Issue closed with fix = higher impact
  if (source === "github_issue" && meta.state === "closed") {
    impact *= 1.2;
  }

  // Review approved = higher impact than comment
  if (source === "github_review" && (meta.reviewState === "APPROVED" || meta.state === "APPROVED")) {
    impact *= 1.2;
  }

  // FR-AI-04: Cap impact to prevent any single event from dominating
  return Math.min(impact, 5.0);
}

// Quality factor based on verification state
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

// Duplication/spam control (FR-AI-11, FR-EVD-08)
function calculateDuplicationFactor(item: ScoringEvidenceItem): number {
  if (item.isDuplicate) return 0.0;
  if (item.isBotGenerated) return 0.0;
  if (item.isExcluded) return 0.0;

  return item.duplicationFactor || 1.0;
}

// Attribution share: how much credit does each member get?
function calculateAttributionShares(
  item: ScoringEvidenceItem
): { userId: string; share: number; confidence: number }[] {
  const shares: { userId: string; share: number; confidence: number }[] = [];
  const collabs = item.collaboratorIds || [];

  // Primary actor
  if (item.actorId) {
    shares.push({
      userId: item.actorId,
      share: collabs.length > 0 ? 0.6 : 1.0,
      confidence: item.attributionConfidence || 1.0,
    });
  }

  // Collaborators (FR-AI-06: shared credit, not multiplied full credit)
  collabs.forEach((collabId: string) => {
    if (collabId && collabId !== item.actorId) {
      shares.push({
        userId: collabId,
        share: 0.4 / collabs.length,
        confidence: 0.85, // collaborator confidence
      });
    }
  });

  return shares;
}

// ============================================
// Main Scoring Function
// ============================================
export function calculateContributionScores(input: ScoringInput): ScoringOutput {
  const { evidenceItems, categoryWeights, members } = input;

  // FR-AI-13: Validation checks
  const validationIssues: string[] = [];

  if (evidenceItems.length === 0) {
    validationIssues.push("No evidence items found for scoring.");
  }

  const unmappedItems = evidenceItems.filter((e: ScoringEvidenceItem) => !e.actorId && (e.collaboratorIds || []).length === 0);
  if (unmappedItems.length > 0) {
    validationIssues.push(`${unmappedItems.length} evidence items have no attribution.`);
  }

  const membersWithNoEvidence = members.filter((m: ScoringMember) => {
    return !evidenceItems.some(
      (e: ScoringEvidenceItem) => e.actorId === m.userId || (e.collaboratorIds || []).includes(m.userId)
    );
  });
  if (membersWithNoEvidence.length > 0) {
    validationIssues.push(
      `${membersWithNoEvidence.length} members have no attributed evidence.`
    );
  }

  // Step 1: Calculate per-evidence values
  const evidenceValues = new Map<string, EvidenceValue>();

  evidenceItems.forEach((item: ScoringEvidenceItem) => {
    const srcKey = String(item.source).toLowerCase();
    const baseWeight = BASE_WEIGHTS[srcKey] || item.baseWeight || 1.0;
    const impactFactor = calculateImpactFactor(item);
    const qualityFactor = calculateQualityFactor(item);
    const duplicationFactor = calculateDuplicationFactor(item);

    // For each member attributed to this evidence
    const shares = calculateAttributionShares(item);

    shares.forEach(({ userId, share, confidence }) => {
      const key = `${item.id}:${userId}`;
      const value = baseWeight * impactFactor * share * confidence * qualityFactor * duplicationFactor;

      evidenceValues.set(key, {
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

  // Step 2: Aggregate by member and category
  const memberCategoryValues = new Map<string, Map<ContributionCategory, number>>();
  const memberEvidenceCounts = new Map<string, Map<ContributionCategory, number>>();

  evidenceItems.forEach((item: ScoringEvidenceItem) => {
    const shares = calculateAttributionShares(item);
    shares.forEach(({ userId }) => {
      if (!memberCategoryValues.has(userId)) {
        memberCategoryValues.set(userId, new Map());
        memberEvidenceCounts.set(userId, new Map());
      }

      const catValues = memberCategoryValues.get(userId)!;
      const catCounts = memberEvidenceCounts.get(userId)!;

      const currentValue = catValues.get(item.category) || 0;
      const currentCount = catCounts.get(item.category) || 0;

      const key = `${item.id}:${userId}`;
      const ev = evidenceValues.get(key);
      if (ev) {
        catValues.set(item.category, currentValue + ev.calculatedValue);
        catCounts.set(item.category, currentCount + 1);
      }
    });
  });

  // Step 3: Apply diminishing returns per member per category (FR-AI-06)
  // High-frequency low-impact activity gets capped
  memberCategoryValues.forEach((catMap, userId) => {
    catMap.forEach((value, category) => {
      const count = memberEvidenceCounts.get(userId)?.get(category) || 0;
      if (count > 50) {
        // Logarithmic cap after 50 items
        const capFactor = 1 + Math.log10(count / 50) * 0.1;
        catMap.set(category, value / capFactor);
      }
    });
  });

  // Step 4: Normalize category values within team
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

  // Step 5: Calculate weighted scores
  // S_m = 100 × Σ_c(W_c × N_{m,c}) / Σ_jΣ_c(W_c × N_{j,c})
  const memberWeightedScores = new Map<string, number>();
  let totalWeightedScore = 0;

  members.forEach((member: ScoringMember) => {
    const normalizedCats = normalizedMemberCategoryValues.get(member.userId) || new Map();
    let weightedScore = 0;

    Object.entries(categoryWeights).forEach(([category, weight]) => {
      const normValue = normalizedCats.get(category as ContributionCategory) || 0;
      weightedScore += (Number(weight) || 0) * normValue;
    });

    memberWeightedScores.set(member.userId, weightedScore);
    totalWeightedScore += weightedScore;
  });

  // Step 6: Convert to percentages
  const memberResults: MemberResult[] = members.map((member: ScoringMember) => {
    const weightedScore = memberWeightedScores.get(member.userId) || 0;
    const share = totalWeightedScore > 0 
      ? Math.round((weightedScore / totalWeightedScore) * 10000) / 100 
      : members.length > 0 
        ? Math.round((100 / members.length) * 100) / 100 
        : 0;

    // Category breakdown
    const normalizedCats = normalizedMemberCategoryValues.get(member.userId) || new Map();
    const catCounts = memberEvidenceCounts.get(member.userId) || new Map();

    const categoryResults: CategoryResult[] = Object.entries(categoryWeights).map(
      ([category, _weight]) => {
        const normValue = normalizedCats.get(category as ContributionCategory) || 0;
        const count = catCounts.get(category as ContributionCategory) || 0;
        return {
          category: category as ContributionCategory,
          normalizedValue: Math.round(normValue * 10000) / 10000,
          rawValue: Math.round((normValue * (categoryTotals.get(category as ContributionCategory) || 0)) * 100) / 100,
          evidenceCount: count,
          confidence: count > 0 ? 1.0 : 0.0,
        };
      }
    );

    // Confidence calculation (SRS 9.4)
    const { confidenceLevel, confidenceReasons, evidenceCoverage } = calculateConfidence(
      member.userId,
      evidenceItems,
      categoryResults,
      members.length
    );

    // Explainability: positive contributors
    const positiveContributors = evidenceItems
      .filter((e: ScoringEvidenceItem) => {
        const shares = calculateAttributionShares(e);
        return shares.some((s) => s.userId === member.userId);
      })
      .map((e: ScoringEvidenceItem) => {
        const key = `${e.id}:${member.userId}`;
        const ev = evidenceValues.get(key);
        return {
          evidenceId: e.id,
          description: `${e.source} — ${e.workType || "contribution"}`,
          impact: ev?.calculatedValue || 0,
        };
      })
      .sort((a: { impact: number }, b: { impact: number }) => b.impact - a.impact)
      .slice(0, 5);

    // Important exclusions
    const importantExclusions = evidenceItems
      .filter((e: ScoringEvidenceItem) => {
        const isRelevant = e.actorId === member.userId || (e.collaboratorIds || []).includes(member.userId);
        return isRelevant && (e.isExcluded || e.isDuplicate || e.isBotGenerated);
      })
      .map((e: ScoringEvidenceItem) => ({
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
      email: "",
      contributionShare: share,
      confidenceLevel,
      confidenceReasons,
      categoryResults,
      positiveContributors,
      importantExclusions,
      evidenceCoverage,
    };
  });

  // Ensure shares sum to 100% (BR-03)
  const totalShare = memberResults.reduce((sum, m) => sum + m.contributionShare, 0);
  if (totalShare > 0 && Math.abs(totalShare - 100) > 0.01) {
    const adjustment = (100 - totalShare) / memberResults.length;
    memberResults.forEach((m) => {
      m.contributionShare = Math.round((m.contributionShare + adjustment) * 100) / 100;
    });
  }

  // Overall confidence
  const overallConfidence = calculateOverallConfidence(memberResults, evidenceItems, members.length);

  // Coverage warnings
  const coverageWarnings: string[] = [];
  const categoriesWithEvidence = new Set(evidenceItems.map((e: ScoringEvidenceItem) => e.category));
  Object.keys(categoryWeights).forEach((cat) => {
    if (!categoriesWithEvidence.has(cat as ContributionCategory)) {
      coverageWarnings.push(`No evidence found for category: ${cat}`);
    }
  });

  if (unmappedItems.length > evidenceItems.length * 0.2) {
    coverageWarnings.push("More than 20% of evidence has ambiguous attribution.");
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
      excludedItems: evidenceItems.filter((e: ScoringEvidenceItem) => e.isExcluded).length,
      botItems: evidenceItems.filter((e: ScoringEvidenceItem) => e.isBotGenerated).length,
    },
  };
}

// ============================================
// Confidence Calculation (SRS 9.4)
// ============================================
function calculateConfidence(
  userId: string,
  evidenceItems: ScoringEvidenceItem[],
  categoryResults: CategoryResult[],
  totalMembers: number
): { confidenceLevel: ConfidenceLevel; confidenceReasons: string[]; evidenceCoverage: number } {
  const reasons: string[] = [];

  const userEvidence = evidenceItems.filter(
    (e) => e.actorId === userId || (e.collaboratorIds || []).includes(userId)
  );

  const totalEvidence = evidenceItems.length;
  const evidenceCoverage = totalEvidence > 0 ? userEvidence.length / totalEvidence : 0;

  // Coverage check
  if (evidenceCoverage < 0.1) {
    reasons.push("Very few evidence items attributed to this member.");
  }

  // Attribution confidence
  const lowConfidenceItems = userEvidence.filter((e) => (e.attributionConfidence || 1.0) < 0.8);
  if (lowConfidenceItems.length > 0) {
    reasons.push(`${lowConfidenceItems.length} items have low attribution confidence.`);
  }

  // Manual vs verified ratio
  const manualItems = userEvidence.filter((e) => String(e.source).toLowerCase() === "manual");
  const verifiedItems = userEvidence.filter((e) => String(e.verificationState).toLowerCase() === "provider_verified");
  if (manualItems.length > verifiedItems.length * 2) {
    reasons.push("Most evidence is manually submitted without provider verification.");
  }

  // Category coverage
  const activeCategories = categoryResults.filter((c) => c.evidenceCount > 0).length;
  const totalCategories = categoryResults.length;
  if (activeCategories < totalCategories / 2) {
    reasons.push("Evidence covers fewer than half of configured categories.");
  }

  // Determine level
  let level: ConfidenceLevel;
  if (reasons.length === 0 && evidenceCoverage > 0.15) {
    level = "HIGH";
  } else if (reasons.length <= 2 && evidenceCoverage > 0.05) {
    level = "MEDIUM";
  } else {
    level = "LOW";
  }

  return { confidenceLevel: level, confidenceReasons: reasons, evidenceCoverage };
}

function calculateOverallConfidence(
  memberResults: MemberResult[],
  evidenceItems: ScoringEvidenceItem[],
  totalMembers: number
): ConfidenceLevel {
  const lowConfidenceMembers = memberResults.filter((m) => m.confidenceLevel === "LOW").length;
  const unmappedRatio = evidenceItems.filter((e) => !e.actorId).length / Math.max(evidenceItems.length, 1);

  if (lowConfidenceMembers > totalMembers / 2 || unmappedRatio > 0.3) {
    return "LOW";
  }
  if (lowConfidenceMembers > 0 || unmappedRatio > 0.1) {
    return "MEDIUM";
  }
  return "HIGH";
}

