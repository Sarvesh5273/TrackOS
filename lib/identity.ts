// Maps GitHub activity (login / email) to project members. Server only.

import type { User } from "@supabase/supabase-js";
import type { AdminClient } from "@/lib/supabase/admin";
import type { MembershipRole, TeamMember } from "@/types";

export interface MemberIdentity extends TeamMember {
  /** GitHub login proven by signing in with GitHub (can't be edited by the user). */
  verifiedGithub: string | null;
  /** GitHub username typed into the profile (self-declared). */
  declaredGithub: string | null;
  emails: string[];
}

export function displayNameOf(user: Pick<User, "email" | "user_metadata"> | null | undefined): string {
  const meta = (user?.user_metadata || {}) as Record<string, any>;
  return (
    meta.name ||
    meta.full_name ||
    meta.user_name ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "Teammate"
  );
}

export function verifiedGithubLogin(user: User | null | undefined): string | null {
  const identity = user?.identities?.find((i) => i.provider === "github");
  const data = (identity?.identity_data || {}) as Record<string, any>;
  const login = data.user_name || data.preferred_username || null;
  return login ? String(login) : null;
}

export function declaredGithubLogin(user: User | null | undefined): string | null {
  const value = (user?.user_metadata as Record<string, any> | undefined)?.github_username;
  return typeof value === "string" && value.trim() ? value.trim().replace(/^@/, "") : null;
}

function toIdentity(
  row: { id: string; user_id: string; role: MembershipRole; joined_at: string | null },
  user: User | null
): MemberIdentity {
  const verified = verifiedGithubLogin(user);
  const declared = declaredGithubLogin(user);
  const meta = (user?.user_metadata || {}) as Record<string, any>;
  const githubIdentity = user?.identities?.find((i) => i.provider === "github");
  const githubEmail = (githubIdentity?.identity_data as Record<string, any> | undefined)?.email;
  const emails = [user?.email, githubEmail]
    .filter((e): e is string => typeof e === "string" && e.includes("@"))
    .map((e) => e.toLowerCase());

  return {
    membershipId: row.id,
    userId: row.user_id,
    role: row.role,
    name: displayNameOf(user),
    avatarUrl: meta.avatar_url || "",
    githubLogin: verified || declared,
    email: user?.email || null,
    joinedAt: row.joined_at,
    verifiedGithub: verified,
    declaredGithub: declared,
    emails: Array.from(new Set(emails)),
  };
}

/** Accepted members of a workspace with their identities (N small; one auth lookup each). */
export async function loadMemberIdentities(
  admin: AdminClient,
  workspaceId: string
): Promise<MemberIdentity[]> {
  const { data: rows, error } = await admin
    .from("memberships")
    .select("id, user_id, role, joined_at, invitation_state")
    .eq("workspace_id", workspaceId)
    .eq("invitation_state", "accepted")
    .not("user_id", "is", null)
    .order("joined_at", { ascending: true });

  if (error) throw error;

  return Promise.all(
    (rows || []).map(async (row: any) => {
      try {
        const { data } = await admin.auth.admin.getUserById(row.user_id);
        return toIdentity(row, data?.user || null);
      } catch {
        return toIdentity(row, null);
      }
    })
  );
}

/** Strips private fields before sending to a browser. */
export function toTeamMember(identity: MemberIdentity, opts: { includeEmail: boolean }): TeamMember {
  return {
    membershipId: identity.membershipId,
    userId: identity.userId,
    role: identity.role,
    name: identity.name,
    avatarUrl: identity.avatarUrl,
    githubLogin: identity.githubLogin,
    email: opts.includeEmail ? identity.email : null,
    joinedAt: identity.joinedAt,
  };
}

const NOREPLY_RE = /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i;

export interface ResolvedActor {
  userId: string;
  confidence: number;
  method: "github_login" | "email" | "declared_login";
}

export type ActorResolver = (username?: string | null, email?: string | null) => ResolvedActor | null;

/**
 * Builds a resolver for GitHub actors. Verified logins win; self-declared
 * logins only count when no other member verifiably owns that login and the
 * declaration is unique within the team.
 */
export function createActorResolver(members: MemberIdentity[]): ActorResolver {
  const verified = new Map<string, string>();
  const emails = new Map<string, string>();
  const declaredCount = new Map<string, number>();
  const declared = new Map<string, string>();

  for (const m of members) {
    if (m.verifiedGithub) verified.set(m.verifiedGithub.toLowerCase(), m.userId);
    for (const e of m.emails) emails.set(e, m.userId);
    if (m.declaredGithub) {
      const key = m.declaredGithub.toLowerCase();
      declaredCount.set(key, (declaredCount.get(key) || 0) + 1);
      declared.set(key, m.userId);
    }
  }

  const byLogin = (login: string): ResolvedActor | null => {
    const key = login.toLowerCase();
    const v = verified.get(key);
    if (v) return { userId: v, confidence: 1, method: "github_login" };
    const d = declared.get(key);
    if (d && declaredCount.get(key) === 1) return { userId: d, confidence: 0.9, method: "declared_login" };
    return null;
  };

  return (username, email) => {
    if (username && username !== "unknown") {
      const hit = byLogin(username);
      if (hit) return hit;
    }
    if (email) {
      const lower = email.toLowerCase();
      const hit = emails.get(lower);
      if (hit) return { userId: hit, confidence: 1, method: "email" };
      const noreply = lower.match(NOREPLY_RE);
      if (noreply) {
        const byNoreply = byLogin(noreply[1]);
        if (byNoreply) return byNoreply;
      }
    }
    return null;
  };
}

/** Co-authors are stored as [{name, email}] (new) or ["name"] (old syncs). */
export function resolveCoAuthors(resolve: ActorResolver, coAuthors: unknown): string[] {
  if (!Array.isArray(coAuthors)) return [];
  const ids = new Set<string>();
  for (const c of coAuthors) {
    if (typeof c === "string") {
      const hit = resolve(c.trim(), null);
      if (hit) ids.add(hit.userId);
    } else if (c && typeof c === "object") {
      const { name, email } = c as { name?: string; email?: string };
      const hit = resolve(name?.trim() || null, email || null);
      if (hit) ids.add(hit.userId);
    }
  }
  return Array.from(ids);
}

const BOT_LOGINS = new Set([
  "dependabot",
  "renovate",
  "github-actions",
  "actions-user",
  "web-flow",
  "vercel",
  "netlify",
  "codecov",
  "snyk-bot",
  "imgbot",
]);

export function isBotActor(username?: string | null): boolean {
  if (!username) return false;
  const lower = username.toLowerCase();
  return lower.endsWith("[bot]") || lower.endsWith("-bot") || BOT_LOGINS.has(lower);
}
