"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  GitCommit,
  GitPullRequest,
  History,
  Link2,
  MessageSquare,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import {
  CATEGORY_IDS,
  CATEGORY_LABELS,
  SIZE_LABELS,
  STATUS_LABELS,
  TASK_SIZES,
  TASK_STATUSES,
  effectiveSplit,
  equalSplit,
  formatTaskRef,
  isCustomSplit,
  isTaskVerified,
  verifyingTaskLinks,
  validateSplit,
} from "@/lib/tasks";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import type { Task, TaskSize, TaskStatus, ContributionCategory } from "@/types";
import type { EvidenceView, ProjectContext } from "./types";
import {
  Avatar,
  Field,
  Modal,
  Pill,
  Spinner,
  api,
  dangerButton,
  inputClass,
  memberName,
  primaryButton,
  secondaryButton,
  type ToastFn,
} from "./ui";

interface Props {
  ctx: ProjectContext;
  task: Task | null;
  defaultStatus?: TaskStatus;
  linked: EvidenceView[];
  onSaved: (task: Task) => void;
  onDeleted: (taskId: string) => void;
  onClose: () => void;
  toast: ToastFn;
}

interface HistoryEvent {
  id: string;
  action: string;
  actorName: string;
  next: any;
  at: string;
}

const ACTION_LABELS: Record<string, string> = {
  "task.created": "created the task",
  "task.updated": "edited the task",
  "task.status_changed": "moved the task",
  "task.split_set": "set the credit split",
  "task.split_proposed": "proposed a credit split",
  "task.split_approved": "approved the proposed split",
  "task.split_rejected": "declined the proposed split",
  "task.confirmed": "confirmed it was done",
  "task.unconfirmed": "removed their confirmation",
  "task.auto_started": "started it from GitHub",
  "task.auto_done": "finished it with a merged PR",
};

