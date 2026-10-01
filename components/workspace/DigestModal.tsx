"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, Newspaper, Sparkles } from "lucide-react";
import type { Digest, DigestTask } from "@/lib/digest";
import { cn, formatShortDate } from "@/lib/utils";
import { Avatar, Modal, Pill, Spinner, api, primaryButton, secondaryButton, type ToastFn } from "./ui";

const PERIODS = [
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 0, label: "Whole project" },
];

function TaskList({ items, emptyText, due }: { items: DigestTask[]; emptyText?: string; due?: boolean }) {
  if (items.length === 0) return emptyText ? <p className="text-sm text-zinc-500">{emptyText}</p> : null;
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t.ref} className="text-sm text-zinc-300 flex gap-2">
          <span className="font-mono text-[11px] text-zinc-500 pt-0.5 shrink-0">{t.ref}</span>
          <span className="flex-1">
            {t.title}
            <span className="text-zinc-500"> · {t.assignees.length ? t.assignees.join(", ") : "unassigned"}</span>
            {due && t.at && <span className="text-zinc-500"> · due {formatShortDate(t.at)}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function DigestModal({
  workspaceId,
  aiEnabled,
  onClose,
  toast,
}: {
  workspaceId: string;
  aiEnabled: boolean;
  onClose: () => void;
  toast: ToastFn;
}) {
  const [days, setDays] = useState(7);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSummary("");
    try {
      const data = await api<{ digest: Digest }>(`/api/workspaces/${workspaceId}/digest?days=${days}`);
      setDigest(data.digest);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, days]);

  useEffect(() => {
    load();
  }, [load]);

  const summarize = async () => {
    setSummarizing(true);
    try {
      const data = await api<{ summary: string }>(`/api/workspaces/${workspaceId}/digest/summary`, {
        method: "POST",
        json: { days },
      });
      setSummary(data.summary);
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSummarizing(false);
    }
  };

  const copy = async () => {
    if (!digest) return;
    const text = summary ? `${summary}\n\n${digest.markdown}` : digest.markdown;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      title="Weekly update"
      subtitle="What happened, what's next, and who might need a nudge. Paste it in your team chat or send it to your professor."
      icon={<Newspaper className="w-4 h-4" />}
      onClose={onClose}
      size="xl"
      footer={
        <>
          {aiEnabled && digest && (
            <button onClick={summarize} disabled={summarizing} className={cn(secondaryButton, "mr-auto")}>
              {summarizing ? <Spinner /> : <Sparkles className="w-4 h-4 text-purple-400" />}
              {summary ? "Rewrite summary" : "Write a summary with AI"}
            </button>
          )}
          <button onClick={copy} disabled={!digest} className={primaryButton}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy for chat"}
          </button>
        </>
      }
    >
      <div role="tablist" aria-label="Period" className="inline-flex rounded-lg border border-zinc-800 p-0.5 bg-black mb-5">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            role="tab"
            aria-selected={days === p.days}
            onClick={() => setDays(p.days)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              days === p.days ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Spinner className="w-6 h-6 text-purple-400" />
        </div>
      ) : error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : digest ? (
        <div className="space-y-6">
          {summary && (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
              <p className="text-sm text-zinc-200 whitespace-pre-wrap">{summary}</p>
              <p className="text-[11px] text-zinc-500 mt-2">AI-written from the facts below. Check it before sharing.</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Tasks done", value: digest.totals.tasksDone, sub: `${digest.totals.pointsDone} points` },
              { label: "In progress", value: digest.totals.inProgress, sub: `${digest.totals.openTasks} open in total` },
              { label: "PRs merged", value: digest.totals.prsMerged, sub: `${digest.totals.reviews} reviews` },
              { label: "Commits", value: digest.totals.commits, sub: digest.unmatchedCount ? `${digest.unmatchedCount} unmatched` : "all matched" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-zinc-800 p-3">
                <p className="text-[11px] text-zinc-500">{s.label}</p>
                <p className="text-xl font-semibold text-white tabular-nums">{s.value}</p>
                <p className="text-[11px] text-zinc-500">{s.sub}</p>
              </div>
            ))}
          </div>

          <section>
            <h3 className="text-xs font-semibold text-zinc-400 mb-2">Done</h3>
            <TaskList items={digest.completed} emptyText="Nothing finished in this period." />
          </section>

          {digest.overdue.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-red-300 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Overdue
              </h3>
              <TaskList items={digest.overdue} due />
            </section>
          )}

          {digest.inProgress.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-zinc-400 mb-2">In progress</h3>
              <TaskList items={digest.inProgress} />
            </section>
          )}

          {digest.dueSoon.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-zinc-400 mb-2">Due in the next 7 days</h3>
              <TaskList items={digest.dueSoon} due />
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold text-zinc-400 mb-2">Team</h3>
            <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800">
              {digest.people.map((p) => (
                <li key={p.userId} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={p.name} url={p.avatarUrl} size="sm" />
                  <span className="text-sm text-zinc-200 flex-1 truncate">{p.name}</span>
                  {p.inactive ? (
                    <Pill tone="amber" title={p.lastActiveAt ? `Last active ${formatShortDate(p.lastActiveAt)}` : "No activity yet"}>
                      No activity{p.lastActiveAt ? ` since ${formatShortDate(p.lastActiveAt)}` : " yet"}
                    </Pill>
                  ) : (
                    <span className="text-xs text-zinc-400 text-right">
                      {p.tasksDone} tasks ({p.points} pts)
                      {p.commits ? ` · ${p.commits} commits` : ""}
                      {p.prsMerged ? ` · ${p.prsMerged} PRs` : ""}
                      {p.reviews ? ` · ${p.reviews} reviews` : ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {!digest.tasksReady && (
            <p className="text-xs text-amber-300">
              The task board isn&apos;t set up in the database yet, so this only shows GitHub activity.
            </p>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
