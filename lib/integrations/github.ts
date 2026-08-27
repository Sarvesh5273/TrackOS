// lib/integrations/github.ts
// SRS SF-03, SF-04: GitHub OAuth + Evidence Ingestion + Normalization

import { Octokit } from "@octokit/rest";
import { EvidenceSource, ContributionCategory, WorkType } from "@/types";

export interface GitHubSyncConfig {
  accessToken?: string;
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
  collaboratorUsernames?: string[];
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

  constructor(accessToken?: string) {
    this.octokit = new Octokit(accessToken ? { auth: accessToken } : {});
  }

  /**
   * Validates repository access and returns repository details
   */
  async validateRepository(owner: string, repo: string): Promise<{
    fullName: string;
    description: string | null;
    defaultBranch: string;
    isPrivate: boolean;
  }> {
    const { data } = await this.octokit.rest.repos.get({
      owner,
      repo,
    });

    return {
      fullName: data.full_name,
      description: data.description,
      defaultBranch: data.default_branch,
      isPrivate: data.private,
    };
  }

  async syncRepository(config: GitHubSyncConfig): Promise<NormalizedEvidence[]> {
    const { owner, repo, since, until } = config;
    const allEvidence: NormalizedEvidence[] = [];

    // Sync commits, PRs, issues in parallel
    const [commits, pullRequests, issues] = await Promise.all([
      this.syncCommits(owner, repo, since, until),
      this.syncPullRequests(owner, repo, since, until),
      this.syncIssues(owner, repo, since, until),
    ]);

    allEvidence.push(...commits, ...pullRequests, ...issues);

    // Sync PR reviews for each PR (limit concurrency/failures gracefully)
    for (const pr of pullRequests) {
      const prNumber = pr.metadata.prNumber as number;
      if (prNumber) {
        try {
          const reviews = await this.syncPRReviews(owner, repo, prNumber, since, until);
          allEvidence.push(...reviews);
        } catch (e) {
          console.warn(`Failed to sync reviews for PR #${prNumber}:`, e);
        }
      }
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
    try {
      const { data: commits } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        since: since?.toISOString(),
        until: until?.toISOString(),
        per_page: 100,
      });

      return commits.map((commit) => {
        const message = commit.commit.message || "";
        const summary = message.split("\n")[0].substring(0, 200);
        const { category, workType, conventionalType } = this.classifyCommitMessage(message);
        const coAuthors = this.extractCoAuthors(message);

        return {
          source: "github_commit" as EvidenceSource,
          sourceId: commit.sha,
          sourceUrl: commit.html_url || `https://github.com/${owner}/${repo}/commit/${commit.sha}`,
          eventType: "commit",
          actorUsername: commit.author?.login || commit.commit.author?.name || "unknown",
          actorEmail: commit.commit.author?.email,
          collaboratorUsernames: coAuthors,
          timestamp: new Date(commit.commit.author?.date || Date.now()),
          summary: summary || "Git commit",
          description: message,
          category,
          workType,
          metadata: {
            sha: commit.sha,
            conventionalType,
            messageLength: message.length,
            coAuthors,
          },
          baseWeight: 1.0,
        };
      });
    } catch (err) {
      console.error("Error syncing commits:", err);
      return [];
    }
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
    try {
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
        .map((pr) => {
          const { category } = this.classifyCommitMessage(pr.title);
          const isMerged = Boolean(pr.merged_at || pr.state === "closed" && (pr as any).merged);

          return {
            source: "github_pr" as EvidenceSource,
            sourceId: pr.node_id || String(pr.number),
            sourceUrl: pr.html_url,
            eventType: "pull_request",
            actorUsername: pr.user?.login || "unknown",
            timestamp: new Date(pr.created_at),
            summary: pr.title.substring(0, 200),
            description: pr.body || undefined,
            category,
            workType: isMerged ? "created" : "review",
            metadata: {
              prNumber: pr.number,
              state: pr.state,
              merged: isMerged,
              mergedAt: pr.merged_at,
              mergeCommitSha: pr.merge_commit_sha,
            },
            baseWeight: 2.5,
          };
        });
    } catch (err) {
      console.error("Error syncing pull requests:", err);
      return [];
    }
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
    try {
      const { data: issues } = await this.octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: "all",
        since: since?.toISOString(),
        per_page: 100,
      });

      return issues
        .filter((issue) => !issue.pull_request) // Exclude PRs returned by issues endpoint
        .filter((issue) => {
          const issueDate = new Date(issue.created_at);
          if (since && issueDate < since) return false;
          if (until && issueDate > until) return false;
          return true;
        })
        .map((issue) => ({
          source: "github_issue" as EvidenceSource,
          sourceId: String(issue.id),
          sourceUrl: issue.html_url,
          eventType: "issue",
          actorUsername: issue.user?.login || "unknown",
          timestamp: new Date(issue.created_at),
          summary: issue.title.substring(0, 200),
          description: issue.body || undefined,
          category: this.categorizeIssue(issue.labels, issue.title),
          workType: issue.state === "closed" ? "created" : "coordination",
          metadata: {
            issueNumber: issue.number,
            state: issue.state,
            labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name)),
            comments: issue.comments,
          },
          baseWeight: 1.5,
        }));
    } catch (err) {
      console.error("Error syncing issues:", err);
      return [];
    }
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
    try {
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
        .map((review) => {
          const body = (review.body || "").trim();
          const isSubstantive = body.length > 80 || body.includes("```") || body.includes("`");
          const isChangesRequested = review.state === "CHANGES_REQUESTED";

          // Calculate weight based on intellectual depth of review
          let baseWeight = 1.5;
          let impactFactor = 1.0;

          if (isChangesRequested) {
            baseWeight = 2.5;
            impactFactor = 2.0; // Caught potential bug/architecture issue
          } else if (isSubstantive) {
            baseWeight = 2.0;
            impactFactor = 1.4; // Thorough code inspection
          } else if (body.toLowerCase() === "lgtm" || body.length < 10) {
            baseWeight = 0.8;
            impactFactor = 0.6; // Superficial pass
          }

          return {
            source: "github_review" as EvidenceSource,
            sourceId: String(review.id),
            sourceUrl: review.html_url || `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
            eventType: "pr_review",
            actorUsername: review.user?.login || "unknown",
            timestamp: new Date(review.submitted_at!),
            summary: isChangesRequested
              ? `Requested changes on PR #${pullNumber}`
              : isSubstantive
              ? `In-depth code review on PR #${pullNumber}`
              : `Reviewed PR #${pullNumber} (${review.state.toLowerCase()})`,
            description: body || undefined,
            category: "coordination_review" as ContributionCategory,
            workType: "review" as WorkType,
            metadata: {
              prNumber: pullNumber,
              reviewState: review.state,
              isSubstantive,
              feedbackLength: body.length,
            },
            baseWeight,
            impactFactor,
          };
        });
    } catch (err) {
      console.error(`Error syncing reviews for PR #${pullNumber}:`, err);
      return [];
    }
  }

  // ============================================
  // Classification Helpers
  // ============================================
  private classifyCommitMessage(message: string): {
    category: ContributionCategory;
    workType: WorkType;
    conventionalType?: string;
  } {
    const lower = message.toLowerCase().trim();

    // 1. Conventional Commits prefix matching
    const match = lower.match(/^([a-z]+)(\([^\)]+\))?:\s*(.+)$/);
    if (match) {
      const type = match[1];
      switch (type) {
        case "feat":
          return { category: "development", workType: "created", conventionalType: "feat" };
        case "fix":
        case "test":
        case "ci":
          return { category: "quality_testing", workType: "created", conventionalType: type };
        case "docs":
          return { category: "documentation_research", workType: "created", conventionalType: "docs" };
        case "style":
          return { category: "design", workType: "created", conventionalType: "style" };
        case "refactor":
        case "perf":
          return { category: "development", workType: "review", conventionalType: type };
        case "chore":
        case "build":
        case "revert":
          return { category: "coordination_review", workType: "coordination", conventionalType: type };
      }
    }

    // 2. Keyword heuristic fallback
    if (/\b(bug|fix|patch|hotfix|test|spec|assert|coverage|qa)\b/.test(lower)) {
      return { category: "quality_testing", workType: "created" };
    }
    if (/\b(doc|docs|readme|wiki|comment|guide|spec|rfc|manual)\b/.test(lower)) {
      return { category: "documentation_research", workType: "created" };
    }
    if (/\b(ui|ux|design|css|style|theme|color|svg|icon|font|layout|tailwind)\b/.test(lower)) {
      return { category: "design", workType: "created" };
    }
    if (/\b(merge|bump|release|version|config|chore|deps|deploy|pipeline)\b/.test(lower)) {
      return { category: "coordination_review", workType: "coordination" };
    }
    if (/\b(review|refactor|clean|optimize|lint)\b/.test(lower)) {
      return { category: "coordination_review", workType: "review" };
    }

    return { category: "development", workType: "created" };
  }

  private categorizeIssue(labels: unknown[], title = ""): ContributionCategory {
    const labelNames = labels.map((l) => {
      if (typeof l === "string") return l.toLowerCase();
      if (typeof l === "object" && l && "name" in l) return String((l as { name: string }).name).toLowerCase();
      return "";
    });

    const combined = `${labelNames.join(" ")} ${title.toLowerCase()}`;

    if (/\b(bug|test|qa|defect|regression|broken|error|crash)\b/.test(combined)) {
      return "quality_testing";
    }
    if (/\b(design|ui|ux|wireframe|figma|css|frontend|layout)\b/.test(combined)) {
      return "design";
    }
    if (/\b(doc|docs|research|rfc|architecture|proposal|benchmark)\b/.test(combined)) {
      return "documentation_research";
    }
    if (/\b(presentation|pitch|demo|slide|video)\b/.test(combined)) {
      return "presentation_delivery";
    }
    if (/\b(coordination|task|epic|meeting|sprint|standup)\b/.test(combined)) {
      return "coordination_review";
    }
    return "development";
  }

  private extractCoAuthors(message: string): string[] {
    const coAuthors: string[] = [];
    const lines = message.split("\n");
    for (const line of lines) {
      const match = line.match(/Co-authored-by:\s*(.+)<([^>]+)>/i);
      if (match) {
        const nameOrUser = match[1].trim();
        coAuthors.push(nameOrUser);
      }
    }
    return coAuthors;
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
