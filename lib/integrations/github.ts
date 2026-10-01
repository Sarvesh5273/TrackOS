// lib/integrations/github.ts
// GitHub ingestion + normalization (commits, PRs, issues, reviews). Server only.

import { Octokit } from "@octokit/rest";
import { EvidenceSource, ContributionCategory, WorkType } from "@/types";

export interface GitHubSyncConfig {
  owner: string;
  repo: string;
  since?: Date;
  until?: Date;
}

export interface CoAuthor {
  name: string;
  email: string;
}

export interface NormalizedEvidence {
  source: EvidenceSource;
  sourceId: string;
  sourceUrl: string;
  eventType: string;
  actorUsername: string;
  actorEmail?: string;
  timestamp: Date;
  summary: string;
  description?: string;
  category: ContributionCategory;
  workType: WorkType;
  metadata: Record<string, unknown>;
  baseWeight: number;
  impactFactor?: number;
}

// Caps keep a sync inside serverless time limits and GitHub rate limits
const MAX_COMMITS = 1000;
const MAX_PULLS = 300;
const MAX_ISSUES = 300;
const MAX_REVIEWED_PULLS = 100;

/** "owner/repo", "https://github.com/owner/repo(.git)" -> { owner, repo } */
export function parseRepo(input: string): { owner: string; repo: string } | null {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^git@github\.com:/i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
  const [owner, repo, ...rest] = cleaned.split("/");
  const valid = /^[A-Za-z0-9_.-]{1,100}$/;
  if (!owner || !repo || rest.length > 0 || !valid.test(owner) || !valid.test(repo)) return null;
  return { owner, repo };
}

export class GitHubSyncService {
  private octokit: Octokit;

  constructor(accessToken?: string | null) {
    this.octokit = new Octokit(accessToken ? { auth: accessToken } : {});
  }

  async validateRepository(owner: string, repo: string): Promise<{
    fullName: string;
    description: string | null;
    defaultBranch: string;
    isPrivate: boolean;
  }> {
    const { data } = await this.octokit.rest.repos.get({ owner, repo });
    return {
      fullName: data.full_name,
      description: data.description,
      defaultBranch: data.default_branch,
      isPrivate: data.private,
    };
  }

  async syncRepository(config: GitHubSyncConfig): Promise<NormalizedEvidence[]> {
    const { owner, repo, since, until } = config;

    const [commits, pullRequests, issues] = await Promise.all([
      this.syncCommits(owner, repo, since, until),
      this.syncPullRequests(owner, repo, since, until),
      this.syncIssues(owner, repo, since, until),
    ]);

    const reviews: NormalizedEvidence[] = [];
    for (const pr of pullRequests.slice(0, MAX_REVIEWED_PULLS)) {
      const prNumber = pr.metadata.prNumber as number;
      if (!prNumber) continue;
      reviews.push(...(await this.syncPRReviews(owner, repo, prNumber, since, until)));
    }

    return [...commits, ...pullRequests, ...issues, ...reviews];
  }

  // ---------- Commits ----------
  private async syncCommits(owner: string, repo: string, since?: Date, until?: Date): Promise<NormalizedEvidence[]> {
    const out: NormalizedEvidence[] = [];
    try {
      const iterator = this.octokit.paginate.iterator(this.octokit.rest.repos.listCommits, {
        owner,
        repo,
        since: since?.toISOString(),
        until: until?.toISOString(),
        per_page: 100,
      });

      for await (const page of iterator) {
        for (const commit of page.data) {
          const message = commit.commit.message || "";
          const summary = message.split("\n")[0].substring(0, 200);
          const { category, workType, conventionalType } = this.classifyCommitMessage(message);
          const coAuthors = this.extractCoAuthors(message);
          const isMerge = (commit.parents?.length || 0) > 1;

          out.push({
            source: "github_commit",
            sourceId: commit.sha,
            sourceUrl: commit.html_url || `https://github.com/${owner}/${repo}/commit/${commit.sha}`,
            eventType: "commit",
            actorUsername: commit.author?.login || commit.commit.author?.name || "unknown",
            actorEmail: commit.commit.author?.email || undefined,
            timestamp: new Date(commit.commit.author?.date || Date.now()),
            summary: summary || "Git commit",
            description: message.substring(0, 5000),
            category,
            workType,
            metadata: { sha: commit.sha, conventionalType, messageLength: message.length, coAuthors, isMerge },
            // Merge commits repeat work already credited through the PR
            baseWeight: isMerge ? 0.2 : 1.0,
          });
          if (out.length >= MAX_COMMITS) return out;
        }
      }
    } catch (err) {
      console.error("Error syncing commits:", err);
    }
    return out;
  }

