export type WorkspaceStatus = "draft" | "active" | "frozen" | "under_review" | "published" | "archived";
export type MembershipRole = "leader" | "member" | "reviewer";
export type EvidenceSource = "github_commit" | "github_pr" | "github_issue" | "github_review" | "manual" | "csv_import";
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
  joined_at: string;
  user: {
    id: string;
    email: string;
    raw_user_meta_data: { name?: string; avatar_url?: string; user_name?: string };
  };
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
  effort_band: string | null;
  work_type: string;
  collaborator_ids: string[];
  artifact_url: string | null;
  review_status: string;
  created_at: string;
}

export interface Report {
  id: string;
  workspace_id: string;
  version: number;
  status: "provisional" | "published";
  member_results: MemberResult[];
  confidence_level: ConfidenceLevel;
  coverage_score: number;
  limitations: string | null;
  scoring_logic: Record<string, unknown>;
  published_at: string | null;
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
