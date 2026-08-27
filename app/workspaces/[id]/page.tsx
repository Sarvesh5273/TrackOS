"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Users,
  Calendar,
  Github,
  RefreshCw,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserPlus,
  Plus,
  Filter,
  Settings,
  AlertTriangle,
  GitBranch,
  X,
  Search,
  Mail,
  Shield,
  ShieldCheck,
  User,
  ChevronDown,
  ChevronUp,
  Trash2,
  Zap,
  Award,
  TrendingUp,
  Download,
  Eye,
  Lock,
  Unlock,
  Copy,
  Link2,
  MessageCircle,
  ExternalLink,
  Check,
  Sparkles,
  GitCommit,
  GitPullRequest,
  CheckCheck,
  Trophy,
  Scale,
  BookOpen,
  Send,
  Webhook,
} from "lucide-react";
import { formatDateTime, formatPercent } from "@/lib/utils";
import TeamHealthRadar from "@/components/TeamHealthRadar";
import ChangelogModal from "@/components/ChangelogModal";
import DisputeRoomModal from "@/components/DisputeRoomModal";
import HackathonDossierModal from "@/components/HackathonDossierModal";
import { calculateContributorBadges } from "@/lib/gamification/badges";
import { unfurlArtifactUrl, type UnfurledArtifact } from "@/lib/integrations/unfurl";
import { PlatformIcon } from "@/components/PlatformIcons";
import type { CategoryConfig, ContributionCategory, Integration, EvidenceItem, Report, Membership } from "@/types";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string;
  categories: CategoryConfig[];
  weights?: Record<string, number>;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  invitation_state: string;
  invitation_expires_at: string | null;
  invitation_token: string | null;
  joined_at: string;
  user: {
    id: string;
    email: string;
    raw_user_meta_data: { name?: string; avatar_url?: string; user_name?: string };
  } | null;
}

interface ManualEvidenceForm {
  title: string;
  description: string;
  category: string;
  work_type: string;
  effort_band: string;
  start_date: string;
  end_date: string;
  artifact_url: string;
}

const STATUS_FLOW: Record<string, { next: string; label: string; icon: any }> = {
  draft: { next: "active", label: "Activate Workspace", icon: Zap },
  active: { next: "frozen", label: "Freeze for Review", icon: Lock },
  frozen: { next: "under_review", label: "Start Review", icon: Eye },
  under_review: { next: "published", label: "Publish Report", icon: Award },
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-emerald-100 text-emerald-700",
  frozen: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  published: "bg-coral-100 text-coral-700",
};

const CONVENTIONAL_COLORS: Record<string, string> = {
  feat: "bg-blue-50 text-blue-700 border-blue-200",
  fix: "bg-emerald-50 text-emerald-700 border-emerald-200",
  docs: "bg-amber-50 text-amber-700 border-amber-200",
  style: "bg-purple-50 text-purple-700 border-purple-200",
  test: "bg-teal-50 text-teal-700 border-teal-200",
  refactor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  chore: "bg-gray-100 text-gray-700 border-gray-200",
};

const WORK_TYPE_OPTIONS = ["original", "collaboration", "review", "coordination", "presentation"];
const EFFORT_BAND_OPTIONS = ["SMALL", "MEDIUM", "LARGE", "EXTENSIVE"];

