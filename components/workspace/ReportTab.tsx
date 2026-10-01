"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Globe,
  Info,
  MessageSquareWarning,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { CREDIT_RULES, type ReportScoringLogic } from "@/lib/reports/types";
import { formatTaskRef } from "@/lib/tasks";
import { cn, formatDateTime, formatShare } from "@/lib/utils";
import type { Dispute, Report, Task, Workspace } from "@/types";
import type { ProjectContext } from "./types";
import {
  Avatar,
  Field,
  Panel,
  Pill,
  SectionTitle,
  Spinner,
  api,
  dangerButton,
  inputClass,
  primaryButton,
  secondaryButton,
  type ToastFn,
} from "./ui";

interface Props {
  ctx: ProjectContext;
  tasks: Task[];
  onWorkspaceChange: (w: Workspace) => void;
  toast: ToastFn;
}

const ISSUE_TYPES = [
  { id: "score", label: "My share looks wrong" },
  { id: "attribution", label: "Someone got credit for the wrong work" },
  { id: "evidence", label: "A task or commit is wrong or missing" },
  { id: "category", label: "Work is counted as the wrong type" },
] as const;

const CHECK_ICON = {
  ok: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  warn: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
  info: <Info className="w-4 h-4 text-zinc-500 shrink-0" />,
};

