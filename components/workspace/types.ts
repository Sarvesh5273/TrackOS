import type { EvidenceItem, MembershipRole, TeamMember, Workspace } from "@/types";

export interface EvidenceView extends EvidenceItem {
  /** Member this item belongs to (matched on the server), if any */
  resolved_actor_id: string | null;
}

export interface IntegrationView {
  id: string;
  status: "pending" | "active" | "error" | "revoked";
  selected_resources: { repo?: string; fullName?: string; isPrivate?: boolean; defaultBranch?: string } | null;
  last_synced_at: string | null;
  error_message: string | null;
  has_token: boolean;
  created_at: string;
}

/** What every tab needs to know about the project and the viewer. */
export interface ProjectContext {
  workspace: Workspace;
  taskKey: string;
  members: TeamMember[];
  /** Members who can be assigned tasks (leaders + members, not reviewers) */
  contributors: TeamMember[];
  currentUserId: string;
  myRole: MembershipRole;
  isLeader: boolean;
  canEdit: boolean;
  /** Published/archived projects are read-only */
  readOnly: boolean;
  aiEnabled: boolean;
}