  // ---------- Pull requests ----------
  private async syncPullRequests(owner: string, repo: string, since?: Date, until?: Date): Promise<NormalizedEvidence[]> {
    const out: NormalizedEvidence[] = [];
    try {
      const iterator = this.octokit.paginate.iterator(this.octokit.rest.pulls.list, {
        owner,
        repo,
        state: "all",
        sort: "created",
        direction: "desc",
        per_page: 100,
      });

      for await (const page of iterator) {
        for (const pr of page.data) {
          const created = new Date(pr.created_at);
          if (since && created < since) return out; // sorted newest first
          if (until && created > until) continue;
          out.push(this.normalizePullRequest(pr, owner, repo));
          if (out.length >= MAX_PULLS) return out;
        }
      }
    } catch (err) {
      console.error("Error syncing pull requests:", err);
    }
    return out;
  }

  normalizePullRequest(pr: any, owner: string, repo: string): NormalizedEvidence {
    const { category } = this.classifyCommitMessage(pr.title || "");
    const isMerged = Boolean(pr.merged_at || pr.merged);
    return {
      source: "github_pr",
      sourceId: pr.node_id || String(pr.id || pr.number),
      sourceUrl: pr.html_url || `https://github.com/${owner}/${repo}/pull/${pr.number}`,
      eventType: "pull_request",
      actorUsername: pr.user?.login || "unknown",
      timestamp: new Date(pr.created_at || Date.now()),
      summary: String(pr.title || "Pull request").substring(0, 200),
      description: pr.body ? String(pr.body).substring(0, 5000) : undefined,
      category,
      workType: isMerged ? "created" : "review",
      metadata: {
        prNumber: pr.number,
        state: pr.state,
        merged: isMerged,
        mergedAt: pr.merged_at || null,
        mergeCommitSha: pr.merge_commit_sha || null,
      },
      baseWeight: 2.5,
    };
  }

