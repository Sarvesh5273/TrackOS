// Shapes stored in reports.scoring_logic (safe to import in the browser).

import type { ContributionCategory, TaskSize } from "@/types";

export interface SnapshotTask {
  id: string;
  ref: string;
  title: string;
  category: ContributionCategory;
  size: TaskSize;
  points: number;
  assignees: { userId: string; name: string; share: number }[];
  completedAt: string | null;
  verified: boolean;
  verification: "github" | "teammate" | "self_reported";
  linkedCount: number;
}

export interface IntegrityCheck {
  id: "attribution" | "self_reported" | "timing" | "balance" | "inactive";
  label: string;
  status: "ok" | "warn" | "info";
  detail: string;
}

export interface ReportSummary {
  text: string;
  aiAssisted: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface ReportScoringLogic {
  formula?: string;
  categoryWeightsApplied?: Record<string, number>;
  totalEvidenceItems?: number;
  excludedItems?: number;
  botItems?: number;
  rules?: string[];
  taskKey?: string;
  tasks?: SnapshotTask[];
  integrity?: IntegrityCheck[];
  counts?: {
    githubItems: number;
    doneTasks: number;
    openTasks: number;
    unattributedItems: number;
    manualItems: number;
  };
  period?: { start: string | null; end: string | null };
  generatedBy?: string;
  summary?: ReportSummary | null;
  /** Review issues still open when the report was published */
  openIssues?: {
    type: string;
    reason: string;
    requestedChange: string;
    raisedBy: string;
    raisedAt: string;
  }[];
  seal?: {
    algorithm: string;
    version?: 2;
    contentHash: string;
    signature: string;
    sealedAt: string;
  };
}

export const CREDIT_RULES: string[] = [
  "A done task is worth its size (Small 1, Medium 2, Large 3), split between the people on it. Equal by default.",
  "Tasks linked to GitHub activity or confirmed by a teammate count fully. Self-reported tasks count at 70%.",
  "Commits, pull requests and reviews count for their author. Co-authored commits are shared equally.",
  "Commits and PRs that mention a task are shared the same way as the task when the author is on it.",
  "Each type of work has a weight, so design, docs and presentation work are recognized, not just code.",
  "Activity that can't be matched to a teammate, bots and duplicates count for no one.",
];
