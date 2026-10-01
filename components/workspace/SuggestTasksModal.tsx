"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { CATEGORY_DOT, CATEGORY_LABELS, SIZE_LABELS } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import type { ContributionCategory, Task, TaskSize } from "@/types";
import type { ProjectContext } from "./types";
import { Field, Modal, Spinner, api, inputClass, primaryButton, secondaryButton, type ToastFn } from "./ui";

interface Suggestion {
  title: string;
  description: string;
  category: ContributionCategory;
  size: TaskSize;
}

export default function SuggestTasksModal({
  ctx,
  onAdded,
  onBriefSaved,
  onClose,
  toast,
}: {
  ctx: ProjectContext;
  onAdded: (tasks: Task[]) => void;
  onBriefSaved: (brief: string) => void;
  onClose: () => void;
  toast: ToastFn;
}) {
  const savedBrief = ctx.workspace.project_brief || "";
  const [brief, setBrief] = useState(savedBrief);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const draft = async () => {
    if (brief.trim().length < 20) {
      setError("Write a few sentences about what you're building (at least 20 characters).");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api<{ suggestions: Suggestion[] }>(`/api/workspaces/${ctx.workspace.id}/tasks/suggest`, {
        method: "POST",
        json: { brief: brief.trim() },
      });
      setSuggestions(data.suggestions);
      setSelected(new Set(data.suggestions.map((_, i) => i)));
      if (brief.trim() !== savedBrief.trim()) {
        // Keep the brief so the team (and future drafts) can reuse it
        api(`/api/workspaces/${ctx.workspace.id}`, { method: "PUT", json: { project_brief: brief.trim() } })
          .then(() => onBriefSaved(brief.trim()))
          .catch(() => {});
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const add = async () => {
    if (!suggestions) return;
    const picked = suggestions.filter((_, i) => selected.has(i));
    if (picked.length === 0) return;
    setAdding(true);
    try {
      const data = await api<{ tasks: Task[] }>(`/api/workspaces/${ctx.workspace.id}/tasks`, {
        method: "POST",
        json: {
          tasks: picked.map((s) => ({
            title: s.title,
            description: s.description || null,
            category: s.category,
            size: s.size,
            status: "todo",
          })),
        },
      });
      onAdded(data.tasks);
      toast(`Added ${data.tasks.length} tasks to To do. Assign people when you're ready.`, "success");
      onClose();
    } catch (err: any) {
      setError(err.message);
      setAdding(false);
    }
  };

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <Modal
      title="Draft tasks with AI"
      subtitle="AI suggests a starter backlog from your project brief. You pick what goes on the board."
      icon={<Sparkles className="w-4 h-4" />}
      onClose={onClose}
      size="lg"
      footer={
        suggestions ? (
          <>
            <button onClick={() => setSuggestions(null)} className={cn(secondaryButton, "mr-auto")}>
              Edit brief
            </button>
            <button onClick={onClose} className={secondaryButton}>
              Cancel
            </button>
            <button onClick={add} disabled={adding || selected.size === 0} className={primaryButton}>
              {adding && <Spinner />}
              Add {selected.size} task{selected.size === 1 ? "" : "s"}
            </button>
          </>
        ) : (
          <>
            <button onClick={onClose} className={secondaryButton}>
              Cancel
            </button>
            <button onClick={draft} disabled={loading} className={primaryButton}>
              {loading ? <Spinner /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Drafting..." : "Draft tasks"}
            </button>
          </>
        )
      }
    >
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {!suggestions ? (
        <Field
          label="Project brief"
          htmlFor="brief"
          hint="What are you building, for whom, and what must be ready by the deadline? The more specific, the better the tasks."
        >
          <textarea
            id="brief"
            rows={8}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            maxLength={8000}
            placeholder="e.g. A mobile-friendly web app where students can split shared expenses. Must have sign up, groups, adding expenses, and a settle-up screen. Demo day is Friday; we need slides and a 3 minute video."
            className={cn(inputClass, "resize-y")}
          />
        </Field>
      ) : (
        <ul className="space-y-2">
          {suggestions.map((s, i) => (
            <li key={i}>
              <label
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                  selected.has(i) ? "border-purple-500/40 bg-purple-500/5" : "border-zinc-800 hover:border-zinc-700"
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggle(i)}
                  className="mt-1 accent-purple-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-white">{s.title}</span>
                  {s.description && <span className="block text-xs text-zinc-400 mt-0.5">{s.description}</span>}
                  <span className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full", CATEGORY_DOT[s.category])} />
                      {CATEGORY_LABELS[s.category]}
                    </span>
                    <span>{SIZE_LABELS[s.size]}</span>
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