  // ---------- Issues ----------
  private async syncIssues(owner: string, repo: string, since?: Date, until?: Date): Promise<NormalizedEvidence[]> {
    const out: NormalizedEvidence[] = [];
    try {
      const iterator = this.octokit.paginate.iterator(this.octokit.rest.issues.listForRepo, {
        owner,
        repo,
        state: "all",
        since: since?.toISOString(),
        per_page: 100,
      });

      for await (const page of iterator) {
        for (const issue of page.data) {
          if (issue.pull_request) continue;
          const created = new Date(issue.created_at);
          if ((since && created < since) || (until && created > until)) continue;
          out.push({
            source: "github_issue",
            sourceId: String(issue.id),
            sourceUrl: issue.html_url,
            eventType: "issue",
            actorUsername: issue.user?.login || "unknown",
            timestamp: created,
            summary: issue.title.substring(0, 200),
            description: issue.body ? issue.body.substring(0, 5000) : undefined,
            category: this.categorizeIssue(issue.labels, issue.title),
            workType: issue.state === "closed" ? "created" : "coordination",
            metadata: {
              issueNumber: issue.number,
              state: issue.state,
              labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name)),
              comments: issue.comments,
            },
            baseWeight: 1.5,
          });
          if (out.length >= MAX_ISSUES) return out;
        }
      }
    } catch (err) {
      console.error("Error syncing issues:", err);
    }
    return out;
  }

  // ---------- Reviews ----------
  private async syncPRReviews(
    owner: string,
    repo: string,
    pullNumber: number,
    since?: Date,
    until?: Date
  ): Promise<NormalizedEvidence[]> {
    try {
      const { data: reviews } = await this.octokit.rest.pulls.listReviews({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
      });

      return reviews
        .filter((review) => {
          if (!review.submitted_at) return false;
          const reviewDate = new Date(review.submitted_at);
          if (since && reviewDate < since) return false;
          if (until && reviewDate > until) return false;
          return true;
        })
        .map((review) => this.normalizeReview(review, pullNumber, `https://github.com/${owner}/${repo}/pull/${pullNumber}`));
    } catch (err) {
      console.error(`Error syncing reviews for PR #${pullNumber}:`, err);
      return [];
    }
  }

  normalizeReview(review: any, pullNumber: number, fallbackUrl: string): NormalizedEvidence {
    const body = String(review.body || "").trim();
    const state = String(review.state || "").toUpperCase();
    const isSubstantive = body.length > 80 || body.includes("`");
    const isChangesRequested = state === "CHANGES_REQUESTED";

    let baseWeight = 1.5;
    let impactFactor = 1.0;
    if (isChangesRequested) {
      baseWeight = 2.5;
      impactFactor = 2.0;
    } else if (isSubstantive) {
      baseWeight = 2.0;
      impactFactor = 1.4;
    } else if (body.toLowerCase() === "lgtm" || body.length < 10) {
      baseWeight = 0.8;
      impactFactor = 0.6;
    }

    return {
      source: "github_review",
      sourceId: String(review.id),
      sourceUrl: review.html_url || fallbackUrl,
      eventType: "pr_review",
      actorUsername: review.user?.login || "unknown",
      timestamp: new Date(review.submitted_at || Date.now()),
      summary: isChangesRequested
        ? `Requested changes on PR #${pullNumber}`
        : isSubstantive
        ? `In-depth code review on PR #${pullNumber}`
        : `Reviewed PR #${pullNumber} (${state.toLowerCase().replace("_", " ")})`,
      description: body ? body.substring(0, 5000) : undefined,
      category: "coordination_review",
      workType: "review",
      metadata: { prNumber: pullNumber, reviewState: state, isSubstantive, feedbackLength: body.length },
      baseWeight,
      impactFactor,
    };
  }

  // ---------- Classification ----------
  public classifyCommitMessage(message: string): {
    category: ContributionCategory;
    workType: WorkType;
    conventionalType?: string;
  } {
    const lower = message.toLowerCase().trim();

    const match = lower.match(/^([a-z]+)(\([^)]+\))?!?:\s*(.+)/);
    if (match) {
      const type = match[1];
      switch (type) {
        case "feat":
          return { category: "development", workType: "created", conventionalType: "feat" };
        case "fix":
        case "test":
          return { category: "quality_testing", workType: "created", conventionalType: type };
        case "docs":
          return { category: "documentation_research", workType: "original", conventionalType: "docs" };
        case "style":
          return { category: "design", workType: "created", conventionalType: "style" };
        case "refactor":
        case "perf":
          return { category: "development", workType: "created", conventionalType: type };
        case "chore":
        case "build":
        case "ci":
          return { category: "development", workType: "coordination", conventionalType: type };
      }
    }

    if (/\b(design|ui|ux|css|theme|layout|figma)\b/.test(lower)) return { category: "design", workType: "created" };
    if (/\b(test|tests|spec|coverage|qa|bug|fix|hotfix)\b/.test(lower)) {
      return { category: "quality_testing", workType: "created" };
    }
    if (/\b(doc|docs|readme|guide|rfc|architecture)\b/.test(lower)) {
      return { category: "documentation_research", workType: "original" };
    }
    if (/\b(slide|slides|pitch|presentation|demo|video)\b/.test(lower)) {
      return { category: "presentation_delivery", workType: "presentation" };
    }
    return { category: "development", workType: "created" };
  }

  public categorizeIssue(labels: unknown[], title = ""): ContributionCategory {
    const labelNames = labels.map((l) => {
      if (typeof l === "string") return l.toLowerCase();
      if (typeof l === "object" && l && "name" in l) return String((l as { name: string }).name).toLowerCase();
      return "";
    });
    const combined = `${labelNames.join(" ")} ${title.toLowerCase()}`;

    if (/\b(bug|test|qa|defect|regression|broken|error|crash)\b/.test(combined)) return "quality_testing";
    if (/\b(design|ui|ux|wireframe|figma|css|layout)\b/.test(combined)) return "design";
    if (/\b(doc|docs|research|rfc|architecture|proposal)\b/.test(combined)) return "documentation_research";
    if (/\b(presentation|pitch|demo|slide|video)\b/.test(combined)) return "presentation_delivery";
    if (/\b(coordination|meeting|sprint|standup|planning)\b/.test(combined)) return "coordination_review";
    return "development";
  }

  /** Parses "Co-authored-by: Name <email>" trailers. */
  public extractCoAuthors(message: string): CoAuthor[] {
    const coAuthors: CoAuthor[] = [];
    for (const line of message.split("\n")) {
      const match = line.match(/^\s*Co-authored-by:\s*(.*?)\s*<([^>]+)>/i);
      if (match) coAuthors.push({ name: match[1].trim(), email: match[2].trim().toLowerCase() });
    }
    return coAuthors;
  }
}
