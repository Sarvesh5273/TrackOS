"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { CATEGORY_LABELS, DEFAULT_CATEGORY_WEIGHTS, TASK_KEY_PATTERN, deriveTaskKey } from "@/lib/tasks";
import { cn, toDateInput } from "@/lib/utils";
import { Field, Spinner, api, inputClass, primaryButton, secondaryButton } from "@/components/workspace/ui";

export default function NewWorkspacePage() {
  const router = useRouter();
  const today = toDateInput();
  const inFourWeeks = toDateInput(new Date(Date.now() + 28 * 24 * 60 * 60 * 1000));

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(inFourWeeks);
  const [taskKey, setTaskKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [weights, setWeights] = useState(DEFAULT_CATEGORY_WEIGHTS.map((c) => ({ ...c, pct: Math.round(c.weight * 100) })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const effectiveKey = keyTouched ? taskKey : deriveTaskKey(name);
  const total = weights.reduce((s, c) => s + c.pct, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Give your project a name.");
    if (endDate < startDate) return setError("The deadline must be on or after the start date.");
    if (!TASK_KEY_PATTERN.test(effectiveKey)) return setError("Task key: 2-6 letters or digits, starting with a letter.");
    if (total !== 100) return setError(`Credit weights must add up to 100% (now ${total}%).`);

    setSaving(true);
    try {
      const data = await api<{ workspace: { id: string } }>("/api/workspaces", {
        method: "POST",
        json: {
          name: name.trim(),
          description: description.trim() || undefined,
          startDate: new Date(`${startDate}T00:00:00`).toISOString(),
          endDate: new Date(`${endDate}T23:59:59`).toISOString(),
          taskKey: effectiveKey,
          categories: weights.map((c) => ({ id: c.id, name: c.name, weight: c.pct / 100 })),
        },
      });
      router.push(`/workspaces/${data.workspace.id}`);
    } catch (err: any) {
      if (err.status === 401) router.push("/login?next=/workspaces/new");
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <header className="border-b border-zinc-800/80">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-semibold text-white">New project</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <form onSubmit={submit} className="space-y-6">
          {error && (
            <p role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Field label="Project name" htmlFor="name">
            <input
              id="name"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="e.g. Campus Food Finder"
              className={inputClass}
            />
          </Field>

          <Field label="One-line description (optional)" htmlFor="description">
            <input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="What are you building?"
              className={inputClass}
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Start date" htmlFor="start">
              <input id="start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Deadline" htmlFor="end" hint="Demo day, submission date, or end of term.">
              <input id="end" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <Field
            label="Task key"
            htmlFor="key"
            hint={`Tasks will be numbered ${effectiveKey || "KEY"}-1, ${effectiveKey || "KEY"}-2 ... Mention them in commits to link work.`}
          >
            <input
              id="key"
              value={effectiveKey}
              onChange={(e) => {
                setKeyTouched(true);
                setTaskKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
              }}
              className={cn(inputClass, "font-mono w-40")}
            />
          </Field>

          <div className="rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              aria-expanded={showAdvanced}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-300"
            >
              <span>
                Credit weights <span className="text-zinc-500">(optional, defaults work for most teams)</span>
              </span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showAdvanced && "rotate-180")} />
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4 space-y-3">
                <p className="text-xs text-zinc-500">
                  How much each type of work counts in the final split. Total: {" "}
                  <span className={total === 100 ? "text-emerald-300" : "text-amber-300"}>{total}%</span>
                </p>
                {weights.map((c, i) => (
                  <label key={c.id} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 text-zinc-300">{CATEGORY_LABELS[c.id]}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={c.pct}
                      onChange={(e) =>
                        setWeights((ws) => ws.map((x, j) => (j === i ? { ...x, pct: Math.round(Number(e.target.value) || 0) } : x)))
                      }
                      className={cn(inputClass, "w-24 py-1.5")}
                      aria-label={`${CATEGORY_LABELS[c.id]} weight`}
                    />
                    <span className="text-zinc-500">%</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Link href="/dashboard" className={secondaryButton}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving && <Spinner />}
              Create project
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
