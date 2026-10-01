"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { AlertTriangle, CalendarDays, CheckCircle2, CircleDot, LogOut, Plus, Users } from "lucide-react";
import TrackOSLogo from "@/components/TrackOSLogo";
import { Avatar, Pill, Spinner, api, primaryButton } from "@/components/workspace/ui";
import { formatShortDate } from "@/lib/utils";

interface DashboardWorkspace {
  id: string;
  name: string;
  description: string | null;
  status: string;
  task_key?: string;
  start_date: string;
  end_date: string;
  my_role: string;
  member_count: number;
  open_task_count: number;
  done_task_count: number;
  my_open_task_count: number;
  overdue_task_count: number;
}

interface Profile {
  name: string;
  username: string;
  avatarUrl: string;
}

function statusPill(status: string) {
  if (status === "published") return <Pill tone="purple">Published</Pill>;
  if (status === "under_review" || status === "frozen") return <Pill tone="amber">In review</Pill>;
  if (status === "archived") return <Pill>Archived</Pill>;
  return <Pill tone="green">Active</Pill>;
}

function daysLeft(end: string) {
  const diff = Math.ceil((new Date(end).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (diff < 0) return `Ended ${formatShortDate(end)}`;
  if (diff === 0) return "Due today";
  return `${diff} day${diff === 1 ? "" : "s"} left`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<DashboardWorkspace[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ workspaces: DashboardWorkspace[] }>("/api/workspaces")
      .then((d) => setWorkspaces(d.workspaces))
      .catch((err) => {
        if (err.status === 401) router.push("/login?next=/dashboard");
        else setError(err.message);
      })
      .finally(() => setLoading(false));
    api<{ profile: Profile }>("/api/user/profile")
      .then((d) => setProfile(d.profile))
      .catch(() => {});
  }, [router]);

  const signOut = async () => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const myOpen = workspaces.reduce((s, w) => s + (w.my_open_task_count || 0), 0);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-black/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center">
            <TrackOSLogo size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar name={profile?.name || "You"} url={profile?.avatarUrl} size="sm" />
              <span className="text-sm text-zinc-300 hidden sm:inline max-w-[160px] truncate">{profile?.name}</span>
            </div>
            <button
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
              className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Your projects</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {myOpen > 0 ? `You have ${myOpen} open task${myOpen === 1 ? "" : "s"} across your projects.` : "Plan tasks, track who did what, and share a fair credit report."}
            </p>
          </div>
          <Link href="/workspaces/new" className={primaryButton}>
            <Plus className="w-4 h-4" />
            New project
          </Link>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner className="w-6 h-6 text-purple-400" />
          </div>
        ) : error ? (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        ) : workspaces.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">Start your first project</h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
              Create a project, invite your team with a link, and put your tasks on the board. Joined someone else&apos;s
              project? Open the invite link they sent you.
            </p>
            <Link href="/workspaces/new" className={primaryButton}>
              <Plus className="w-4 h-4" />
              Create a project
            </Link>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((w) => {
              const total = w.open_task_count + w.done_task_count;
              const pct = total > 0 ? Math.round((w.done_task_count / total) * 100) : 0;
              return (
                <li key={w.id}>
                  <Link
                    href={`/workspaces/${w.id}`}
                    className="block h-full rounded-2xl border border-zinc-800 bg-[#09090b] p-5 hover:border-zinc-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h2 className="text-base font-semibold text-white truncate">{w.name}</h2>
                      {statusPill(w.status)}
                    </div>
                    <p className="text-sm text-zinc-500 line-clamp-2 min-h-[2.5rem]">{w.description || "No description"}</p>

                    <div className="mt-4">
                      <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                        <span>
                          {w.done_task_count} of {total} tasks done
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {w.member_count}
                      </span>
                      {w.my_open_task_count > 0 && (
                        <span className="flex items-center gap-1 text-zinc-300">
                          <CircleDot className="w-3.5 h-3.5" />
                          {w.my_open_task_count} for you
                        </span>
                      )}
                      {w.overdue_task_count > 0 && (
                        <span className="flex items-center gap-1 text-red-300">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {w.overdue_task_count} overdue
                        </span>
                      )}
                      {w.status === "published" ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Report published
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {daysLeft(w.end_date)}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
