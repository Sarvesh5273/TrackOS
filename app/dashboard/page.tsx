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
} from "lucide-react";

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
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchWorkspaces();
    fetchUser();
  }, []);

  const fetchUser = async () => {
    // Replace with your actual Supabase auth call
    // const { data } = await supabase.auth.getUser();
    // setUser(data.user);
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

  const handleLogout = async () => {
    // Replace with your actual Supabase signOut
    // await supabase.auth.signOut();
    router.push("/");
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
            <div className="w-8 h-8 rounded-lg bg-coral-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">TeamTrack AI</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Github className="w-4 h-4" />
              <span>{user?.email || "Developer"}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-muted" />
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
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      ws.status
                    )}`}
                  >
                    {ws.status}
                  </span>
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
    </div>
  );
}