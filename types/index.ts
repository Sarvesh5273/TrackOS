export type WorkspaceStatus = "draft" | "active" | "frozen" | "under_review" | "published" | "archived";
export type MembershipRole = "leader" | "member" | "reviewer";
export type EvidenceSource = "github_commit" | "github_pr" | "github_issue" | "github_review" | "github_comment" | "manual" | "csv_import";
export type ContributionCategory = "development" | "design" | "documentation_research" | "quality_testing" | "coordination_review" | "presentation_delivery";
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type DisputeState = "open" | "under_discussion" | "resolved" | "rejected" | "unresolved_at_publication";
export type WorkType = "created" | "review" | "coordination" | "presentation" | "original" | "collaboration";

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  project_type: string | null;
  start_date: string;
  end_date: string;
  timezone: string;
  categories: CategoryConfig[];
  review_window_hours: number;
  evidence_policy: string | null;
  status: WorkspaceStatus;
  policy_version: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryConfig {
  id: ContributionCategory;
  name: string;
  weight: number;
}

export interface Membership {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MembershipRole;
  declared_contribution_roles: string[];
  invitation_state: string;
  invitation_expires_at?: string | null;
  invitation_token?: string | null;
  joined_at: string;
  user: {
    id: string;
    email: string;
    raw_user_meta_data: { name?: string; avatar_url?: string; user_name?: string };
  };
}

export interface Integration {
  id: string;
  workspace_id: string;
  provider: string;
  status: "pending" | "active" | "error" | "revoked";
  selected_resources: {
    repo?: string;
    owner?: string;
    name?: string;
    fullName?: string;
    [key: string]: unknown;
  } | null;
  connected_by?: string;
  connected_at: string;
  last_synced_at: string | null;
  error_message: string | null;
  sync_cursor?: string | null;
  credential_ref?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceItem {
  id: string;
  workspace_id: string;
  source: EvidenceSource;
  source_id: string;
  source_url: string | null;
  event_type: string;
  actor_id: string | null;
  actor_username: string | null;
  actor_email?: string | null;
  attribution_confidence: number;
  mapping_status: string;
  timestamp: string;
  summary: string | null;
  description: string | null;
  category: ContributionCategory | null;
  classification_confidence: number | null;
  work_type: string | null;
  is_duplicate: boolean;
  is_bot_generated: boolean;
  is_excluded: boolean;
  exclusion_reason: string | null;
  is_sensitive: boolean;
  verification_state: string;
  base_weight: number;
  impact_factor: number;
  quality_factor: number;
  duplication_factor: number;
  calculated_value: number;
  metadata: Record<string, unknown> | null;
  sync_version?: string;
  created_at: string;
}

export interface ManualEvidence {
  id: string;
  workspace_id: string;
  submitted_by: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string | null;
  category: ContributionCategory;
  effort_band: "SMALL" | "MEDIUM" | "LARGE" | "EXTENSIVE" | string | null;
  work_type: WorkType | string;
  collaborator_ids: string[];
  artifact_url: string | null;
  confirmations?: Array<{ userId: string; confirmedAt: string }>;
  review_status: "pending" | "approved" | "clarification_requested" | string;
  clarification_reason?: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  workspace_id: string;
  version: number;
  status: "provisional" | "published";
  member_results: MemberResult[];
  overall_confidence: ConfidenceLevel;
  confidence_level?: ConfidenceLevel;
  coverage_score: number;
  limitations: string | null;
  scoring_logic: Record<string, unknown>;
  published_at: string | null;
  published_by?: string | null;
  created_at: string;
}

export interface MemberResult {
  userId: string;
  displayName: string;
  email: string;
  contributionShare: number;
  confidenceLevel: ConfidenceLevel;
  confidenceReasons: string[];
  categoryResults: CategoryResult[];
  positiveContributors: { evidenceId: string; description: string; impact: number }[];
  importantExclusions: { evidenceId: string; reason: string }[];
  evidenceCoverage: number;
}

export interface CategoryResult {
  category: ContributionCategory;
  normalizedValue: number;
  rawValue: number;
  evidenceCount: number;
  confidence: number;
}

export interface Dispute {
  id: string;
  workspace_id: string;
  created_by: string;
  type: string;
  target_id: string | null;
  reason: string;
  requested_change: string;
  state: DisputeState;
  responses: { userId: string; response: string; at: string }[] | null;
  resolution: string | null;
  resolution_rationale: string | null;
  resolved_by: string | null;
  created_at: string;
}

// ============================================
// Scoring Engine Interfaces
// ============================================
export interface ScoringEvidenceItem {
  id: string;
  source: EvidenceSource | string;
  category: ContributionCategory;
  actorId: string | null;
  collaboratorIds: string[];
  timestamp: Date;
  baseWeight?: number;
  impactFactor?: number;
  qualityFactor?: number;
  duplicationFactor?: number;
  attributionConfidence?: number;
  isDuplicate?: boolean;
  isBotGenerated?: boolean;
  isExcluded?: boolean;
  verificationState?: string;
  workType?: WorkType | string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface ScoringMember {
  userId: string;
  declaredRoles?: string[];
}

export interface ScoringInput {
  workspaceId: string;
  evidenceItems: ScoringEvidenceItem[];
  categoryWeights: Record<string, number>;
  members: ScoringMember[];
  policyVersion?: number;
}

export interface EvidenceValue {
  baseWeight: number;
  impactFactor: number;
  attributionShare: number;
  attributionConfidence: number;
  qualityFactor: number;
  duplicationFactor: number;
  calculatedValue: number;
}

export interface ScoringOutput {
  memberResults: MemberResult[];
  overallConfidence: ConfidenceLevel;
  coverageWarnings: string[];
  policyVersion?: number;
  generatedAt: Date;
  validationIssues: string[];
  scoringLogic: {
    formula: string;
    categoryWeightsApplied: Record<string, number>;
    totalEvidenceItems: number;
    excludedItems: number;
    botItems: number;
  };
}
