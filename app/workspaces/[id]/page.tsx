"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  KanbanSquare,
  Newspaper,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { taskKeyOf } from "@/lib/tasks";
import type { MembershipRole, Task, TeamMember, Workspace } from "@/types";
import BoardTab from "@/components/workspace/BoardTab";
import ActivityTab from "@/components/workspace/ActivityTab";
import TeamTab from "@/components/workspace/TeamTab";
import ReportTab from "@/components/workspace/ReportTab";
import DigestModal from "@/components/workspace/DigestModal";
import ProfileModal, { type Profile } from "@/components/workspace/ProfileModal";
import type { EvidenceView, IntegrationView, ProjectContext } from "@/components/workspace/types";
import { Avatar, Pill, Spinner, api, secondaryButton, type ToastFn } from "@/components/workspace/ui";

type Tab = "board" | "activity" | "team" | "report";

const TABS: { id: Tab; label: string; icon: typeof KanbanSquare }[] = [
  { id: "board", label: "Board", icon: KanbanSquare },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "team", label: "Team", icon: Users },
  { id: "report", label: "Report", icon: FileText },
];

interface WorkspaceResponse {
  workspace: Workspace;
  evidence: EvidenceView[];
  members: TeamMember[];
  myRole: MembershipRole;
  currentUserId: string;
  features: { ai: boolean };
}

function statusLabel(status: string): { label: string; tone: "green" | "amber" | "purple" | "zinc" } {
  if (status === "published") return { label: "Published", tone: "purple" };
  if (status === "under_review" || status === "frozen") return { label: "In review", tone: "amber" };
  if (status === "archived") return { label: "Archived", tone: "zinc" };
  return { label: "Active", tone: "green" };
}

