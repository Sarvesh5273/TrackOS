// lib/integrations/github.ts
// SRS SF-03, SF-04: GitHub OAuth + Evidence Ingestion + Normalization

import { Octokit } from "@octokit/rest";
import { EvidenceSource, ContributionCategory, WorkType } from "@/types";

export interface GitHubSyncConfig {
  accessToken: string;
  owner: string;
  repo: string;
  since?: Date;
  until?: Date;
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
}

// ============================================
// GitHub Sync Orchestrator
// ============================================
export class GitHubSyncService {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async syncRepository(config: GitHubSyncConfig): Promise<NormalizedEvidence[]> {
    const { owner, repo, since, until } = config;
    const allEvidence: NormalizedEvidence[] = [];

    // FR-EVD-01: Sync commits, PRs, issues, reviews
    const [commits, pullRequests, issues] = await Promise.all([
      this.syncCommits(owner, repo, since, until),
      this.syncPullRequests(owner, repo, since, until),
      this.syncIssues(owner, repo, since, until),
    ]);

    allEvidence.push(...commits, ...pullRequests, ...issues);

    // Sync PR reviews for each PR
    for (const pr of pullRequests) {
      const prNumber = pr.metadata.prNumber as number;
      const reviews = await this.syncPRReviews(owner, repo, prNumber, since, until);
      allEvidence.push(...reviews);
    }

    return allEvidence;
  }

  // ============================================
  // Commits
  // ============================================
  private async syncCommits(
    owner: string, 
    repo: string, 
    since?: Date, 
    until?: Date
  ): Promise<NormalizedEvidence[]> {
    const { data: commits } = await this.octokit.rest.repos.listCommits({
      owner,
      repo,
      since: since?.toISOString(),
      until: until?.toISOString(),
      per_page: 100,
    });

    return commits.map((commit) => ({
      source: "GITHUB_COMMIT" as EvidenceSource,
      sourceId: commit.sha,
      sourceUrl: commit.html_url || `https://github.com/${owner}/${repo}/commit/${commit.sha}`,
      eventType: "commit",
      actorUsername: commit.author?.login || commit.commit.author?.name || "unknown",
      actorEmail: commit.commit.author?.email,
      timestamp: new Date(commit.commit.author?.date || Date.now()),
      summary: commit.commit.message.split("\n")[0].substring(0, 200),
      description: commit.commit.message,
      category: "DEVELOPMENT",
      workType: "created",
      metadata: {
        additions: 0, // Would need separate API call for stats
        deletions: 0,
        filesChanged: 0,
        messageLength: commit.commit.message.length,
      },
      baseWeight: 1.0,
    }));
  }

  // ============================================
  // Pull Requests
  // ============================================
  private async syncPullRequests(
    owner: string, 
    repo: string, 
    since?: Date, 
    until?: Date
  ): Promise<NormalizedEvidence[]> {
    const { data: prs } = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state: "all",
      per_page: 100,
    });

    return prs
      .filter((pr) => {
        const prDate = new Date(pr.created_at);
        if (since && prDate < since) return false;
        if (until && prDate > until) return false;
        return true;
      })
      .map((pr) => ({
        source: "GITHUB_PR" as EvidenceSource,
        sourceId: pr.node_id || String(pr.number),
        sourceUrl: pr.html_url,
        eventType: "pull_request",
        actorUsername: pr.user?.login || "unknown",
        timestamp: new Date(pr.created_at),
        summary: pr.title.substring(0, 200),
        description: pr.body || undefined,
        category: "DEVELOPMENT",
        workType: pr.merged ? "created" : "review",
        metadata: {
          prNumber: pr.number,
          state: pr.state,
          merged: pr.merged,
          mergeCommitSha: pr.merge_commit_sha,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changed_files,
          comments: pr.comments,
          reviewComments: pr.review_comments,
        },
        baseWeight: 2.5,
      }));
  }

  // ============================================
  // Issues
  // ============================================
  private async syncIssues(
    owner: string, 
    repo: string, 
    since?: Date, 
    until?: Date
  ): Promise<NormalizedEvidence[]> {
    const { data: issues } = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "all",
      since: since?.toISOString(),
      per_page: 100,
    });

    return issues
      .filter((issue) => !issue.pull_request) // Exclude PRs listed as issues
      .filter((issue) => {
        const issueDate = new Date(issue.created_at);
        if (since && issueDate < since) return false;
        if (until && issueDate > until) return false;
        return true;
      })
      .map((issue) => ({
        source: "GITHUB_ISSUE" as EvidenceSource,
        sourceId: String(issue.id),
        sourceUrl: issue.html_url,
        eventType: "issue",
        actorUsername: issue.user?.login || "unknown",
        timestamp: new Date(issue.created_at),
        summary: issue.title.substring(0, 200),
        description: issue.body || undefined,
        category: this.categorizeIssue(issue.labels),
        workType: issue.state === "closed" ? "created" : "coordination",
        metadata: {
          issueNumber: issue.number,
          state: issue.state,
          labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name)),
          comments: issue.comments,
        },
        baseWeight: 1.5,
      }));
  }

  // ============================================
  // PR Reviews
  // ============================================
  private async syncPRReviews(
    owner: string, 
    repo: string, 
    pullNumber: number,
    since?: Date, 
    until?: Date
  ): Promise<NormalizedEvidence[]> {
    const { data: reviews } = await this.octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return reviews
      .filter((review) => {
        if (!review.submitted_at) return false;
        const reviewDate = new Date(review.submitted_at);
        if (since && reviewDate < since) return false;
        if (until && reviewDate > until) return false;
        return true;
      })
      .map((review) => ({
        source: "GITHUB_REVIEW" as EvidenceSource,
        sourceId: String(review.id),
        sourceUrl: review.html_url || ``,
        eventType: "pr_review",
        actorUsername: review.user?.login || "unknown",
        timestamp: new Date(review.submitted_at!),
        summary: `Reviewed PR #${pullNumber}: ${review.state}`,
        description: review.body || undefined,
        category: "COORDINATION_REVIEW",
        workType: "review",
        metadata: {
          prNumber: pullNumber,
          reviewState: review.state,
          // APPROVED, CHANGES_REQUESTED, COMMENTED
        },
        baseWeight: 2.0,
      }));
  }

  // ============================================
  // Helpers
  // ============================================
  private categorizeIssue(labels: unknown[]): ContributionCategory {
    const labelNames = labels.map((l) => {
      if (typeof l === "string") return l.toLowerCase();
      if (typeof l === "object" && l && "name" in l) return String((l as { name: string }).name).toLowerCase();
      return "";
    });

    if (labelNames.some((l) => l.includes("bug") || l.includes("test") || l.includes("qa"))) {
      return "QUALITY_TESTING";
    }
    if (labelNames.some((l) => l.includes("design") || l.includes("ui") || l.includes("ux"))) {
      return "DESIGN";
    }
    if (labelNames.some((l) => l.includes("doc") || l.includes("research"))) {
      return "DOCUMENTATION_RESEARCH";
    }
    return "DEVELOPMENT";
  }
}

// ============================================
// Rate limit handling (FR-INT-05, FR-EVD-10)
// ============================================
export async function safeGitHubCall<T>(
  operation: () => Promise<T>,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Error && error.message.includes("rate limit")) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("GitHub API call failed after retries");
}