export default function WorkspaceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "evidence" | "reports">("overview");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [detectedArtifact, setDetectedArtifact] = useState<UnfurledArtifact | null>(null);

  const [inviteRole, setInviteRole] = useState("member");
  const [generatedInvite, setGeneratedInvite] = useState("");
  const [inviteExpiresAt, setInviteExpiresAt] = useState("");
  const [myRole, setMyRole] = useState("member");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [evidenceForm, setEvidenceForm] = useState<ManualEvidenceForm>({
    title: "",
    description: "",
    category: "",
    work_type: "original",
    effort_band: "MEDIUM",
    start_date: "",
    end_date: "",
    artifact_url: "",
  });

  const [integrationRepo, setIntegrationRepo] = useState("");
  const [integrationToken, setIntegrationToken] = useState("");
  const [integrationError, setIntegrationError] = useState("");

  const [filters, setFilters] = useState({
    category: "all",
    source: "all",
    verification: "all",
    search: "",
  });
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profile, setProfile] = useState<{
    id: string;
    name: string;
    username: string;
    email: string;
    avatarUrl: string;
    declaredRoles: string[];
  } | null>(null);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileRolesInput, setProfileRolesInput] = useState("");

  useEffect(() => {
    fetchWorkspace();
    fetchMembers();
    fetchIntegration();
    fetchReports();
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setCurrentUserId(data.profile?.id || null);
        setProfileNameInput(data.profile?.name || "");
        setProfileRolesInput((data.profile?.declaredRoles || []).join(", "));
      }
    } catch (e) {
      console.error("Could not load profile:", e);
    }
  };

  const handleUpdateProfile = async () => {
    setActionLoading(true);
    try {
      const rolesArray = profileRolesInput
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileNameInput.trim(),
          declaredRoles: rolesArray,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setShowProfileModal(false);
        await fetchMembers();
        showToast("Profile updated successfully", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update profile", "error");
      }
    } catch (e) {
      showToast("Failed to update profile", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Workspace deleted successfully", "success");
        setTimeout(() => {
          router.push("/dashboard");
        }, 600);
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete workspace", "error");
      }
    } catch (e) {
      showToast("Failed to delete workspace", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const fetchWorkspace = async () => {
    try {
      const res = await fetch(`/api/workspaces/${id}`);
      if (res.ok) {
        const data = await res.json();
        setWorkspace(data.workspace);
        setEvidence(data.evidence || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/workspaces/${id}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setMyRole(data.myRole || "member");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchIntegration = async () => {
    try {
      const res = await fetch(`/api/workspaces/${id}/integrations`);
      if (res.ok) {
        const data = await res.json();
        setIntegration(data.integration || null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/workspaces/${id}/reports`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/workspaces/${id}/sync`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        await fetchWorkspace();
        await fetchIntegration();
        showToast(data.message || `Synced ${data.synced || 0} items successfully`, "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Sync failed", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectIntegration = async () => {
    if (!integrationRepo.trim()) return;
    setActionLoading(true);
    setIntegrationError("");
    try {
      const res = await fetch(`/api/workspaces/${id}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "github",
          config: {
            repo: integrationRepo.trim(),
            token: integrationToken.trim() || undefined,
          },
        }),
      });

      if (res.ok) {
        setShowIntegrationModal(false);
        setIntegrationRepo("");
        setIntegrationToken("");
        await fetchIntegration();
        showToast("GitHub repository connected successfully! Triggering initial sync...", "success");
        // Trigger sync automatically
        handleSync();
      } else {
        const err = await res.json();
        setIntegrationError(err.error || "Failed to connect GitHub");
      }
    } catch (e) {
      setIntegrationError("Failed to connect GitHub. Please check network connection.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnectIntegration = async () => {
    if (!integration) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${id}/integrations/${integration.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShowDisconnectModal(false);
        setIntegration(null);
        showToast("GitHub integration disconnected", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to disconnect", "error");
      }
    } catch (e) {
      showToast("Failed to disconnect", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmEvidence = async (evidenceId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${id}/evidence/${evidenceId}/confirm`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || "Evidence verified and co-signed!", "success");
        await fetchWorkspace();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to co-sign evidence", "error");
      }
    } catch (e) {
      showToast("Failed to co-sign evidence", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: inviteRole }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedInvite(data.inviteUrl);
        setInviteExpiresAt(data.expiresAt);
        await fetchMembers();
        showToast("Invite link generated", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to generate invite", "error");
      }
    } catch (e) {
      showToast("Failed to generate invite", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedInvite);
      showToast("Invite link copied to clipboard", "success");
    } catch (e) {
      showToast("Could not copy link", "error");
    }
  };

  const handleRevokeInvite = async (membershipId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${id}/members/${membershipId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchMembers();
        showToast("Invite revoked", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to revoke invite", "error");
      }
    } catch (e) {
      showToast("Failed to revoke invite", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddManualEvidence = async () => {
    if (!evidenceForm.title.trim() || !evidenceForm.category) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${id}/evidence/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evidenceForm),
      });
      if (res.ok) {
        setShowEvidenceModal(false);
        setEvidenceForm({
          title: "",
          description: "",
          category: "",
          work_type: "original",
          effort_band: "MEDIUM",
          start_date: "",
          end_date: "",
          artifact_url: "",
        });
        await fetchWorkspace();
        showToast("Evidence added successfully", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to add evidence", "error");
      }
    } catch (e) {
      showToast("Failed to add evidence", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setShowStatusModal(false);
        setPendingStatus(null);
        await fetchWorkspace();
        showToast(`Workspace status updated to ${newStatus}`, "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update status", "error");
      }
    } catch (e) {
      showToast("Failed to update status", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${id}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const report = await res.json();
        await fetchReports();
        showToast(`Report v${report.version} generated successfully`, "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to generate report", "error");
      }
    } catch (e) {
      showToast("Failed to generate report", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishReport = async (reportId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${id}/reports/${reportId}/publish`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchReports();
        await fetchWorkspace();
        showToast("Report published successfully", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to publish report", "error");
      }
    } catch (e) {
      showToast("Failed to publish report", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report? This will permanently remove the report version.")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${id}/reports/${reportId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchReports();
        showToast("Report deleted successfully", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete report", "error");
      }
    } catch (e) {
      showToast("Failed to delete report", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredEvidence = evidence.filter((item) => {
    if (filters.category !== "all" && item.category !== filters.category) return false;
    if (filters.source !== "all") {
      if (filters.source === "github" && !item.source?.startsWith("github")) return false;
      if (filters.source === "manual" && item.source !== "manual") return false;
    }
    if (filters.verification !== "all") {
      const state = (item.verification_state || "").toLowerCase();
      if (filters.verification === "verified" && state !== "provider_verified" && state !== "collaborator_confirmed") return false;
      if (filters.verification === "pending" && state !== "manual_submitted" && state !== "pending") return false;
      if (filters.verification === "disputed" && state !== "disputed") return false;
    }
    if (filters.search && !item.summary?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Workspace not found</h2>
          <Link href="/dashboard" className="text-coral-500 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const statusFlow = STATUS_FLOW[workspace.status];
  const catOptions = workspace.categories || [];
  const acceptedMembers = members.filter((m) => m.invitation_state === "accepted");
  const pendingInvites = members.filter((m) => m.invitation_state === "pending");
  const isLeader = myRole === "leader";

  return (
    <div className="min-h-screen bg-background">
      {toast && (
        <div className="fixed top-4 right-4 z-[100] glass rounded-xl p-4 shadow-lg flex items-center gap-3 max-w-sm border border-border">
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
          {toast.type === "info" && <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />}
          <p className="text-sm font-medium">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-auto text-muted hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold">{workspace.name}</h1>
              <p className="text-xs text-muted capitalize">{workspace.status.replace("_", " ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowChangelogModal(true)}
              className="btn-outline inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
              title="Generate AI Sprint & Release Notes"
            >
              <Sparkles className="w-3.5 h-3.5 text-coral-500" />
              <span className="hidden md:inline">Changelog</span>
            </button>

            <button
              onClick={() => setShowDossierModal(true)}
              className="btn-outline inline-flex items-center gap-1.5 text-xs py-1.5 px-3 text-amber-700 border-amber-200 hover:bg-amber-50"
              title="Export Hackathon Judge & Grading Dossier"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">Judge Dossier</span>
            </button>

            <button
              onClick={() => setShowDisputeModal(true)}
              className="btn-outline inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
              title="Dispute & Split-Credit Room"
            >
              <Scale className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden md:inline">Splits</span>
            </button>

            {integration && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="btn-outline inline-flex items-center gap-1.5 text-xs py-1.5 px-3 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-coral-500" : ""}`} />
                <span className="hidden sm:inline">{syncing ? "Syncing..." : "Sync GitHub"}</span>
              </button>
            )}
            <button
              onClick={handleGenerateReport}
              disabled={actionLoading}
              className="btn-coral inline-flex items-center gap-1.5 text-xs py-1.5 px-3 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              <span>Report</span>
            </button>

            {/* Profile Button */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 py-1 px-2 rounded-xl hover:bg-gray-100 transition-colors border border-border"
              title="View & edit your profile"
            >
              <div className="w-7 h-7 rounded-full bg-coral-500 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile?.name?.[0]?.toUpperCase() || "U"
                )}
              </div>
              <span className="text-xs font-semibold text-gray-700 max-w-[100px] truncate hidden sm:inline">
                {profile?.name || "Profile"}
              </span>
            </button>

            {isLeader && (
              <button
                onClick={() => setShowDeleteWorkspaceModal(true)}
                className="p-2 rounded-xl hover:bg-red-50 text-red-500 border border-transparent hover:border-red-200 transition-colors"
                title="Delete Workspace"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-1 mb-8 bg-white rounded-xl p-1 border border-border shadow-soft w-fit">
          {(["overview", "evidence", "reports"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-coral-500 text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-coral-50 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-coral-500" />
                  </div>
                  <span className="text-sm text-muted">Evidence Items</span>
                </div>
                <p className="text-2xl font-bold">{evidence.length}</p>
              </div>
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-sm text-muted">Members</span>
                </div>
                <p className="text-2xl font-bold">{acceptedMembers.length}</p>
              </div>
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-sm text-muted">Duration</span>
                </div>
                <p className="text-2xl font-bold">
                  {Math.max(
                    1,
                    Math.ceil(
                      (new Date(workspace.end_date).getTime() -
                        new Date(workspace.start_date).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )}{" "}
                  days
                </p>
              </div>
            </div>

            {/* Team Health, Bus Factor & Anti-Burnout Radar */}
            <TeamHealthRadar
              workspace={workspace}
              members={members}
              evidence={evidence}
            />

            {/* Members Section */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-coral-500" />
                  Team Members
                </h3>
                <button
                  onClick={() => {
                    setGeneratedInvite("");
                    setInviteExpiresAt("");
                    setShowInviteModal(true);
                  }}
                  disabled={!isLeader}
                  className={`btn-outline inline-flex items-center gap-2 text-sm ${!isLeader ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <UserPlus className="w-4 h-4" />
                  Invite Member
                </button>
              </div>
              {acceptedMembers.length === 0 && pendingInvites.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted mx-auto mb-4" />
                  <p className="text-muted">Just you so far. Invite your team.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {acceptedMembers.map((member) => {
                      const meta = member.user?.raw_user_meta_data || {};
                      const displayName = meta.name || meta.user_name || member.user?.email || (member.role === "leader" ? "Workspace Leader" : "Team Member");
                      const avatarUrl = meta.avatar_url;
                      const memberBadges = calculateContributorBadges(
                        meta.user_name || member.user_id,
                        member.user?.email,
                        evidence
                      );
                      const isMe = currentUserId === member.user_id;

                      return (
                        <div key={member.id} className="flex items-center gap-3.5 p-3.5 rounded-xl bg-gray-50/80 border border-gray-100 hover:bg-gray-100/80 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-coral-100 text-coral-700 flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0 border border-coral-200 shadow-sm">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                              displayName[0]?.toUpperCase() || "?"
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate text-foreground">
                                {displayName}
                              </p>
                              {isMe && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-coral-100 text-coral-700">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted truncate">
                              {meta.user_name ? `@${meta.user_name}` : member.user?.email || ""}
                            </p>
                            {memberBadges.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                {memberBadges.map((b) => (
                                  <span
                                    key={b.id}
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${b.bgColor} ${b.color} ${b.borderColor} flex items-center gap-1`}
                                    title={`${b.name}: ${b.description}`}
                                  >
                                    <span>{b.icon}</span>
                                    <span>{b.name}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${
                            member.role === "leader"
                              ? "bg-coral-50 text-coral-600 border border-coral-200 font-semibold"
                              : member.role === "reviewer"
                              ? "bg-purple-50 text-purple-600 border border-purple-200"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {member.role}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {pendingInvites.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-amber-700">
                        <Clock className="w-4 h-4 text-amber-500" />
                        Pending Invites ({pendingInvites.length})
                      </h4>
                      <div className="space-y-3">
                        {pendingInvites.map((inv) => {
                          const expiresAt = inv.invitation_expires_at
                            ? new Date(inv.invitation_expires_at)
                            : null;
                          const hoursLeft = expiresAt
                            ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)))
                            : 0;
                          return (
                            <div
                              key={inv.id}
                              className="flex items-center gap-4 p-3 rounded-xl bg-amber-50/60 border border-amber-100"
                            >
                              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                                <UserPlus className="w-4 h-4 text-amber-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">Pending invite</p>
                                <p className="text-xs text-muted">
                                  {inv.role === "reviewer" ? "Reviewer" : "Member"} role
                                  {expiresAt && ` · expires in ${hoursLeft}h`}
                                </p>
                              </div>
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                                Pending
                              </span>
                              {isLeader && (
                                <button
                                  onClick={() => handleRevokeInvite(inv.id)}
                                  disabled={actionLoading}
                                  className="btn-outline inline-flex items-center gap-1 text-xs py-1 px-2.5 text-red-500 border-red-200 hover:bg-red-50 disabled:opacity-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Revoke
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* GitHub Integration Card */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-coral-500" />
                  GitHub Integration
                </h3>
              </div>
              {integration ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm">
                      <Github className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">
                          {integration.selected_resources?.fullName || integration.selected_resources?.repo || "Connected Repository"}
                        </p>
                        <a
                          href={`https://github.com/${integration.selected_resources?.fullName || integration.selected_resources?.repo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted hover:text-foreground"
                          title="Open on GitHub"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {integration.last_synced_at ? `Last synced: ${formatDateTime(integration.last_synced_at)}` : "Not yet synced"}
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${
                      integration.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : integration.status === "error"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {integration.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="btn-coral inline-flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                      {syncing ? "Syncing Commits & PRs..." : "Sync Now"}
                    </button>
                    <button
                      onClick={() => setShowWebhookModal(true)}
                      className="btn-outline inline-flex items-center gap-2 text-sm"
                      title="Setup real-time GitHub Webhook"
                    >
                      <Webhook className="w-4 h-4 text-coral-500" />
                      Real-Time Webhook
                    </button>
                    <button
                      onClick={() => setShowDisconnectModal(true)}
                      className="btn-outline inline-flex items-center gap-2 text-sm text-red-500 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-gray-50 border border-gray-100 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <Github className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">No repository connected</h4>
                      <p className="text-xs text-muted">Connect your GitHub repository to auto-sync commits, pull requests, issues, and code reviews.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIntegrationError("");
                      setShowIntegrationModal(true);
                    }}
                    className="btn-coral inline-flex items-center gap-2 text-sm flex-shrink-0"
                  >
                    <GitBranch className="w-4 h-4" />
                    Connect Repository
                  </button>
                </div>
              )}
            </div>

            {/* Workspace Status Actions */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-coral-500" />
                  Workspace Lifecycle
                </h3>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${STATUS_COLORS[workspace.status] || "bg-gray-100 text-gray-700"}`}>
                  Current Status: {workspace.status.replace("_", " ")}
                </span>
              </div>
              {statusFlow && isLeader && (
                <button
                  onClick={() => { setPendingStatus(statusFlow.next); setShowStatusModal(true); }}
                  className="btn-outline inline-flex items-center gap-2 text-sm"
                >
                  {statusFlow.icon && <statusFlow.icon className="w-4 h-4 text-coral-500" />}
                  {statusFlow.label}
                </button>
              )}
            </div>

            {/* Categories & Weights */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-coral-500" />
                Category Weight Configuration
              </h3>
              <div className="space-y-3">
                {catOptions.map((cat: CategoryConfig) => {
                  const weight = cat.weight || 0;
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{cat.name}</span>
                        <span className="text-sm text-muted">{Math.round(weight * 100)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-coral-500 rounded-full transition-all"
                          style={{ width: `${weight * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Danger Zone: Delete Workspace */}
            {isLeader && (
              <div className="card p-6 border-red-200 bg-red-50/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-red-700 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-600" />
                      Danger Zone
                    </h3>
                    <p className="text-xs text-muted mt-1 max-w-xl">
                      Permanently delete this workspace and all associated data, including synced GitHub evidence, reports, disputes, and team memberships. This action cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteWorkspaceModal(true)}
                    className="btn-outline border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 inline-flex items-center gap-2 text-sm flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="card overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Evidence Timeline & Work Stream</h3>
                <p className="text-sm text-muted mt-0.5">
                  {evidence.length} total verified & manual contribution events
                </p>
              </div>
              <button
                onClick={() => {
                  setEvidenceForm({
                    title: "",
                    description: "",
                    category: catOptions[0]?.id || "development",
                    work_type: "original",
                    effort_band: "MEDIUM",
                    start_date: new Date().toISOString().split("T")[0],
                    end_date: "",
                    artifact_url: "",
                  });
                  setShowEvidenceModal(true);
                }}
                className="btn-coral inline-flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Manual Evidence
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-border bg-gray-50/70">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  <Filter className="w-3.5 h-3.5" />
                  Filter:
                </div>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                  className="input-field text-xs py-1.5 px-3 max-w-[160px]"
                >
                  <option value="all">All Categories</option>
                  {catOptions.map((cat: CategoryConfig) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <select
                  value={filters.source}
                  onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}
                  className="input-field text-xs py-1.5 px-3 max-w-[140px]"
                >
                  <option value="all">All Sources</option>
                  <option value="github">GitHub</option>
                  <option value="manual">Manual</option>
                </select>
                <select
                  value={filters.verification}
                  onChange={(e) => setFilters((prev) => ({ ...prev, verification: e.target.value }))}
                  className="input-field text-xs py-1.5 px-3 max-w-[140px]"
                >
                  <option value="all">All Status</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="disputed">Disputed</option>
                </select>
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Search evidence message, author, or SHA..."
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    className="input-field text-xs py-1.5 px-3 flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="divide-y divide-border">
              {filteredEvidence.length === 0 ? (
                <div className="p-12 text-center">
                  <BarChart3 className="w-12 h-12 text-muted mx-auto mb-4 opacity-40" />
                  <p className="text-muted font-medium">
                    {evidence.length === 0
                      ? "No evidence yet. Connect GitHub and sync, or submit manual artifacts."
                      : "No evidence matches your filters."}
                  </p>
                </div>
              ) : (
                filteredEvidence.map((item) => {
                  const meta = (item.metadata || {}) as Record<string, any>;
                  const conventional = meta.conventionalType;
                  const confirmations = meta.confirmations || [];

                  return (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-gray-50/70 transition-colors flex items-start gap-3.5 group"
                    >
                      <div className="mt-1">
                        {item.verification_state === "provider_verified" || item.verification_state === "collaborator_confirmed" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : item.verification_state === "disputed" ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          {conventional && (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wider ${CONVENTIONAL_COLORS[conventional] || "bg-gray-100 text-gray-700"}`}>
                              {conventional}
                            </span>
                          )}
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                            {item.event_type || item.source}
                          </span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-coral-50 text-coral-700 capitalize">
                            {(item.category || "development").replace("_", " ")}
                          </span>
                          {item.is_bot_generated && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                              Bot
                            </span>
                          )}
                          {confirmations.length > 0 && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCheck className="w-3 h-3" />
                              {confirmations.length} Co-signed
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {item.source_url?.includes("figma.com") && (
                            <PlatformIcon platform="figma" className="w-4 h-4 flex-shrink-0" />
                          )}
                          {item.source_url?.includes("loom.com") && (
                            <PlatformIcon platform="loom" className="w-4 h-4 flex-shrink-0" />
                          )}
                          <p className="text-sm font-medium truncate text-foreground">{item.summary}</p>
                          {item.source_url && (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                              title="View Source Link"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                          <span className="font-medium text-gray-700">
                            {item.actor_username || item.actor_email || "Unattributed"}
                          </span>
                          <span>·</span>
                          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                          <span>·</span>
                          <span className="uppercase">{item.source}</span>
                          {item.impact_factor && item.impact_factor > 1 && (
                            <>
                              <span>·</span>
                              <span className="text-coral-600 font-medium">Impact: {item.impact_factor.toFixed(1)}x</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Co-signing button for manual non-code evidence */}
                      {item.source === "manual" && item.verification_state !== "collaborator_confirmed" && (
                        <button
                          onClick={() => handleConfirmEvidence(item.id)}
                          disabled={actionLoading}
                          className="btn-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 flex-shrink-0"
                          title="Co-sign & verify this teammate's contribution"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Co-sign
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-coral-500" />
                  Generated Reports & Fair Attribution
                </h3>
                <button
                  onClick={handleGenerateReport}
                  disabled={actionLoading}
                  className="btn-coral inline-flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Generate Provisional Report
                </button>
              </div>
              {reports.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-12 h-12 text-muted mx-auto mb-4 opacity-40" />
                  <p className="text-muted font-medium mb-1">No reports generated yet</p>
                  <p className="text-sm text-muted">Generate a report to analyze member contributions using the scoring algorithm.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="border rounded-xl p-5 hover:bg-gray-50/60 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-bold">Report v{report.version}</span>
                          <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${
                            report.status === "published"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {report.status}
                          </span>
                          <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${
                            report.overall_confidence === "HIGH"
                              ? "bg-green-100 text-green-700"
                              : report.overall_confidence === "MEDIUM"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {report.overall_confidence} Confidence
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/verify/${report.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-outline inline-flex items-center gap-1.5 text-xs py-1.5 px-3 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            title="View Public Proof-of-Work Certificate"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Public Certificate
                          </Link>
                          <Link
                            href={`/workspaces/${id}/reports/${report.id}`}
                            className="btn-outline inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Full Report
                          </Link>
                          {report.status === "provisional" && isLeader && (
                            <button
                              onClick={() => handlePublishReport(report.id)}
                              disabled={actionLoading}
                              className="btn-coral inline-flex items-center gap-1 text-xs py-1.5 px-3"
                            >
                              <Award className="w-3.5 h-3.5" />
                              Publish
                            </button>
                          )}
                          {isLeader && (
                            <button
                              onClick={() => handleDeleteReport(report.id)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
                              title="Delete this report"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted">
                        <span>Coverage: {formatPercent(report.coverage_score)}</span>
                        <span>·</span>
                        <span>{report.member_results?.length || 0} members evaluated</span>
                        <span>·</span>
                        <span>Generated {formatDateTime(report.created_at)}</span>
                      </div>

                      {/* Member Breakdown */}
                      {report.member_results && report.member_results.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Contribution Breakdown</h4>
                          <div className="space-y-2.5">
                            {report.member_results.map((member: any) => (
                              <div key={member.userId} className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-coral-100 text-coral-700 flex items-center justify-center text-xs font-semibold">
                                  {member.displayName?.[0] || "?"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium truncate">
                                      {member.displayName || member.email}
                                    </span>
                                    <span className="text-sm font-bold text-coral-600">{member.contributionShare.toFixed(1)}%</span>
                                  </div>
                                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-coral-500 rounded-full transition-all"
                                      style={{ width: `${Math.min(100, member.contributionShare)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Connect GitHub Integration Modal */}
      {showIntegrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4" onClick={() => setShowIntegrationModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Github className="w-5 h-5" />
                Connect GitHub Repository
              </h3>
              <button onClick={() => setShowIntegrationModal(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {integrationError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{integrationError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Repository (owner/repo or URL)</label>
                <input
                  type="text"
                  value={integrationRepo}
                  onChange={(e) => setIntegrationRepo(e.target.value)}
                  placeholder="e.g. facebook/react or https://github.com/owner/repo"
                  className="input-field w-full text-sm"
                />
                <p className="text-xs text-muted mt-1">Works with any public or private GitHub repository.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Personal Access Token <span className="text-xs text-muted font-normal">(Optional)</span>
                </label>
                <input
                  type="password"
                  value={integrationToken}
                  onChange={(e) => setIntegrationToken(e.target.value)}
                  placeholder="ghp_... (for private repositories)"
                  className="input-field w-full text-sm font-mono"
                />
                <p className="text-xs text-muted mt-1">Only required for private repos or to bypass GitHub public rate limits.</p>
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button onClick={() => setShowIntegrationModal(false)} className="btn-outline text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleConnectIntegration}
                  disabled={actionLoading || !integrationRepo.trim()}
                  className="btn-coral text-sm disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
                  {actionLoading ? "Connecting & Verifying..." : "Connect Repository"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Evidence Modal */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4" onClick={() => setShowEvidenceModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-coral-500" />
                Add Multi-Role Contribution Evidence
              </h3>
              <button onClick={() => setShowEvidenceModal(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Contribution Title</label>
                <input
                  type="text"
                  value={evidenceForm.title}
                  onChange={(e) => setEvidenceForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Designed Mobile UI System in Figma / Conducted User Interviews"
                  className="input-field w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description & Scope</label>
                <textarea
                  value={evidenceForm.description}
                  onChange={(e) => setEvidenceForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Detail what was built, key milestones delivered, components created..."
                  rows={3}
                  className="input-field w-full text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Category</label>
                  <select
                    value={evidenceForm.category}
                    onChange={(e) => setEvidenceForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="input-field w-full text-sm"
                  >
                    {catOptions.map((cat: CategoryConfig) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Work Type</label>
                  <select
                    value={evidenceForm.work_type}
                    onChange={(e) => setEvidenceForm((prev) => ({ ...prev, work_type: e.target.value }))}
                    className="input-field w-full text-sm capitalize"
                  >
                    {WORK_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Effort Band</label>
                  <select
                    value={evidenceForm.effort_band}
                    onChange={(e) => setEvidenceForm((prev) => ({ ...prev, effort_band: e.target.value }))}
                    className="input-field w-full text-sm"
                  >
                    {EFFORT_BAND_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Artifact Link (Figma, Loom, Docs)</label>
                  <input
                    type="url"
                    value={evidenceForm.artifact_url}
                    onChange={(e) => {
                      const val = e.target.value;
                      const unfurled = unfurlArtifactUrl(val);
                      setDetectedArtifact(unfurled);
                      setEvidenceForm((prev) => ({
                        ...prev,
                        artifact_url: val,
                        category: unfurled ? unfurled.defaultCategory : prev.category,
                        title: !prev.title && unfurled ? unfurled.suggestedTitle : prev.title,
                        work_type: unfurled ? unfurled.suggestedWorkType : prev.work_type,
                      }));
                    }}
                    placeholder="https://figma.com/... or https://loom.com/..."
                    className="input-field w-full text-sm"
                  />
                  {detectedArtifact && (
                    <div className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${detectedArtifact.badgeColor}`}>
                      <PlatformIcon platform={detectedArtifact.platform} className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <span className="font-bold block">{detectedArtifact.label} detected!</span>
                        <span className="opacity-90">Auto-configured category to {detectedArtifact.defaultCategory.replace("_", " ")}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Date</label>
                <input
                  type="date"
                  value={evidenceForm.start_date}
                  onChange={(e) => setEvidenceForm((prev) => ({ ...prev, start_date: e.target.value }))}
                  className="input-field w-full text-sm"
                />
              </div>
              <div className="flex items-center gap-3 justify-end pt-2">
                <button onClick={() => setShowEvidenceModal(false)} className="btn-outline text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleAddManualEvidence}
                  disabled={actionLoading || !evidenceForm.title.trim() || !evidenceForm.category}
                  className="btn-coral text-sm disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Submit Evidence
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="input-field w-full text-sm"
                >
                  <option value="member">Member</option>
                  <option value="reviewer">Reviewer</option>
                </select>
                <p className="text-xs text-muted mt-1">Leader role is auto-assigned to workspace creator.</p>
              </div>

              {!generatedInvite ? (
                <button
                  onClick={handleGenerateInvite}
                  disabled={actionLoading}
                  className="btn-coral w-full inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  Generate 24-Hour Invite Link
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Shareable Invite Link</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedInvite}
                        onFocus={(e) => e.target.select()}
                        className="input-field w-full text-xs font-mono"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="btn-outline inline-flex items-center gap-1 text-xs px-3 py-2 flex-shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-muted mt-1.5">
                      {inviteExpiresAt && `Expires in 24 hours (${new Date(inviteExpiresAt).toLocaleDateString()})`}
                    </p>
                  </div>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Join our TeamTrack AI workspace: ${generatedInvite}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline w-full inline-flex items-center justify-center gap-2 text-sm text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Share on WhatsApp
                  </a>
                </div>
              )}

              <div className="flex items-center gap-3 justify-end pt-2">
                <button onClick={() => setShowInviteModal(false)} className="btn-outline text-sm">
                  {generatedInvite ? "Done" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Integration Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4" onClick={() => setShowDisconnectModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Disconnect GitHub</h3>
              <button onClick={() => setShowDisconnectModal(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted mb-6">
              Are you sure you want to disconnect this GitHub repository? Synced evidence items will remain preserved.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setShowDisconnectModal(false)} className="btn-outline text-sm">
                Cancel
              </button>
              <button
                onClick={handleDisconnectIntegration}
                disabled={actionLoading}
                className="btn-coral text-sm disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {showStatusModal && pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4" onClick={() => setShowStatusModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Change Workspace Status</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-muted">
                Transitioning from{" "}
                <span className="font-semibold capitalize text-foreground">{workspace.status.replace("_", " ")}</span> to{" "}
                <span className="font-semibold capitalize text-foreground">{pendingStatus.replace("_", " ")}</span>.
              </p>
            </div>
            <p className="text-xs text-muted mb-6">
              {pendingStatus === "active" && "The workspace will become active and members can start contributing evidence."}
              {pendingStatus === "frozen" && "The workspace will be frozen for review. No new evidence can be added."}
              {pendingStatus === "under_review" && "The workspace will enter review mode. Reports can be generated and published."}
              {pendingStatus === "published" && "The report will be published and the workspace will be finalized."}
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setShowStatusModal(false)} className="btn-outline text-sm">
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(pendingStatus)}
                disabled={actionLoading}
                className="btn-coral text-sm disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-coral-500" />
                Your Profile & Identity
              </h3>
              <button onClick={() => setShowProfileModal(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 mb-5">
              <div className="w-14 h-14 rounded-full bg-coral-100 text-coral-700 flex items-center justify-center text-lg font-bold overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile?.name?.[0]?.toUpperCase() || "U"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-base truncate text-foreground">{profile?.name || "Developer"}</h4>
                {profile?.username && (
                  <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                    <Github className="w-3.5 h-3.5" />
                    @{profile.username}
                  </p>
                )}
                <p className="text-xs text-muted truncate">{profile?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  placeholder="e.g. Alice Chen"
                  className="input-field w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Declared Contribution Roles
                </label>
                <input
                  type="text"
                  value={profileRolesInput}
                  onChange={(e) => setProfileRolesInput(e.target.value)}
                  placeholder="e.g. Full-stack Developer, Team Lead, UI/UX Designer"
                  className="input-field w-full text-sm"
                />
                <p className="text-[11px] text-muted mt-1">
                  Comma-separated list of your primary responsibilities (used for fair scoring categorization).
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="btn-outline text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateProfile}
                  disabled={actionLoading}
                  className="btn-coral text-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Workspace Confirmation Modal */}
      {showDeleteWorkspaceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setShowDeleteWorkspaceModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-red-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <button
                onClick={() => setShowDeleteWorkspaceModal(false)}
                className="text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Delete &ldquo;{workspace.name}&rdquo;?
            </h3>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              Are you sure you want to permanently delete this workspace? All contribution records, synced commits &amp; PRs, generated reports, and member associations will be erased immediately.
            </p>

            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteWorkspaceModal(false)}
                disabled={actionLoading}
                className="btn-outline text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteWorkspace}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Yes, Delete Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Changelog Modal */}
      {showChangelogModal && (
        <ChangelogModal
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          onClose={() => setShowChangelogModal(false)}
        />
      )}

      {/* Hackathon Judge & Grading Dossier Modal */}
      {showDossierModal && (
        <HackathonDossierModal
          workspace={workspace}
          members={members}
          evidence={evidence}
          reports={reports}
          onClose={() => setShowDossierModal(false)}
        />
      )}

      {/* Dispute & Split-Credit Room Modal */}
      {showDisputeModal && (
        <DisputeRoomModal
          workspaceId={workspace.id}
          evidenceItems={evidence}
          isLeader={isLeader}
          onClose={() => setShowDisputeModal(false)}
        />
      )}

      {/* Real-Time GitHub Webhook Setup Modal */}
      {showWebhookModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setShowWebhookModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-coral-50 text-coral-600 flex items-center justify-center shadow-sm">
                  <Webhook className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    GitHub Real-Time Webhook
                  </h3>
                  <p className="text-xs text-muted">
                    Auto-sync every push, PR, and review with 0 manual clicks.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWebhookModal(false)}
                className="text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Payload URL
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-200 font-mono text-xs text-gray-800">
                  <span className="flex-1 truncate">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/webhooks/github`
                      : "https://your-domain.com/api/webhooks/github"}
                  </span>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/api/webhooks/github`;
                      navigator.clipboard.writeText(url);
                      setCopiedWebhookUrl(true);
                      setTimeout(() => setCopiedWebhookUrl(false), 2000);
                    }}
                    className="btn-coral text-xs py-1 px-2.5 flex-shrink-0"
                  >
                    {copiedWebhookUrl ? "Copied!" : "Copy URL"}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 space-y-2">
                <p className="font-bold">Setup in 30 seconds on GitHub:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Go to your GitHub repo &rarr; <strong>Settings</strong> &rarr; <strong>Webhooks</strong>.</li>
                  <li>Click <strong>Add webhook</strong> and paste the <strong>Payload URL</strong> above.</li>
                  <li>Set Content type to <strong>application/json</strong>.</li>
                  <li>Under events, select <strong>&ldquo;Send me everything&rdquo;</strong> (or Pushes &amp; Pull requests).</li>
                  <li>Click <strong>Add webhook</strong> &mdash; you&rsquo;re ready!</li>
                </ol>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="btn-coral text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}