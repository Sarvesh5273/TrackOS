"use client";

import { useState, useEffect } from "react";
import {
  Scale,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  Loader2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import type { EvidenceItem } from "@/types";

interface DisputeRoomModalProps {
  workspaceId: string;
  evidenceItems: EvidenceItem[];
  isLeader: boolean;
  onClose: () => void;
}

export default function DisputeRoomModal({
  workspaceId,
  evidenceItems,
  isLeader,
  onClose,
}: DisputeRoomModalProps) {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const [splitPercent, setSplitPercent] = useState(50);

  useEffect(() => {
    fetchDisputes();
  }, [workspaceId]);

  const fetchDisputes = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/disputes`);
      if (res.ok) {
        const data = await res.json();
        setDisputes(data.disputes || []);
      }
    } catch (err) {
      console.error("Failed to fetch disputes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/disputes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceId: selectedEvidenceId || null,
          title,
          reason,
          proposedSplitPercent: splitPercent,
        }),
      });

      if (res.ok) {
        setTitle("");
        setReason("");
        setSelectedEvidenceId("");
        setShowNewForm(false);
        fetchDisputes();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (disputeId: string, action: "accept" | "reject") => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/disputes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disputeId, action }),
      });

      if (res.ok) {
        fetchDisputes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Dispute &amp; Split-Credit Room
              </h3>
              <p className="text-xs text-muted">
                Transparent team consensus for co-authored features and joint deliverables.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {showNewForm ? (
            <form onSubmit={handleCreateDispute} className="space-y-4 p-5 rounded-2xl bg-gray-50 border border-gray-100">
              <h4 className="font-bold text-sm text-gray-900">
                Propose Joint Credit Split / Raise Note
              </h4>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Co-authored payment gateway with Alice"
                  className="input-field w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Link to Deliverable / Evidence (Optional)
                </label>
                <select
                  value={selectedEvidenceId}
                  onChange={(e) => setSelectedEvidenceId(e.target.value)}
                  className="input-field w-full text-sm"
                >
                  <option value="">-- Select related evidence item --</option>
                  {evidenceItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.category}] {item.summary || item.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Proposed Shared Split ({splitPercent}%)
                </label>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={splitPercent}
                  onChange={(e) => setSplitPercent(Number(e.target.value))}
                  className="w-full accent-coral-500"
                />
                <div className="flex justify-between text-[11px] text-muted">
                  <span>Author: {100 - splitPercent}%</span>
                  <span>Co-Author: {splitPercent}%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Context / Explanation
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain your contribution or architectural collaboration..."
                  className="input-field w-full text-sm resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="btn-outline text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim()}
                  className="btn-coral text-xs py-1.5 px-3 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Submit Proposal
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted font-medium">
                {disputes.length} active item{disputes.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setShowNewForm(true)}
                className="btn-coral text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Propose Shared Split
              </button>
            </div>
          )}

          {/* List of Disputes */}
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-coral-500" />
            </div>
          ) : disputes.length === 0 ? (
            <div className="text-center py-10 text-muted">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-70" />
              <p className="text-sm font-semibold text-gray-800">No open disputes or split claims</p>
              <p className="text-xs text-muted mt-0.5">
                All contributions are agreed upon with clear attribution.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                        d.status === "resolved"
                          ? "bg-emerald-100 text-emerald-800"
                          : d.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {d.status}
                      </span>
                      <span className="text-xs text-muted">
                        Proposed Split: {d.proposed_split || 50}%
                      </span>
                    </div>
                    <h5 className="font-bold text-sm text-gray-900 truncate">
                      {d.reason || "Split Credit Request"}
                    </h5>
                    {d.resolution_notes && (
                      <p className="text-xs text-muted mt-1 italic">
                        Note: {d.resolution_notes}
                      </p>
                    )}
                  </div>

                  {d.status === "open" && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleResolve(d.id, "accept")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accept Split
                      </button>
                      <button
                        onClick={() => handleResolve(d.id, "reject")}
                        className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