function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : "board";

  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const [tasks, setTasksState] = useState<Task[]>([]);
  const [tasksReady, setTasksReady] = useState(true);
  const [integration, setIntegration] = useState<IntegrationView | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<{ message: string; status?: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showDigest, setShowDigest] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [toastState, setToastState] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const toast: ToastFn = useCallback((message, type = "info") => {
    setToastState({ message, type });
    window.setTimeout(() => setToastState((t) => (t?.message === message ? null : t)), 4500);
  }, []);

  const setTasks = useCallback((updater: (prev: Task[]) => Task[]) => setTasksState(updater), []);

  const loadWorkspace = useCallback(async () => {
    try {
      const res = await api<WorkspaceResponse>(`/api/workspaces/${id}`);
      setData(res);
      setLoadError(null);
    } catch (err: any) {
      setLoadError({ message: err.message, status: err.status });
    }
  }, [id]);

  const loadTasks = useCallback(async () => {
    try {
      const res = await api<{ tasks: Task[]; ready: boolean }>(`/api/workspaces/${id}/tasks`);
      setTasksState(res.tasks);
      setTasksReady(res.ready);
    } catch (err: any) {
      if (err.code === "MIGRATION_REQUIRED") setTasksReady(false);
    }
  }, [id]);

  const loadIntegration = useCallback(async () => {
    try {
      const res = await api<{ integration: IntegrationView | null }>(`/api/workspaces/${id}/integrations`);
      setIntegration(res.integration);
    } catch {
      /* shown on the Team tab */
    }
  }, [id]);

  useEffect(() => {
    loadWorkspace();
    loadTasks();
    loadIntegration();
    api<{ profile: Profile }>("/api/user/profile")
      .then((r) => setProfile(r.profile))
      .catch(() => {});
  }, [loadWorkspace, loadTasks, loadIntegration]);

  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "board") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await api<{ message: string }>(`/api/workspaces/${id}/sync`, { method: "POST" });
      toast(res.message, "success");
      await Promise.all([loadWorkspace(), loadTasks(), loadIntegration()]);
    } catch (err: any) {
      toast(err.message, "error");
      loadIntegration();
    } finally {
      setSyncing(false);
    }
  }, [id, toast, loadWorkspace, loadTasks, loadIntegration]);

  const ctx: ProjectContext | null = useMemo(() => {
    if (!data) return null;
    const { workspace, members, myRole, currentUserId, features } = data;
    const isLeader = myRole === "leader";
    return {
      workspace,
      taskKey: taskKeyOf(workspace),
      members,
      contributors: members.filter((m) => m.role !== "reviewer"),
      currentUserId,
      myRole,
      isLeader,
      canEdit: isLeader || myRole === "member",
      readOnly: workspace.status === "published" || workspace.status === "archived",
      aiEnabled: features.ai,
    };
  }, [data]);

  const onWorkspaceChange = useCallback(
    (workspace: Workspace) => setData((d) => (d ? { ...d, workspace: { ...d.workspace, ...workspace } } : d)),
    []
  );

  if (loadError && !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-white mb-2">
            {loadError.status === 401 ? "Please sign in" : loadError.status === 403 ? "You're not on this project" : "Project not found"}
          </h1>
          <p className="text-sm text-zinc-500 mb-6">{loadError.message}</p>
          <Link href={loadError.status === 401 ? "/login" : "/dashboard"} className={secondaryButton}>
            {loadError.status === 401 ? "Sign in" : "Back to dashboard"}
          </Link>
        </div>
      </div>
    );
  }

  if (!data || !ctx) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner className="w-7 h-7 text-purple-400" />
      </div>
    );
  }

  const status = statusLabel(ctx.workspace.status);
  const myOpen = tasks.filter((t) => t.status !== "done" && t.assignee_ids.includes(ctx.currentUserId)).length;

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      {toastState && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-[100] max-w-sm rounded-xl border border-zinc-800 bg-[#0c0c0f] px-4 py-3 shadow-2xl flex items-start gap-3"
        >
          {toastState.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />}
          {toastState.type === "error" && <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
          {toastState.type === "info" && <Clock className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />}
          <p className="text-sm text-zinc-100">{toastState.message}</p>
          <button onClick={() => setToastState(null)} aria-label="Dismiss" className="text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-white truncate">{ctx.workspace.name}</h1>
              <Pill tone={status.tone}>{status.label}</Pill>
            </div>
            <p className="text-xs text-zinc-500 truncate">
              {ctx.taskKey} · {ctx.members.length} {ctx.members.length === 1 ? "person" : "people"}
              {myOpen > 0 && ` · ${myOpen} open task${myOpen === 1 ? "" : "s"} for you`}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {integration && (
              <button onClick={sync} disabled={syncing} className={cn(secondaryButton, "hidden sm:inline-flex py-1.5 text-xs")}>
                <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
                {syncing ? "Syncing" : "Sync"}
              </button>
            )}
            <button onClick={() => setShowDigest(true)} className={cn(secondaryButton, "py-1.5 text-xs")}>
              <Newspaper className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Weekly update</span>
            </button>
            <button
              onClick={() => profile && setShowProfile(true)}
              aria-label="Your profile"
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <Avatar name={profile?.name || "You"} url={profile?.avatarUrl} size="md" />
            </button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1" aria-label="Project sections">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors",
                  active ? "border-purple-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-200"
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tab === "board" && (
          <BoardTab
            ctx={ctx}
            tasks={tasks}
            setTasks={setTasks}
            tasksReady={tasksReady}
            evidence={data.evidence}
            onBriefSaved={(brief) => onWorkspaceChange({ ...ctx.workspace, project_brief: brief })}
            toast={toast}
          />
        )}
        {tab === "activity" && (
          <ActivityTab
            ctx={ctx}
            evidence={data.evidence}
            integration={integration}
            syncing={syncing}
            onSync={sync}
            onChanged={loadWorkspace}
            onOpenTeam={() => setTab("team")}
            toast={toast}
          />
        )}
        {tab === "team" && (
          <TeamTab
            ctx={ctx}
            integration={integration}
            syncing={syncing}
            onSync={sync}
            onIntegrationChange={setIntegration}
            onWorkspaceChange={onWorkspaceChange}
            onMembersChanged={loadWorkspace}
            toast={toast}
          />
        )}
        {tab === "report" && <ReportTab ctx={ctx} tasks={tasks} onWorkspaceChange={onWorkspaceChange} toast={toast} />}
      </main>

      {showDigest && (
        <DigestModal workspaceId={ctx.workspace.id} aiEnabled={ctx.aiEnabled} onClose={() => setShowDigest(false)} toast={toast} />
      )}
      {showProfile && profile && (
        <ProfileModal
          profile={profile}
          onSaved={(p) => {
            setProfile(p);
            loadWorkspace();
          }}
          onClose={() => setShowProfile(false)}
          toast={toast}
        />
      )}
    </div>
  );
}

export default function WorkspacePageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Spinner className="w-7 h-7 text-purple-400" />
        </div>
      }
    >
      <WorkspacePage />
    </Suspense>
  );
}
