"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { formatDateTime, formatPercent } from "@/lib/utils";
import type { CategoryConfig, ContributionCategory } from "@/types";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string;
  categories: CategoryConfig[];
  weights: Record<string, number>;
}

interface Evidence {
  id: string;
  source: string;
  type: string;
  summary: string;
  category: string;
  actor_identity: string;
  timestamp: string;
  verification_status: string;
  is_bot_generated: boolean;
}

interface Member {
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

interface Integration {
  id: string;
  workspace_id: string;
  provider: string;
  status: string;
  selected_resources: any;
  connected_at: string;
  last_synced_at: string | null;
  error_message: string | null;
}

interface Report {
  id: string;
  workspace_id: string;
  version: number;
  status: string;
  member_results: any[];
  overall_confidence: string;
  coverage_score: number;
  limitations: string | null;
  created_at: string;
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

const WORK_TYPE_OPTIONS = ["original", "collaboration", "review", "coordination", "presentation"];
const EFFORT_BAND_OPTIONS = ["SMALL", "MEDIUM", "LARGE", "EXTENSIVE"];

export default function WorkspaceDetailPage() {
  const { id } = useParams();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
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

  const [inviteRole, setInviteRole] = useState("member");
  const [generatedInvite, setGeneratedInvite] = useState("");
  const [inviteExpiresAt, setInviteExpiresAt] = useState("");
  const [myRole, setMyRole] = useState("member");
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
  const [filters, setFilters] = useState({
    category: "all",
    source: "all",
    verification: "all",
    search: "",
  });
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchWorkspace();
    fetchMembers();
  }, [id]);

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

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/workspaces/${id}/sync`, { method: "POST" });
      if (res.ok) {
        await fetchWorkspace();
        showToast("Sync completed successfully", "success");
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

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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

  const handleConnectIntegration = async () => {
    if (!integrationRepo.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${id}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "github", config: { repo: integrationRepo } }),
      });
      if (res.ok) {
        setShowIntegrationModal(false);
        setIntegrationRepo("");
        await fetchIntegration();
        showToast("GitHub integration connected", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to connect GitHub", "error");
      }
    } catch (e) {
      showToast("Failed to connect GitHub", "error");
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

  const handleExportPDF = (reportId: string) => {
    console.log("Export PDF for report:", reportId);
    showToast("PDF export started (stub)", "info");
  };

  const filteredEvidence = evidence.filter((item) => {
    if (filters.category !== "all" && item.category !== filters.category) return false;
    if (filters.source !== "all") {
      if (filters.source === "github" && !item.source?.startsWith("github")) return false;
      if (filters.source === "manual" && item.source !== "manual") return false;
    }
    if (filters.verification !== "all" && item.verification_status !== filters.verification) return false;
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
        <div className="fixed top-4 right-4 z-[100] glass rounded-xl p-4 shadow-lg flex items-center gap-3 max-w-sm">
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
              <p className="text-xs text-muted">{workspace.status}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-outline inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {syncing ? "Syncing..." : "Sync GitHub"}
            </button>
            <Link
              href={`/workspaces/${id}/reports/generate`}
              className="btn-coral inline-flex items-center gap-2 text-sm"
            >
              <FileText className="w-4 h-4" />
              Generate Report
            </Link>
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
                  {Math.ceil(
                    (new Date(workspace.end_date).getTime() -
                      new Date(workspace.start_date).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{" "}
                  days
                </p>
              </div>
            </div>

            {/* Members Section */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" />
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
                  <div className="space-y-3">
                    {acceptedMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                          {member.user?.raw_user_meta_data?.name?.[0] || member.user?.email?.[0] || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.user?.raw_user_meta_data?.name || member.user?.email || "Unknown"}
                          </p>
                          <p className="text-xs text-muted truncate">{member.user?.email || ""}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          member.role === "leader"
                            ? "bg-coral-50 text-coral-600"
                            : member.role === "reviewer"
                            ? "bg-purple-50 text-purple-600"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {member.role === "leader" ? "Leader" : member.role === "reviewer" ? "Reviewer" : "Member"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {pendingInvites.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
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
                              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
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
                                  className="btn-outline inline-flex items-center gap-1 text-xs py-1.5 px-3 text-red-500 border-red-200 hover:bg-red-50 disabled:opacity-50"
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

            {/* GitHub Integration */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  GitHub Integration
                </h3>
              </div>
              {integration ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                      <Github className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{integration.selected_resources?.repo || integration.config?.repo || "Connected"}</p>
                      <p className="text-xs text-muted">
                        {integration.last_synced_at ? `Last synced: ${formatDateTime(integration.last_synced_at)}` : "Not yet synced"}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      integration.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : integration.status === "error"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {integration.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="btn-outline inline-flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                      {syncing ? "Syncing..." : "Sync Now"}
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setShowIntegrationModal(true); }}
                    className="btn-coral inline-flex items-center gap-2 text-sm"
                  >
                    <GitBranch className="w-4 h-4" />
                    Connect GitHub
                  </button>
                  <p className="text-xs text-muted">Connect your repository to sync commits, PRs, and issues</p>
                </div>
              )}
            </div>

            {/* Workspace Status Actions */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Workspace Status
                </h3>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${STATUS_COLORS[workspace.status] || "bg-gray-100 text-gray-700"}`}>
                  {workspace.status.replace("_", " ")}
                </span>
              </div>
              {statusFlow && (
                <button
                  onClick={() => { setPendingStatus(statusFlow.next); setShowStatusModal(true); }}
                  className="btn-coral inline-flex items-center gap-2 text-sm"
                >
                  {statusFlow.icon && <statusFlow.icon className="w-4 h-4" />}
                  {statusFlow.label}
                </button>
              )}
            </div>

            {/* Categories & Weights */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Category Weights</h3>
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
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="card overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold">Evidence Timeline</h3>
              <p className="text-sm text-muted mt-1">
                {evidence.length} items collected
              </p>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-border bg-gray-50">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted" />
                  <span className="text-xs font-medium text-muted">Filters:</span>
                </div>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                  className="input-field text-xs py-1.5 px-3"
                >
                  <option value="all">All Categories</option>
                  {catOptions.map((cat: CategoryConfig) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <select
                  value={filters.source}
                  onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}
                  className="input-field text-xs py-1.5 px-3"
                >
                  <option value="all">All Sources</option>
                  <option value="github">GitHub</option>
                  <option value="manual">Manual</option>
                </select>
                <select
                  value={filters.verification}
                  onChange={(e) => setFilters((prev) => ({ ...prev, verification: e.target.value }))}
                  className="input-field text-xs py-1.5 px-3"
                >
                  <option value="all">All Status</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="PENDING">Pending</option>
                  <option value="DISPUTED">Disputed</option>
                </select>
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Search evidence..."
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    className="input-field text-xs py-1.5 px-3 flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Add Manual Evidence Button */}
            <div className="p-4 border-b border-border">
              <button
                onClick={() => {
                  setEvidenceForm({
                    title: "",
                    description: "",
                    category: catOptions[0]?.id || "",
                    work_type: "original",
                    effort_band: "MEDIUM",
                    start_date: "",
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

            <div className="divide-y divide-border">
              {filteredEvidence.length === 0 ? (
                <div className="p-12 text-center">
                  <BarChart3 className="w-12 h-12 text-muted mx-auto mb-4" />
                  <p className="text-muted">
                    {evidence.length === 0
                      ? "No evidence yet. Sync with GitHub or add manual evidence to start."
                      : "No evidence matches the current filters."}
                  </p>
                </div>
              ) : (
                filteredEvidence.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4"
                  >
                    <div className="mt-0.5">
                      {item.verification_status === "VERIFIED" || item.verification_status === "provider_verified" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : item.verification_status === "DISPUTED" ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                          {item.type}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-coral-50 text-coral-600">
                          {item.category}
                        </span>
                        {item.is_bot_generated && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-red-50 text-red-600">
                            Bot
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{item.summary}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                        <span>{item.actor_identity}</span>
                        <span>·</span>
                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                        <span>·</span>
                        <span className="uppercase">{item.source}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Reports
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
                  <FileText className="w-12 h-12 text-muted mx-auto mb-4" />
                  <p className="text-muted mb-2">No reports yet</p>
                  <p className="text-sm text-muted">Generate a provisional report to see contribution breakdowns.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="border rounded-xl p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">v{report.version}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${
                            report.status === "published"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {report.status}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${
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
                          {report.status === "provisional" && workspace.status === "under_review" && (
                            <button
                              onClick={() => handlePublishReport(report.id)}
                              disabled={actionLoading}
                              className="btn-coral inline-flex items-center gap-1 text-xs py-1.5 px-3"
                            >
                              <Award className="w-3 h-3" />
                              Publish
                            </button>
                          )}
                          <button
                            onClick={() => handleExportPDF(report.id)}
                            className="btn-outline inline-flex items-center gap-1 text-xs py-1.5 px-3"
                          >
                            <Download className="w-3 h-3" />
                            Export PDF
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted">
                        <span>Coverage: {formatPercent(report.coverage_score)}</span>
                        <span>·</span>
                        <span>{report.member_results?.length || 0} members</span>
                        <span>·</span>
                        <span>Generated {formatDateTime(report.created_at)}</span>
                      </div>

                      {/* Member Breakdown */}
                      {report.member_results && report.member_results.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <h4 className="text-sm font-semibold mb-3">Member Breakdown</h4>
                          <div className="space-y-2">
                            {report.member_results.map((member: any) => (
                              <div key={member.userId} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                  {member.displayName?.[0] || "?"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium truncate">
                                      {member.displayName || member.email}
                                    </span>
                                    <span className="text-sm font-bold">{member.contributionShare.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex h-2 rounded-full overflow-hidden">
                                    {(member.categoryResults || []).map((cat: any) => (
                                      <div
                                        key={cat.category}
                                        className="bg-coral-500"
                                        style={{ width: `${(cat.normalizedValue || 0) * 100}%` }}
                                      />
                                    ))}
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

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
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
                  className="input-field w-full"
                >
                  <option value="member">Member</option>
                  <option value="reviewer">Reviewer</option>
                </select>
                <p className="text-xs text-muted mt-1">Leader role is auto-assigned to the workspace creator</p>
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
                  Generate Invite Link
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
                        className="input-field w-full text-xs"
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
                      {inviteExpiresAt && `Link expires in 24 hours (${new Date(inviteExpiresAt).toLocaleString()})`}
                    </p>
                  </div>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Join my TeamTrack workspace: ${generatedInvite}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline w-full inline-flex items-center justify-center gap-2 text-sm text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Share on WhatsApp
                  </a>
                </div>
              )}

              <div className="flex items-center gap-3 justify-end">
                <button onClick={() => setShowInviteModal(false)} className="btn-outline text-sm">
                  {generatedInvite ? "Done" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Evidence Modal */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowEvidenceModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Manual Evidence</h3>
              <button onClick={() => setShowEvidenceModal(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Title</label>
                <input
                  type="text"
                  value={evidenceForm.title}
                  onChange={(e) => setEvidenceForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Evidence title"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea
                  value={evidenceForm.description}
                  onChange={(e) => setEvidenceForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the evidence"
                  rows={3}
                  className="input-field w-full resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Category</label>
                  <select
                    value={evidenceForm.category}
                    onChange={(e) => setEvidenceForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="input-field w-full"
                  >
                    <option value="">Select category</option>
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
                    className="input-field w-full"
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
                    className="input-field w-full"
                  >
                    {EFFORT_BAND_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Artifact URL (optional)</label>
                  <input
                    type="url"
                    value={evidenceForm.artifact_url}
                    onChange={(e) => setEvidenceForm((prev) => ({ ...prev, artifact_url: e.target.value }))}
                    placeholder="https://..."
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={evidenceForm.start_date}
                    onChange={(e) => setEvidenceForm((prev) => ({ ...prev, start_date: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={evidenceForm.end_date}
                    onChange={(e) => setEvidenceForm((prev) => ({ ...prev, end_date: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 justify-end">
                <button onClick={() => setShowEvidenceModal(false)} className="btn-outline text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleAddManualEvidence}
                  disabled={actionLoading || !evidenceForm.title.trim() || !evidenceForm.category}
                  className="btn-coral text-sm disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Evidence
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect GitHub Integration Modal */}
      {showIntegrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowIntegrationModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Connect GitHub Repository</h3>
              <button onClick={() => setShowIntegrationModal(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Repository URL</label>
                <input
                  type="text"
                  value={integrationRepo}
                  onChange={(e) => setIntegrationRepo(e.target.value)}
                  placeholder="owner/repo"
                  className="input-field w-full"
                />
                <p className="text-xs text-muted mt-1">Format: owner/repo (e.g., acme/my-project)</p>
              </div>
              <div className="flex items-center gap-3 justify-end">
                <button onClick={() => setShowIntegrationModal(false)} className="btn-outline text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleConnectIntegration}
                  disabled={actionLoading || !integrationRepo.trim() || !/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(integrationRepo)}
                  className="btn-coral text-sm disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
                  Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Integration Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowDisconnectModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Disconnect GitHub</h3>
              <button onClick={() => setShowDisconnectModal(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted mb-6">
              Are you sure you want to disconnect this GitHub integration? All synced evidence will remain but new syncs will stop.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setShowDisconnectModal(false)} className="btn-outline text-sm">
                Cancel
              </button>
              <button
                onClick={handleDisconnectIntegration}
                disabled={actionLoading}
                className="btn-coral text-sm disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowStatusModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Change Workspace Status</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <p className="text-sm text-muted">
                This will change the workspace status from{" "}
                <span className="font-medium capitalize">{workspace.status.replace("_", " ")}</span> to{" "}
                <span className="font-medium capitalize">{pendingStatus.replace("_", " ")}</span>.
              </p>
            </div>
            <p className="text-sm text-muted mb-6">
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
                className="btn-coral text-sm disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}