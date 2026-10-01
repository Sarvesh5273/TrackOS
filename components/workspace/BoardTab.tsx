"use client";

import { useMemo, useState, type DragEvent } from "react";
import { AlertTriangle, CalendarDays, Link2, Plus, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import {
  CATEGORY_DOT,
  CATEGORY_LABELS,
  SIZE_POINTS,
  STATUS_LABELS,
  TASK_STATUSES,
  formatTaskRef,
  isOverdue,
  isTaskVerified,
  linkEvidenceToTasks,
  nextPosition,
  verifyingTaskLinks,
} from "@/lib/tasks";
import { cn, formatShortDate } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";
import TaskModal from "./TaskModal";
import SuggestTasksModal from "./SuggestTasksModal";
import type { EvidenceView, ProjectContext } from "./types";
import { AvatarStack, Pill, api, inputClass, primaryButton, secondaryButton, type ToastFn } from "./ui";

interface Props {
  ctx: ProjectContext;
  tasks: Task[];
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
  tasksReady: boolean;
  evidence: EvidenceView[];
  onBriefSaved: (brief: string) => void;
  toast: ToastFn;
}

const COLUMN_HINT: Record<TaskStatus, string> = {
  todo: "Planned work",
  in_progress: "Someone is on it",
  done: "Finished work earns credit",
};

export default function BoardTab({ ctx, tasks, setTasks, tasksReady, evidence, onBriefSaved, toast }: Props) {
  const { workspace, taskKey, members, currentUserId, canEdit, readOnly, aiEnabled } = ctx;
  const editable = canEdit && !readOnly;

  const [search, setSearch] = useState("");
  const [person, setPerson] = useState<string>("all");
  const [openTask, setOpenTask] = useState<Task | "new" | null>(null);
  const [newStatus, setNewStatus] = useState<TaskStatus>("todo");
  const [showSuggest, setShowSuggest] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [quickAdd, setQuickAdd] = useState<Record<TaskStatus, string>>({ todo: "", in_progress: "", done: "" });

  const links = useMemo(() => linkEvidenceToTasks(evidence, taskKey), [evidence, taskKey]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (person === "me" && !t.assignee_ids.includes(currentUserId)) return false;
      if (person === "none" && t.assignee_ids.length > 0) return false;
      if (person !== "all" && person !== "me" && person !== "none" && !t.assignee_ids.includes(person)) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        formatTaskRef(taskKey, t.number).toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    });
  }, [tasks, search, person, currentUserId, taskKey]);

  const columns = useMemo(() => {
    const byStatus: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const t of visible) byStatus[t.status].push(t);
    for (const s of TASK_STATUSES) byStatus[s].sort((a, b) => a.position - b.position);
    return byStatus;
  }, [visible]);

  const upsert = (task: Task) =>
    setTasks((prev) => (prev.some((t) => t.id === task.id) ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task]));

  const moveTask = async (taskId: string, status: TaskStatus, beforeId: string | null) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const column = tasks.filter((t) => t.status === status && t.id !== taskId).sort((a, b) => a.position - b.position);
    const idx = beforeId ? column.findIndex((t) => t.id === beforeId) : -1;
    let position: number;
    if (idx >= 0) {
      const after = column[idx];
      const before = column[idx - 1];
      position = before ? (before.position + after.position) / 2 : after.position - 1000;
    } else {
      position = nextPosition(column, status);
    }
    if (task.status === status && Math.abs(task.position - position) < 1e-9) return;

    const snapshot = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status, position } : t)));
    try {
      const data = await api<{ task: Task }>(`/api/workspaces/${workspace.id}/tasks/${taskId}`, {
        method: "PATCH",
        json: task.status === status ? { position } : { status, position },
      });
      upsert(data.task);
      if (status === "done" && task.status !== "done") {
        toast(
          task.assignee_ids.length === 0
            ? `${formatTaskRef(taskKey, task.number)} is done, but nobody is on it, so it counts for no one.`
            : `${formatTaskRef(taskKey, task.number)} is done.`,
          task.assignee_ids.length === 0 ? "info" : "success"
        );
      }
    } catch (err: any) {
      setTasks(() => snapshot);
      toast(err.message, "error");
    }
  };

  const handleQuickAdd = async (status: TaskStatus) => {
    const title = quickAdd[status].trim();
    if (!title) return;
    setQuickAdd((q) => ({ ...q, [status]: "" }));
    try {
      const data = await api<{ tasks: Task[] }>(`/api/workspaces/${workspace.id}/tasks`, {
        method: "POST",
        json: { title, status, assigneeIds: [currentUserId] },
      });
      upsert(data.tasks[0]);
    } catch (err: any) {
      setQuickAdd((q) => ({ ...q, [status]: title }));
      toast(err.message, "error");
    }
  };

  const onDragStart = (e: DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const onDrop = (e: DragEvent, status: TaskStatus, beforeId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const id = dragId || e.dataTransfer.getData("text/plain");
    setDragId(null);
    setDropTarget(null);
    if (id && id !== beforeId) moveTask(id, status, beforeId);
  };

  if (!tasksReady) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-amber-100">
        <p className="font-semibold mb-1">One-time database update needed</p>
        <p className="text-amber-200/80">
          Run <code>supabase/migrations/20260930_task_board.sql</code> in the Supabase SQL editor, then reload this page.
        </p>
      </div>
    );
  }

  const hasBrief = Boolean(workspace.project_brief && workspace.project_brief.trim().length >= 20);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search tasks or ${taskKey}-12`}
            aria-label="Search tasks"
            className={cn(inputClass, "pl-9")}
          />
        </div>
        <select
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          aria-label="Filter by person"
          className={cn(inputClass, "md:w-48")}
        >
          <option value="all">Everyone</option>
          <option value="me">My tasks</option>
          <option value="none">Unassigned</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2 md:ml-auto">
          {editable && aiEnabled && (
            <button onClick={() => setShowSuggest(true)} className={secondaryButton}>
              <Sparkles className="w-4 h-4 text-purple-400" />
              Draft tasks with AI
            </button>
          )}
          {editable && (
            <button
              onClick={() => {
                setNewStatus("todo");
                setOpenTask("new");
              }}
              className={primaryButton}
            >
              <Plus className="w-4 h-4" />
              New task
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Tip: mention <code className="text-zinc-300">{taskKey}-12</code> in a commit or PR to link it to a task. A merged
        PR that says <code className="text-zinc-300">closes {taskKey}-12</code> moves the card to Done.
      </p>

      {/* Empty board */}
      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Plan your project on the board</h3>
          <ol className="text-sm text-zinc-400 space-y-1 mb-6 max-w-md mx-auto text-left list-decimal list-inside">
            <li>Add tasks and pick who&apos;s on each one.</li>
            <li>Move cards to In progress and Done as you work.</li>
            <li>Done tasks and linked GitHub work become your credit report.</li>
          </ol>
          {editable ? (
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => {
                  setNewStatus("todo");
                  setOpenTask("new");
                }}
                className={primaryButton}
              >
                <Plus className="w-4 h-4" />
                Add your first task
              </button>
              {aiEnabled && (
                <button onClick={() => setShowSuggest(true)} className={secondaryButton}>
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  {hasBrief ? "Draft tasks from your brief" : "Describe the project, AI drafts tasks"}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Reviewers can view the board but not change it.</p>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4 items-start">
          {TASK_STATUSES.map((status) => {
            const list = columns[status];
            const points = list.reduce((s, t) => s + SIZE_POINTS[t.size], 0);
            return (
              <section
                key={status}
                aria-label={STATUS_LABELS[status]}
                onDragOver={(e) => {
                  if (!editable) return;
                  e.preventDefault();
                  setDropTarget(status);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null);
                }}
                onDrop={(e) => editable && onDrop(e, status, null)}
                className={cn(
                  "rounded-2xl border bg-zinc-950/60 p-3 min-h-[200px] transition-colors",
                  dropTarget === status ? "border-purple-500/50 bg-purple-500/[0.04]" : "border-zinc-800"
                )}
              >
                <header className="flex items-center justify-between px-1 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {STATUS_LABELS[status]} <span className="text-zinc-500 font-normal">{list.length}</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500">{COLUMN_HINT[status]}</p>
                  </div>
                  <span className="text-[11px] text-zinc-500">{points} pts</span>
                </header>

                <ul className="space-y-2">
                  {list.map((t) => {
                    const linkedCount = links.get(t.number)?.length || 0;
                    const overdue = isOverdue(t);
                    const verified = t.status === "done" && isTaskVerified(t, verifyingTaskLinks(t, links.get(t.number) || []).length);
                    return (
                      <li
                        key={t.id}
                        draggable={editable}
                        onDragStart={(e) => onDragStart(e, t.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setDropTarget(null);
                        }}
                        onDragOver={(e) => editable && e.preventDefault()}
                        onDrop={(e) => editable && onDrop(e, status, t.id)}
                        className={cn(dragId === t.id && "opacity-40")}
                      >
                        <button
                          onClick={() => setOpenTask(t)}
                          className="w-full text-left rounded-xl border border-zinc-800 bg-[#0c0c0f] hover:border-zinc-600 p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[11px] font-mono text-zinc-500">{formatTaskRef(taskKey, t.number)}</span>
                            <AvatarStack ids={t.assignee_ids} members={members} />
                          </div>
                          <p className="text-sm text-zinc-100 mt-1 leading-snug break-words">{t.title}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                              <span className={cn("w-1.5 h-1.5 rounded-full", CATEGORY_DOT[t.category])} />
                              {CATEGORY_LABELS[t.category]}
                            </span>
                            <Pill>{t.size}</Pill>
                            {t.due_date && (
                              <Pill tone={overdue ? "red" : "zinc"} title={overdue ? "Overdue" : "Due date"}>
                                {overdue ? <AlertTriangle className="w-3 h-3" /> : <CalendarDays className="w-3 h-3" />}
                                {formatShortDate(t.due_date)}
                              </Pill>
                            )}
                            {linkedCount > 0 && (
                              <Pill tone="blue" title={`${linkedCount} linked GitHub items`}>
                                <Link2 className="w-3 h-3" />
                                {linkedCount}
                              </Pill>
                            )}
                            {t.split_proposal && (
                              <Pill tone="amber" title="A new credit split is waiting for approval">
                                <Users className="w-3 h-3" />
                                Split pending
                              </Pill>
                            )}
                            {verified && (
                              <Pill tone="green" title="Verified">
                                <ShieldCheck className="w-3 h-3" />
                                Verified
                              </Pill>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {editable && (
                  <form
                    className="mt-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleQuickAdd(status);
                    }}
                  >
                    <label className="sr-only" htmlFor={`quick-${status}`}>
                      Add a task to {STATUS_LABELS[status]}
                    </label>
                    <input
                      id={`quick-${status}`}
                      value={quickAdd[status]}
                      onChange={(e) => setQuickAdd((q) => ({ ...q, [status]: e.target.value }))}
                      placeholder={status === "done" ? "+ Log something already done" : "+ Add a task"}
                      maxLength={200}
                      className="w-full rounded-lg bg-transparent border border-transparent hover:border-zinc-800 focus:border-zinc-700 focus:bg-black px-2.5 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                    />
                  </form>
                )}
              </section>
            );
          })}
        </div>
      )}

      {openTask && (
        <TaskModal
          ctx={ctx}
          task={openTask === "new" ? null : openTask}
          defaultStatus={newStatus}
          linked={openTask === "new" ? [] : links.get(openTask.number) || []}
          onSaved={upsert}
          onDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
          onClose={() => setOpenTask(null)}
          toast={toast}
        />
      )}

      {showSuggest && (
        <SuggestTasksModal
          ctx={ctx}
          onAdded={(created) => setTasks((prev) => [...prev, ...created])}
          onBriefSaved={onBriefSaved}
          onClose={() => setShowSuggest(false)}
          toast={toast}
        />
      )}
    </div>
  );
}
