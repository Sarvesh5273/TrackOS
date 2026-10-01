// Pure task helpers shared by the browser and the server.

import type { ContributionCategory, Task, TaskSize, TaskStatus } from "@/types";

export const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export const TASK_SIZES: TaskSize[] = ["S", "M", "L"];

export const SIZE_POINTS: Record<TaskSize, number> = { S: 1, M: 2, L: 3 };

export const SIZE_LABELS: Record<TaskSize, string> = {
  S: "Small",
  M: "Medium",
  L: "Large",
};

export const CATEGORY_IDS: ContributionCategory[] = [
  "development",
  "design",
  "documentation_research",
  "quality_testing",
  "coordination_review",
  "presentation_delivery",
];

export const CATEGORY_LABELS: Record<ContributionCategory, string> = {
  development: "Development",
  design: "Design",
  documentation_research: "Docs & research",
  quality_testing: "Testing & QA",
  coordination_review: "Coordination",
  presentation_delivery: "Presentation",
};

/** Tailwind classes for a small category dot. */
export const CATEGORY_DOT: Record<ContributionCategory, string> = {
  development: "bg-blue-400",
  design: "bg-pink-400",
  documentation_research: "bg-amber-400",
  quality_testing: "bg-emerald-400",
  coordination_review: "bg-purple-400",
  presentation_delivery: "bg-orange-400",
};

export const DEFAULT_CATEGORY_WEIGHTS: { id: ContributionCategory; name: string; weight: number }[] = [
  { id: "development", name: "Development", weight: 0.3 },
  { id: "design", name: "Design", weight: 0.2 },
  { id: "documentation_research", name: "Documentation & Research", weight: 0.15 },
  { id: "quality_testing", name: "Quality & Testing", weight: 0.15 },
  { id: "coordination_review", name: "Coordination & Review", weight: 0.1 },
  { id: "presentation_delivery", name: "Presentation & Delivery", weight: 0.1 },
];

// ============================================
// Task keys (e.g. PAY-12)
// ============================================
export const TASK_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,5}$/;

/** "Payment App Backend" -> "PAB", "Hackathon" -> "HAC" */
export function deriveTaskKey(name: string): string {
  const words = (name || "").toUpperCase().match(/[A-Z0-9]+/g) || [];
  const lettersOnly = words.map((w) => w.replace(/[^A-Z]/g, "")).filter(Boolean);
  let key = "";
  if (lettersOnly.length >= 2) {
    key = lettersOnly
      .slice(0, 4)
      .map((w) => w[0])
      .join("");
  } else if (lettersOnly.length === 1) {
    key = lettersOnly[0].slice(0, 3);
  }
  if (key.length < 2) key = (key + "TT").slice(0, 2);
  return TASK_KEY_PATTERN.test(key) ? key : "TT";
}

export function taskKeyOf(workspace: { task_key?: string | null; name?: string | null }): string {
  const key = (workspace.task_key || "").toUpperCase();
  return TASK_KEY_PATTERN.test(key) ? key : deriveTaskKey(workspace.name || "");
}

export function formatTaskRef(key: string, number: number): string {
  return `${key}-${number}`;
}

function refRegex(key: string, flags = "gi"): RegExp {
  // key is validated by TASK_KEY_PATTERN, so it's regex-safe
  return new RegExp(`(?<![A-Za-z0-9])${key}-(\\d{1,6})(?!\\d)`, flags);
}

/** All task numbers mentioned as KEY-123 in the text. */
export function extractTaskRefs(text: string | null | undefined, key: string): number[] {
  if (!text || !TASK_KEY_PATTERN.test(key)) return [];
  const found = new Set<number>();
  Array.from(text.matchAll(refRegex(key))).forEach((match) => found.add(Number(match[1])));
  return Array.from(found);
}

/** Task numbers preceded by a closing keyword: "closes KEY-12", "fixes KEY-3". */
export function extractClosingRefs(text: string | null | undefined, key: string): number[] {
  if (!text || !TASK_KEY_PATTERN.test(key)) return [];
  const re = new RegExp(
    `\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|complete[sd]?|done)\\b[:\\s]+${key}-(\\d{1,6})(?!\\d)`,
    "gi"
  );
  const found = new Set<number>();
  Array.from(text.matchAll(re)).forEach((match) => found.add(Number(match[1])));
  return Array.from(found);
}