export default function ReportTab({ ctx, tasks, onWorkspaceChange, toast }: Props) {
  const { workspace, isLeader, canEdit, readOnly, currentUserId, taskKey, aiEnabled } = ctx;
  const [reports, setReports] = useState<Report[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, d] = await Promise.all([
        api<{ reports: Report[] }>(`/api/workspaces/${workspace.id}/reports`),
        api<{ disputes: Dispute[] }>(`/api/workspaces/${workspace.id}/disputes`),
      ]);
      setReports(r.reports);
      setDisputes(d.disputes);
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [workspace.id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const latest = reports[0] || null;
  const logic = (latest?.scoring_logic || {}) as ReportScoringLogic;
  const openIssues = disputes.filter((d) => d.state === "open" || d.state === "under_discussion");

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusy(null);
    }
  };

  const generate = () =>
    run("generate", async () => {
      const data = await api<{ report: Report }>(`/api/workspaces/${workspace.id}/reports`, { method: "POST" });
      setReports((prev) => [data.report, ...prev]);
      if (["draft", "active", "frozen"].includes(workspace.status)) onWorkspaceChange({ ...workspace, status: "under_review" });
      toast(`Draft report v${data.report.version} is ready. Ask the team to review it.`, "success");
    });

  const publish = (report: Report) => {
    const warning =
      openIssues.length > 0
        ? `\n\n${openIssues.length} review issue(s) are still open. They'll be shown on the public page as unresolved.`
        : "";
    if (!confirm(`Publish v${report.version}? The public page will show teammate names, contribution shares, finished task titles, your approved summary, and any unresolved issues. The board becomes read-only.${warning}`)) return;
    run("publish", async () => {
      const data = await api<{ report: Report }>(`/api/workspaces/${workspace.id}/reports/${report.id}/publish`, { method: "POST" });
      setReports((prev) => prev.map((r) => (r.id === report.id ? data.report : r)));
      onWorkspaceChange({ ...workspace, status: "published" });
      load();
      toast("Published. Share the public link with your judges or professor.", "success");
    });
  };

  const remove = (report: Report) => {
    if (!confirm(`Delete draft v${report.version}?`)) return;
    run(`delete-${report.id}`, async () => {
      await api(`/api/workspaces/${workspace.id}/reports/${report.id}`, { method: "DELETE" });
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    });
  };

  const reopen = () =>
    run("reopen", async () => {
      const data = await api<{ workspace: Workspace }>(`/api/workspaces/${workspace.id}`, {
        method: "PUT",
        json: { status: "active" },
      });
      onWorkspaceChange(data.workspace);
      toast("Project reopened. The board is editable again.", "success");
    });

  const copyPublicLink = (report: Report) => {
    navigator.clipboard.writeText(`${window.location.origin}/verify/${report.id}`);
    toast("Public link copied", "success");
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Spinner className="w-6 h-6 text-purple-400" />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-5 gap-5 items-start">
      <div className="lg:col-span-3 space-y-5">
        {readOnly && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-emerald-100">This project is published. The board is read-only.</p>
            {isLeader && workspace.status === "published" && (
              <button onClick={reopen} disabled={busy === "reopen"} className={cn(secondaryButton, "py-1.5 text-xs")}>
                {busy === "reopen" ? <Spinner /> : <RotateCcw className="w-3.5 h-3.5" />}
                Reopen project
              </button>
            )}
          </div>
        )}

        <Panel>
          <SectionTitle
            icon={<FileText className="w-4 h-4" />}
            action={
              canEdit &&
              !readOnly && (
                <button onClick={generate} disabled={busy === "generate"} className={cn(primaryButton, "py-1.5 text-xs")}>
                  {busy === "generate" && <Spinner />}
                  {latest ? "Regenerate" : "Generate report"}
                </button>
              )
            }
          >
            Credit report
          </SectionTitle>

          {!latest ? (
            <div className="text-sm text-zinc-400 space-y-2">
              <p>
                The report splits credit using done tasks and GitHub activity. Generate a draft, let the team review it,
                then the leader publishes it and shares the link.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="text-white font-medium text-sm">Version {latest.version}</span>
                {latest.status === "published" ? <Pill tone="green">Published</Pill> : <Pill tone="amber">Draft</Pill>}
                <Pill tone={latest.overall_confidence === "HIGH" ? "green" : latest.overall_confidence === "MEDIUM" ? "amber" : "red"}>
                  {latest.overall_confidence?.toLowerCase()} confidence
                </Pill>
                <span>· {formatDateTime(latest.published_at || latest.created_at)}</span>
              </div>

              <ul className="space-y-3">
                {[...(latest.member_results || [])]
                  .sort((a, b) => b.contributionShare - a.contributionShare)
                  .map((m) => (
                    <li key={m.userId}>
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar name={m.displayName} url={m.avatarUrl} size="xs" />
                        <span className="text-sm text-zinc-200 flex-1 truncate">
                          {m.displayName || m.email}
                          {m.userId === currentUserId && <span className="text-zinc-500"> (you)</span>}
                        </span>
                        {typeof m.tasksDone === "number" && (
                          <span className="text-xs text-zinc-500">
                            {m.tasksDone} tasks · {m.taskPoints ?? 0} pts
                          </span>
                        )}
                        <span className="text-sm font-semibold text-white tabular-nums w-14 text-right">
                          {formatShare(m.contributionShare)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, m.contributionShare)}%` }} />
                      </div>
                    </li>
                  ))}
              </ul>

              {(logic.integrity || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400 mb-2">Checks</p>
                  <ul className="space-y-1.5">
                    {(logic.integrity || []).map((c) => (
                      <li key={c.id} className="flex gap-2 text-sm text-zinc-300">
                        {CHECK_ICON[c.status]}
                        <span>
                          <span className="text-zinc-500">{c.label}:</span> {c.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Link href={`/workspaces/${workspace.id}/reports/${latest.id}`} className={cn(secondaryButton, "py-1.5 text-xs")}>
                  Full breakdown
                </Link>
                {latest.status === "published" && (
                  <>
                    <a href={`/verify/${latest.id}`} target="_blank" rel="noreferrer" className={cn(secondaryButton, "py-1.5 text-xs")}>
                      <ExternalLink className="w-3.5 h-3.5" />
                      Public page
                    </a>
                    <button onClick={() => copyPublicLink(latest)} className={cn(secondaryButton, "py-1.5 text-xs")}>
                      <Globe className="w-3.5 h-3.5" />
                      Copy public link
                    </button>
                  </>
                )}
                {isLeader && latest.status === "provisional" && (
                  <>
                    <button onClick={() => publish(latest)} disabled={busy === "publish"} className={cn(primaryButton, "py-1.5 text-xs")}>
                      {busy === "publish" && <Spinner />}
                      Publish
                    </button>
                    <button
                      onClick={() => remove(latest)}
                      disabled={busy === `delete-${latest.id}`}
                      className={cn(dangerButton, "py-1.5 text-xs")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete draft
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowRules((s) => !s)}
            aria-expanded={showRules}
            className="mt-5 text-xs text-zinc-400 hover:text-white flex items-center gap-1"
          >
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showRules && "rotate-180")} />
            How credit is calculated
          </button>
          {showRules && (
            <ul className="mt-2 space-y-1.5 text-xs text-zinc-400 list-disc list-inside">
              {CREDIT_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </Panel>

        {latest && (
          <SummaryPanel
            ctx={ctx}
            report={latest}
            onSaved={(r) => setReports((prev) => prev.map((x) => (x.id === r.id ? r : x)))}
            toast={toast}
            aiEnabled={aiEnabled}
          />
        )}

        {reports.length > 1 && (
          <Panel>
            <SectionTitle>Earlier versions</SectionTitle>
            <ul className="divide-y divide-zinc-800/80">
              {reports.slice(1).map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="text-zinc-300">v{r.version}</span>
                  {r.status === "published" ? <Pill tone="green">Published</Pill> : <Pill>Draft</Pill>}
                  <span className="text-xs text-zinc-500 flex-1">{formatDateTime(r.published_at || r.created_at)}</span>
                  <Link href={`/workspaces/${workspace.id}/reports/${r.id}`} className="text-xs text-purple-300 hover:text-purple-200">
                    Open
                  </Link>
                  {isLeader && r.status === "provisional" && (
                    <button onClick={() => remove(r)} className="text-xs text-zinc-500 hover:text-red-300">
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      {/* Review issues */}
      <div className="lg:col-span-2 space-y-5">
        <Panel>
          <SectionTitle
            icon={<MessageSquareWarning className="w-4 h-4" />}
            action={
              !showIssueForm && (
                <button onClick={() => setShowIssueForm(true)} className="text-xs text-purple-300 hover:text-purple-200">
                  Raise an issue
                </button>
              )
            }
          >
            Review issues {openIssues.length > 0 && <Pill tone="amber">{openIssues.length} open</Pill>}
          </SectionTitle>
          <p className="text-xs text-zinc-500 mb-4">
            Something looks unfair? Raise it before the leader publishes. Most fixes are quick: update a task&apos;s people or
            split, then regenerate.
          </p>

          {showIssueForm && (
            <IssueForm
              ctx={ctx}
              tasks={tasks}
              onCancel={() => setShowIssueForm(false)}
              onCreated={() => {
                setShowIssueForm(false);
                load();
              }}
              toast={toast}
            />
          )}

          {disputes.length === 0 ? (
            !showIssueForm && <p className="text-sm text-zinc-500">No issues raised.</p>
          ) : (
            <ul className="space-y-3">
              {disputes.map((d) => (
                <IssueItem
                  key={d.id}
                  dispute={d}
                  taskKey={taskKey}
                  tasks={tasks}
                  isLeader={isLeader}
                  isMine={d.created_by === currentUserId}
                  workspaceId={workspace.id}
                  onChanged={load}
                  toast={toast}
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ============================================
// Summary shown on the public page
// ============================================
function SummaryPanel({
  ctx,
  report,
  onSaved,
  toast,
  aiEnabled,
}: {
  ctx: ProjectContext;
  report: Report;
  onSaved: (r: Report) => void;
  toast: ToastFn;
  aiEnabled: boolean;
}) {
  const saved = (report.scoring_logic as ReportScoringLogic)?.summary || null;
  const [text, setText] = useState(saved?.text || "");
  const [aiAssisted, setAiAssisted] = useState(saved?.aiAssisted || false);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const editable = ctx.isLeader && report.status === "provisional";

  useEffect(() => {
    setText(saved?.text || "");
    setAiAssisted(saved?.aiAssisted || false);
  }, [report.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editable && !saved) return null;

  const draft = async () => {
    setDrafting(true);
    try {
      const data = await api<{ summary: string }>(`/api/workspaces/${ctx.workspace.id}/reports/${report.id}/summary`, {
        method: "POST",
      });
      setText(data.summary);
      setAiAssisted(true);
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setDrafting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = await api<{ report: Report }>(`/api/workspaces/${ctx.workspace.id}/reports/${report.id}`, {
        method: "PATCH",
        json: { summary: text, aiAssisted },
      });
      onSaved(data.report);
      toast("Summary saved", "success");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel>
      <SectionTitle icon={<Globe className="w-4 h-4" />}>Project summary for the public page</SectionTitle>
      {editable ? (
        <div className="space-y-3">
          <Field label="What you built and who did what" hint="Shown to judges or your professor. Edit freely; it's sealed when you publish.">
            <textarea
              rows={6}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
              }}
              maxLength={3000}
              className={cn(inputClass, "resize-y")}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {aiEnabled && (
              <button onClick={draft} disabled={drafting} className={cn(secondaryButton, "py-1.5 text-xs")}>
                {drafting ? <Spinner /> : <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                {text ? "Redraft with AI" : "Draft with AI"}
              </button>
            )}
            <button onClick={save} disabled={saving} className={cn(primaryButton, "py-1.5 text-xs")}>
              {saving && <Spinner />}
              Save summary
            </button>
            {aiAssisted && <span className="text-[11px] text-zinc-500 self-center">Marked as AI-assisted</span>}
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{saved?.text}</p>
      )}
    </Panel>
  );
}

// ============================================
// Issues
// ============================================
function IssueForm({
  ctx,
  tasks,
  onCancel,
  onCreated,
  toast,
}: {
  ctx: ProjectContext;
  tasks: Task[];
  onCancel: () => void;
  onCreated: () => void;
  toast: ToastFn;
}) {
  const [type, setType] = useState<(typeof ISSUE_TYPES)[number]["id"]>("score");
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [requestedChange, setRequestedChange] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api(`/api/workspaces/${ctx.workspace.id}/disputes`, {
        method: "POST",
        json: { type, targetId: targetId || null, reason, requestedChange },
      });
      toast("Issue raised. The leader will review it.", "success");
      onCreated();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-black/40 p-4 space-y-3 mb-4">
      <Field label="What's wrong?" htmlFor="issue-type">
        <select id="issue-type" value={type} onChange={(e) => setType(e.target.value as any)} className={inputClass}>
          {ISSUE_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      {type !== "score" && tasks.length > 0 && (
        <Field label="Which task (optional)" htmlFor="issue-task">
          <select id="issue-task" value={targetId} onChange={(e) => setTargetId(e.target.value)} className={inputClass}>
            <option value="">None</option>
            {tasks
              .slice()
              .sort((a, b) => a.number - b.number)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {formatTaskRef(ctx.taskKey, t.number)} {t.title}
                </option>
              ))}
          </select>
        </Field>
      )}
      <Field label="Explain" htmlFor="issue-reason">
        <textarea
          id="issue-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={2000}
          placeholder="e.g. I paired with Sam on the payment page but I'm not on the task."
          className={cn(inputClass, "resize-y")}
        />
      </Field>
      <Field label="What should change?" htmlFor="issue-change">
        <input
          id="issue-change"
          value={requestedChange}
          onChange={(e) => setRequestedChange(e.target.value)}
          maxLength={1000}
          placeholder="e.g. Add me to PAY-12 with a 50/50 split"
          className={inputClass}
        />
      </Field>
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className={cn(primaryButton, "py-1.5 text-xs")}>
          {saving && <Spinner />}
          Submit
        </button>
        <button onClick={onCancel} className={cn(secondaryButton, "py-1.5 text-xs")}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function IssueItem({
  dispute,
  taskKey,
  tasks,
  isLeader,
  isMine,
  workspaceId,
  onChanged,
  toast,
}: {
  dispute: Dispute;
  taskKey: string;
  tasks: Task[];
  isLeader: boolean;
  isMine: boolean;
  workspaceId: string;
  onChanged: () => void;
  toast: ToastFn;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const open = dispute.state === "open" || dispute.state === "under_discussion";
  const task = dispute.target_id ? tasks.find((t) => t.id === dispute.target_id) : undefined;
  const typeLabel = ISSUE_TYPES.find((t) => t.id === dispute.type)?.label || dispute.type;

  const act = async (action: "resolve" | "reject" | "withdraw") => {
    setBusy(true);
    try {
      await api(`/api/workspaces/${workspaceId}/disputes`, {
        method: "PUT",
        json: { disputeId: dispute.id, action, note: note.trim() || undefined },
      });
      onChanged();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const stateTone =
    dispute.state === "resolved" ? "green" : dispute.state === "rejected" ? "red" : dispute.state === "unresolved_at_publication" ? "amber" : "amber";
  const stateLabel =
    dispute.state === "unresolved_at_publication"
      ? "Unresolved at publish"
      : dispute.resolution === "withdrawn"
      ? "Withdrawn"
      : dispute.state.replace("_", " ");

  return (
    <li className="rounded-xl border border-zinc-800 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={stateTone as any}>{stateLabel}</Pill>
        <span className="text-xs text-zinc-400">{typeLabel}</span>
        {task && <Pill tone="purple">{formatTaskRef(taskKey, task.number)}</Pill>}
      </div>
      <p className="text-sm text-zinc-200 whitespace-pre-wrap">{dispute.reason}</p>
      <p className="text-xs text-zinc-400">
        <span className="text-zinc-500">Asks for:</span> {dispute.requested_change}
      </p>
      <p className="text-[11px] text-zinc-600">
        {dispute.created_by_name} · {formatDateTime(dispute.created_at)}
      </p>
      {dispute.resolution_rationale && !open && (
        <p className="text-xs text-zinc-400 border-l-2 border-zinc-700 pl-2">
          {dispute.resolved_by_name}: {dispute.resolution_rationale}
        </p>
      )}
      {open && (isLeader || isMine) && (
        <div className="space-y-2 pt-1">
          {isLeader && (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note for the team (required)"
              aria-label="Resolution note"
              className={cn(inputClass, "py-1.5 text-xs")}
            />
          )}
          <div className="flex flex-wrap gap-2">
            {isLeader && (
              <>
                <button onClick={() => act("resolve")} disabled={busy} className={cn(primaryButton, "py-1 px-2.5 text-xs")}>
                  Fixed / accepted
                </button>
                <button onClick={() => act("reject")} disabled={busy} className={cn(secondaryButton, "py-1 px-2.5 text-xs")}>
                  Reject
                </button>
              </>
            )}
            {isMine && (
              <button onClick={() => act("withdraw")} disabled={busy} className={cn(secondaryButton, "py-1 px-2.5 text-xs")}>
                Withdraw
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
