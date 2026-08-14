"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Minus,
  Loader2,
  BarChart3,
  AlertCircle,
} from "lucide-react";

const DEFAULT_CATEGORIES = [
  { id: "development", name: "Development", weight: 0.30 },
  { id: "design", name: "Design", weight: 0.20 },
  { id: "documentation_research", name: "Documentation & Research", weight: 0.15 },
  { id: "quality_testing", name: "Quality & Testing", weight: 0.15 },
  { id: "coordination_review", name: "Coordination & Review", weight: 0.10 },
  { id: "presentation_delivery", name: "Presentation & Delivery", weight: 0.10 },
];

export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleWeightChange = (id: string, val: number) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, weight: val / 100 } : c))
    );
  };

  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (Math.abs(totalWeight - 1.0) > 0.001) {
      setError(`Category weights must total 100%. Current: ${Math.round(totalWeight * 100)}%`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          startDate,
          endDate,
          categories,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/workspaces/${data.workspace.id}`);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create workspace");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">Create Workspace</h1>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">New Workspace</h2>
          <p className="text-muted">Set up a project to start tracking contributions.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-coral-500" />
              Basic Information
            </h3>

            <div>
              <label className="block text-sm font-medium mb-2">Workspace Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hackathon Summer 2026"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this workspace for?"
                rows={3}
                className="input-field resize-none"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-coral-500" />
                Category Weights
              </h3>
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${
                  Math.abs(totalWeight - 1.0) < 0.001
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                Total: {Math.round(totalWeight * 100)}%
              </span>
            </div>

            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleWeightChange(cat.id, Math.max(0, Math.round(cat.weight * 100) - 5))
                        }
                        className="p-1 rounded-md hover:bg-gray-100"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-mono w-10 text-center">
                        {Math.round(cat.weight * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleWeightChange(cat.id, Math.min(100, Math.round(cat.weight * 100) + 5))
                        }
                        className="p-1 rounded-md hover:bg-gray-100"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-coral-500 rounded-full transition-all"
                      style={{ width: `${cat.weight * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="btn-outline flex-1 text-center">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || Math.abs(totalWeight - 1.0) > 0.001}
              className="btn-coral flex-1 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {loading ? "Creating..." : "Create Workspace"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}