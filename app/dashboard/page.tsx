"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowRight,
  BarChart3,
  Users,
  Calendar,
  Loader2,
  LogOut,
  Github,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";

import { createBrowserClient } from "@supabase/ssr";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string;
  member_count: number;
  evidence_count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [profile, setProfile] = useState<{
    id: string;
    name: string;
    username: string;
    email: string;
    avatarUrl: string;
    declaredRoles: string[];
  } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchWorkspaces();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkspace = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!workspaceToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceToDelete.id));
        setWorkspaceToDelete(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete workspace");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete workspace");
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    router.push("/login");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "draft":
        return "bg-amber-50 text-amber-600 border-amber-200";
      case "frozen":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "under_review":
        return "bg-purple-50 text-purple-600 border-purple-200";
      case "published":
        return "bg-coral-50 text-coral-600 border-coral-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-coral-500 flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">TeamTrack AI</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-6 h-6 rounded-full bg-coral-500 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile?.name?.[0]?.toUpperCase() || "U"
                )}
              </div>
              <div className="text-xs">
                <span className="font-semibold text-foreground block max-w-[120px] truncate">
                  {profile?.name || "Developer"}
                </span>
                {profile?.username && (
                  <span className="text-[10px] text-muted flex items-center gap-0.5">
                    @{profile.username}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-muted hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Workspaces</h1>
            <p className="text-muted">
              {workspaces.length > 0
                ? `Managing ${workspaces.length} workspace${workspaces.length !== 1 ? "s" : ""}`
                : "Create your first workspace to get started"}
            </p>
          </div>
          <Link
            href="/workspaces/new"
            className="btn-coral inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Workspace
          </Link>
        </div>

        {/* Workspaces Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="card p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-coral-50 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-coral-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No workspaces yet</h3>
            <p className="text-muted mb-6">
              Create a workspace to start tracking your team&apos;s contributions.
            </p>
            <Link href="/workspaces/new" className="btn-coral inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Workspace
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((ws) => (
              <Link
                key={ws.id}
                href={`/workspaces/${ws.id}`}
                className="card p-6 group block"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-coral-50 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-coral-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(
                        ws.status
                      )}`}
                    >
                      {ws.status.replace("_", " ")}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setWorkspaceToDelete(ws);
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete workspace"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-1 group-hover:text-coral-500 transition-colors">
                  {ws.name}
                </h3>
                {ws.description && (
                  <p className="text-sm text-muted mb-4 line-clamp-2">{ws.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-muted mb-4">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{ws.member_count || 0} members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4" />
                    <span>{ws.evidence_count || 0} items</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-muted pt-4 border-t border-border">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(ws.start_date).toLocaleDateString()} —{" "}
                    {new Date(ws.end_date).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-coral-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Open workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Delete Workspace Confirmation Modal */}
      {workspaceToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setWorkspaceToDelete(null)}
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
                onClick={() => setWorkspaceToDelete(null)}
                className="text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Delete &ldquo;{workspaceToDelete.name}&rdquo;?
            </h3>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              Are you sure you want to delete this workspace? This will permanently erase all contribution records, synced GitHub commits &amp; PRs, generated reports, and remove all member associations.
            </p>

            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setWorkspaceToDelete(null)}
                disabled={deleting}
                className="btn-outline text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteWorkspace}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Yes, Delete Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}