// ============================================
// Credit splits
// ============================================
export type Split = Record<string, number>;

/** 100% shared equally; leftover points go to the first assignees. */
export function equalSplit(userIds: string[]): Split {
  const ids = Array.from(new Set(userIds));
  if (ids.length === 0) return {};
  const base = Math.floor(100 / ids.length);
  let remainder = 100 - base * ids.length;
  const split: Split = {};
  for (const id of ids) {
    split[id] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return split;
}

/** Returns an error message, or null when the split is valid for these assignees. */
export function validateSplit(assigneeIds: string[], split: Split): string | null {
  const ids = Array.from(new Set(assigneeIds));
  const keys = Object.keys(split);
  if (ids.length < 2) return "A custom split needs at least two people on the task.";
  if (keys.length !== ids.length || !ids.every((id) => keys.includes(id))) {
    return "The split must include exactly the people assigned to the task.";
  }
  let total = 0;
  for (const value of Object.values(split)) {
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      return "Each share must be a whole number between 0 and 100.";
    }
    total += value;
  }
  if (total !== 100) return `Shares must add up to 100% (currently ${total}%).`;
  return null;
}

/** The split that actually applies: the custom one if still valid, else equal. */
export function effectiveSplit(task: Pick<Task, "assignee_ids" | "split">): Split {
  const ids = task.assignee_ids || [];
  if (task.split && validateSplit(ids, task.split) === null) return { ...task.split };
  return equalSplit(ids);
}

export function isCustomSplit(task: Pick<Task, "assignee_ids" | "split">): boolean {
  return Boolean(task.split && validateSplit(task.assignee_ids || [], task.split) === null);
}

export function sameSplit(a: Split, b: Split): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}

// ============================================
// Status helpers
// ============================================
export function isOverdue(task: Pick<Task, "status" | "due_date">, now = new Date()): boolean {
  if (!task.due_date || task.status === "done") return false;
  const due = new Date(`${task.due_date}T23:59:59`);
  return due.getTime() < now.getTime();
}

/**
 * A done task counts fully when it's linked to GitHub activity or a teammate
 * who isn't on the task confirmed it. Otherwise it's self-reported.
 */
export function isTaskVerified(
  task: Pick<Task, "confirmed_by" | "assignee_ids">,
  linkedEvidenceCount: number
): boolean {
  if (linkedEvidenceCount > 0) return true;
  const assignees = new Set(task.assignee_ids || []);
  return (task.confirmed_by || []).some((id) => !assignees.has(id));
}

interface EvidenceText {
  source?: string | null;
  summary?: string | null;
  description?: string | null;
  is_bot_generated?: boolean | null;
  is_excluded?: boolean | null;
  is_duplicate?: boolean | null;
  verification_state?: string | null;
  resolved_actor_id?: string | null;
  actor_id?: string | null;
}

/** Only eligible provider activity can back up a task. */
export function linkEvidenceToTasks<E extends EvidenceText>(evidence: E[], key: string): Map<number, E[]> {
  const links = new Map<number, E[]>();
  for (const item of evidence) {
    if (
      !item.source?.startsWith("github_") ||
      item.is_bot_generated ||
      item.is_excluded ||
      item.is_duplicate ||
      item.verification_state !== "provider_verified"
    ) continue;
    const refs = Array.from(
      new Set(extractTaskRefs(item.summary, key).concat(extractTaskRefs(item.description, key)))
    );
    refs.forEach((n) => {
      const list = links.get(n) || [];
      list.push(item);
      links.set(n, list);
    });
  }
  return links;
}

/** A mention verifies a task only when an assigned teammate authored the activity. */
export function verifyingTaskLinks<E extends EvidenceText>(task: Pick<Task, "assignee_ids">, links: E[]): E[] {
  return links.filter((item) => task.assignee_ids.includes(item.resolved_actor_id || item.actor_id || ""));
}

/** Position for appending a card to the end of a column. */
export function nextPosition(tasks: Pick<Task, "status" | "position">[], status: TaskStatus): number {
  const inColumn = tasks.filter((t) => t.status === status);
  if (inColumn.length === 0) return 1000;
  return Math.max(...inColumn.map((t) => t.position || 0)) + 1000;
}