export default function TaskModal({ ctx, task, defaultStatus = "todo", linked, onSaved, onDeleted, onClose, toast }: Props) {
  const { workspace, taskKey, members, contributors, currentUserId, isLeader, canEdit, readOnly } = ctx;
  const editable = canEdit && !readOnly;
  const isNew = !task;

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<TaskStatus>(task?.status || defaultStatus);
  const [category, setCategory] = useState<ContributionCategory>(task?.category || "development");
  const [size, setSize] = useState<TaskSize>(task?.size || "M");
  const [assignees, setAssignees] = useState<string[]>(task?.assignee_ids || (isNew && canEdit ? [currentUserId] : []));
  const [dueDate, setDueDate] = useState(task?.due_date || "");
  const [link, setLink] = useState(task?.link || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [current, setCurrent] = useState<Task | null>(task);
  const [editingSplit, setEditingSplit] = useState(false);
  const [splitDraft, setSplitDraft] = useState<Record<string, number>>({});
  const [splitBusy, setSplitBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [history, setHistory] = useState<HistoryEvent[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const ref = current ? formatTaskRef(taskKey, current.number) : null;
  const assigneesChanged =
    !!current &&
    (assignees.length !== current.assignee_ids.length || assignees.some((id) => !current.assignee_ids.includes(id)));

  useEffect(() => {
    if (!historyOpen || !current || history) return;
    api<{ events: HistoryEvent[] }>(`/api/workspaces/${workspace.id}/tasks/${current.id}/history`)
      .then((d) => setHistory(d.events))
      .catch(() => setHistory([]));
  }, [historyOpen, current, history, workspace.id]);

  const toggleAssignee = (id: string) =>
    setAssignees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Give the task a title.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isNew) {
        const data = await api<{ tasks: Task[] }>(`/api/workspaces/${workspace.id}/tasks`, {
          method: "POST",
          json: {
            title: title.trim(),
            description: description.trim() || null,
            status,
            category,
            size,
            assigneeIds: assignees,
            dueDate: dueDate || null,
            link: link.trim() || null,
          },
        });
        onSaved(data.tasks[0]);
        toast(`Added ${formatTaskRef(taskKey, data.tasks[0].number)}`, "success");
        onClose();
      } else if (current) {
        const patch: Record<string, unknown> = {};
        if (title.trim() !== current.title) patch.title = title.trim();
        if ((description.trim() || null) !== (current.description || null)) patch.description = description.trim() || null;
        if (status !== current.status) patch.status = status;
        if (category !== current.category) patch.category = category;
        if (size !== current.size) patch.size = size;
        if ((dueDate || null) !== (current.due_date || null)) patch.dueDate = dueDate || null;
        if ((link.trim() || null) !== (current.link || null)) patch.link = link.trim() || null;
        if (assigneesChanged) patch.assigneeIds = assignees;
        if (Object.keys(patch).length === 0) {
          onClose();
          return;
        }
        const data = await api<{ task: Task }>(`/api/workspaces/${workspace.id}/tasks/${current.id}`, {
          method: "PATCH",
          json: patch,
        });
        onSaved(data.task);
        if (assigneesChanged && isCustomSplit(current)) toast("People changed, so the split went back to equal.", "info");
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Couldn't save the task.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!current || !confirm(`Delete ${ref}? Its credit will be removed from future reports.`)) return;
    setDeleting(true);
    try {
      await api(`/api/workspaces/${workspace.id}/tasks/${current.id}`, { method: "DELETE" });
      onDeleted(current.id);
      toast(`Deleted ${ref}`, "success");
      onClose();
    } catch (err: any) {
      toast(err.message, "error");
      setDeleting(false);
    }
  };

  const splitAction = async (action: "propose" | "approve" | "reject", split?: Record<string, number>) => {
    if (!current) return;
    setSplitBusy(true);
    try {
      const data = await api<{ task: Task; message: string }>(`/api/workspaces/${workspace.id}/tasks/${current.id}/split`, {
        method: "POST",
        json: { action, split },
      });
      setCurrent(data.task);
      onSaved(data.task);
      setEditingSplit(false);
      setHistory(null);
      toast(data.message, "success");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSplitBusy(false);
    }
  };

  const toggleConfirm = async (confirmIt: boolean) => {
    if (!current) return;
    setConfirmBusy(true);
    try {
      const data = await api<{ task: Task }>(`/api/workspaces/${workspace.id}/tasks/${current.id}/confirm`, {
        method: confirmIt ? "POST" : "DELETE",
      });
      setCurrent(data.task);
      onSaved(data.task);
      setHistory(null);
      toast(confirmIt ? "Thanks, confirmed." : "Confirmation removed.", "success");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setConfirmBusy(false);
    }
  };

  const split = current ? effectiveSplit(current) : equalSplit(assignees);
  const draftTotal = Object.values(splitDraft).reduce((s, v) => s + (Number(v) || 0), 0);
  const draftError = editingSplit && current ? validateSplit(current.assignee_ids, splitDraft) : null;
  const proposal = current?.split_proposal || null;
  const iAmAssignee = !!current?.assignee_ids.includes(currentUserId);
  const verified = current ? isTaskVerified(current, verifyingTaskLinks(current, linked).length) : false;
  const confirmedByMe = !!current?.confirmed_by?.includes(currentUserId);
  const canDelete = !!current && editable && (isLeader || current.created_by === currentUserId);

  const assignableIds = useMemo(() => {
    const ids = new Set(contributors.map((m) => m.userId));
    // keep former members visible if they're still on the task
    assignees.forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [contributors, assignees]);

  return (
    <Modal
      title={isNew ? "New task" : `${ref} · ${current?.title}`}
      subtitle={isNew ? "Add it to the board. You can change anything later." : `Created ${timeAgo(current!.created_at)}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {canDelete && (
            <button onClick={handleDelete} disabled={deleting} className={cn(dangerButton, "mr-auto")}>
              {deleting ? <Spinner /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          )}
          <button onClick={onClose} className={secondaryButton}>
            {editable ? "Cancel" : "Close"}
          </button>
          {editable && (
            <button onClick={handleSave} disabled={saving} className={primaryButton}>
              {saving && <Spinner />}
              {isNew ? "Add task" : "Save"}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <p role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Field label="Title" htmlFor="task-title">
          <input
            id="task-title"
            autoFocus={isNew}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && editable && handleSave()}
            disabled={!editable}
            maxLength={200}
            placeholder="e.g. Build the login page"
            className={inputClass}
          />
        </Field>

        <Field label="Details (optional)" htmlFor="task-desc" hint="What does 'done' look like?">
          <textarea
            id="task-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!editable}
            maxLength={5000}
            className={cn(inputClass, "resize-y")}
          />
        </Field>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Status" htmlFor="task-status">
            <select
              id="task-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              disabled={!editable}
              className={inputClass}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type of work" htmlFor="task-category">
            <select
              id="task-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ContributionCategory)}
              disabled={!editable}
              className={inputClass}
            >
              {CATEGORY_IDS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date" htmlFor="task-due">
            <input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={!editable}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Size" hint="Small = a few hours, Medium = about a day, Large = 2-3 days. Bigger tasks earn more credit.">
          <div role="radiogroup" aria-label="Size" className="inline-flex rounded-lg border border-zinc-800 p-0.5 bg-black">
            {TASK_SIZES.map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={size === s}
                disabled={!editable}
                onClick={() => setSize(s)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  size === s ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
                )}
              >
                {SIZE_LABELS[s]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="People on this task" hint={assignees.length > 1 ? "Credit is shared equally unless you set a custom split." : undefined}>
          <div className="flex flex-wrap gap-2">
            {assignableIds.map((id) => {
              const m = members.find((x) => x.userId === id);
              const on = assignees.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  disabled={!editable}
                  onClick={() => toggleAssignee(id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 text-xs transition-colors",
                    on
                      ? "border-purple-500/50 bg-purple-500/15 text-white"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                  )}
                >
                  <Avatar name={m?.name || "?"} url={m?.avatarUrl} size="xs" />
                  {m?.name || "Former member"}
                  {id === currentUserId && <span className="text-zinc-500">(you)</span>}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Link (optional)" htmlFor="task-link" hint="Figma, Google Doc, slides, or anything that shows the work.">
          <input
            id="task-link"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            disabled={!editable}
            placeholder="https://"
            className={inputClass}
          />
        </Field>

        {/* ---------- Credit split ---------- */}
        {current && current.assignee_ids.length > 1 && (
          <div className="rounded-xl border border-zinc-800 bg-black/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                Credit split {isCustomSplit(current) ? "(custom)" : "(equal)"}
              </p>
              {editable && (iAmAssignee || isLeader) && !editingSplit && !proposal && !assigneesChanged && (
                <button
                  onClick={() => {
                    setSplitDraft(effectiveSplit(current));
                    setEditingSplit(true);
                  }}
                  className="text-xs text-purple-300 hover:text-purple-200"
                >
                  Change split
                </button>
              )}
            </div>

            {assigneesChanged && (
              <p className="text-xs text-zinc-500">Save the new people first, then adjust the split.</p>
            )}

            {!editingSplit && (
              <ul className="space-y-1.5">
                {Object.entries(split).map(([id, pct]) => (
                  <li key={id} className="flex items-center gap-2 text-sm">
                    <span className="w-28 truncate text-zinc-300">{memberName(members, id)}</span>
                    <span className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <span className="block h-full bg-purple-500" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-10 text-right tabular-nums text-zinc-300">{pct}%</span>
                  </li>
                ))}
              </ul>
            )}

            {editingSplit && (
              <div className="space-y-2">
                {current.assignee_ids.map((id) => (
                  <label key={id} className="flex items-center gap-3 text-sm">
                    <span className="w-28 truncate text-zinc-300">{memberName(members, id)}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={splitDraft[id] ?? 0}
                      onChange={(e) => setSplitDraft((d) => ({ ...d, [id]: Math.round(Number(e.target.value) || 0) }))}
                      className={cn(inputClass, "w-24 py-1.5")}
                      aria-label={`Share for ${memberName(members, id)}`}
                    />
                    <span className="text-zinc-500">%</span>
                  </label>
                ))}
                <p className={cn("text-xs", draftError ? "text-amber-300" : "text-zinc-500")}>
                  {draftError || `Total ${draftTotal}%`}
                  {!draftError && !isLeader && " · The others on the task need to approve it."}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => splitAction("propose", splitDraft)}
                    disabled={!!draftError || splitBusy}
                    className={cn(primaryButton, "py-1.5 text-xs")}
                  >
                    {splitBusy && <Spinner />}
                    {isLeader ? "Apply split" : "Propose split"}
                  </button>
                  <button
                    onClick={() => setSplitDraft(equalSplit(current.assignee_ids))}
                    className={cn(secondaryButton, "py-1.5 text-xs")}
                  >
                    Reset to equal
                  </button>
                  <button onClick={() => setEditingSplit(false)} className={cn(secondaryButton, "py-1.5 text-xs")}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {proposal && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                <p className="text-xs text-amber-200">
                  {memberName(members, proposal.proposedBy)} proposed:{" "}
                  {Object.entries(proposal.split)
                    .map(([id, pct]) => `${memberName(members, id)} ${pct}%`)
                    .join(", ")}
                </p>
                <p className="text-[11px] text-zinc-400">
                  Approved by {proposal.approvals.map((id) => memberName(members, id)).join(", ")}. Waiting for{" "}
                  {current.assignee_ids
                    .filter((id) => !proposal.approvals.includes(id))
                    .map((id) => memberName(members, id))
                    .join(", ") || "no one"}
                  .
                </p>
                {editable && (iAmAssignee || isLeader) && (
                  <div className="flex gap-2">
                    {(!proposal.approvals.includes(currentUserId) || isLeader) && (
                      <button onClick={() => splitAction("approve")} disabled={splitBusy} className={cn(primaryButton, "py-1.5 text-xs")}>
                        {splitBusy && <Spinner />}
                        {isLeader && !iAmAssignee ? "Approve as leader" : "Approve"}
                      </button>
                    )}
                    <button onClick={() => splitAction("reject")} disabled={splitBusy} className={cn(secondaryButton, "py-1.5 text-xs")}>
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------- Verification ---------- */}
        {current && current.status === "done" && (
          <div className="rounded-xl border border-zinc-800 bg-black/40 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              {verified ? (
                <p className="flex items-center gap-1.5 text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                  {verifyingTaskLinks(current, linked).length > 0 ? "Verified by linked GitHub activity" : "Confirmed by a teammate"}
                </p>
              ) : (
                <p className="text-zinc-400">
                  Self-reported for now. It counts at 70% until it&apos;s linked to GitHub or a teammate confirms it.
                </p>
              )}
              {(current.confirmed_by || []).length > 0 && (
                <p className="text-xs text-zinc-500 mt-1">
                  Confirmed by {(current.confirmed_by || []).map((id) => memberName(members, id)).join(", ")}
                </p>
              )}
            </div>
            {!iAmAssignee && !readOnly && (
              <button
                onClick={() => toggleConfirm(!confirmedByMe)}
                disabled={confirmBusy}
                className={cn(confirmedByMe ? secondaryButton : primaryButton, "py-1.5 text-xs")}
              >
                {confirmBusy ? <Spinner /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {confirmedByMe ? "Remove my confirmation" : "I confirm this was done"}
              </button>
            )}
          </div>
        )}

        {/* ---------- Linked GitHub activity ---------- */}
        {current && (
          <div>
            <p className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-2">
              <Link2 className="w-3.5 h-3.5 text-purple-400" />
              Linked GitHub activity ({linked.length})
            </p>
            {linked.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Mention <code className="text-zinc-300">{ref}</code> in a commit message or PR title to link it here.
                Merging a PR that says <code className="text-zinc-300">closes {ref}</code> moves this task to Done.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {linked.slice(0, 20).map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-sm">
                    {e.source === "github_pr" ? (
                      <GitPullRequest className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    ) : e.source === "github_review" ? (
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    ) : (
                      <GitCommit className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    )}
                    <span className="truncate text-zinc-300 flex-1">{e.summary}</span>
                    <span className="text-xs text-zinc-500 shrink-0">
                      {memberName(members, e.resolved_actor_id) === "Unassigned" ? `@${e.actor_username}` : memberName(members, e.resolved_actor_id)}
                    </span>
                    {e.source_url && (
                      <a href={e.source_url} target="_blank" rel="noreferrer" aria-label="Open on GitHub" className="text-zinc-500 hover:text-white">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ---------- History ---------- */}
        {current && (
          <div>
            <button
              onClick={() => setHistoryOpen((o) => !o)}
              className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5"
              aria-expanded={historyOpen}
            >
              <History className="w-3.5 h-3.5" />
              {historyOpen ? "Hide history" : "Show history"}
            </button>
            {historyOpen && (
              <div className="mt-2">
                {!history ? (
                  <Spinner className="text-zinc-500" />
                ) : history.length === 0 ? (
                  <p className="text-xs text-zinc-500">No history yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {history.map((h) => (
                      <li key={h.id} className="text-xs text-zinc-400">
                        <span className="text-zinc-200">{h.actorName}</span> {ACTION_LABELS[h.action] || h.action.replace("task.", "")}
                        {h.action === "task.status_changed" && h.next?.status && (
                          <> to <Pill className="ml-0.5">{STATUS_LABELS[h.next.status as TaskStatus] || h.next.status}</Pill></>
                        )}
                        <span className="text-zinc-600"> · {formatDateTime(h.at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
