"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft, AlertTriangle, CheckCircle, Users, FileText,
  TrendingUp, Minus, Info, Download, MessageSquare, ShieldCheck, Trash2, Loader2, Scale
} from "lucide-react";
import { formatDateTime, formatPercent } from "@/lib/utils";
import DisputeRoomModal from "@/components/DisputeRoomModal";
import type { Report, Workspace, EvidenceItem } from "@/types";

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [report, setReport] = useState<Report | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  const workspaceId = params.id as string;
  const reportId = params.reportId as string;

  useEffect(() => {
    loadData();
  }, [reportId]);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Check membership role
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    setIsLeader(membership?.role === "leader");

    // Get workspace
    const wsRes = await fetch(`/api/workspaces/${workspaceId}`);
    if (!wsRes.ok) return;
    const wsData = await wsRes.json();
    setWorkspace(wsData.workspace || wsData);
    setEvidence(wsData.evidence || wsData.evidence_items || []);

    // Get report
    const { data: reportData, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (error) { router.push(`/workspaces/${workspaceId}`); return; }
    setReport(reportData);
    setLoading(false);
  };

  const handleDeleteReport = async () => {
    if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/reports/${reportId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push(`/workspaces/${workspaceId}`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete report");
        setDeleting(false);
      }
    } catch {
      alert("Failed to delete report");
      setDeleting(false);
    }
  };

  const getConfidenceBadge = (level: string) => {
    switch (level) {
      case "HIGH": return "bg-green-100 text-green-800";
      case "MEDIUM": return "bg-yellow-100 text-yellow-800";
      case "LOW": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      development: "bg-blue-500",
      design: "bg-pink-500",
      documentation_research: "bg-amber-500",
      quality_testing: "bg-green-500",
      coordination_review: "bg-purple-500",
      presentation_delivery: "bg-orange-500",
    };
    return colors[cat] || "bg-gray-500";
  };

  if (loading || !report || !workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  const results = (report.member_results || []) as Array<{
    userId: string;
    displayName: string;
    email: string;
    contributionShare: number;
    confidenceLevel: string;
    confidenceReasons: string[];
    categoryResults: Array<{
      category: string;
      normalizedValue: number;
      evidenceCount: number;
    }>;
    positiveContributors: Array<{ evidenceId: string; description: string; impact: number }>;
    importantExclusions: Array<{ evidenceId: string; reason: string }>;
    evidenceCoverage: number;
  }>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <button
            onClick={() => router.push(`/workspaces/${workspaceId}`)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Workspace
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Contribution Report</h1>
              <p className="text-gray-600 mt-1">{workspace.name} — Version {report.version}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${getConfidenceBadge(report.overall_confidence)}`}>
                  {report.overall_confidence} Confidence
                </span>
                <span className="text-sm text-gray-500">
                  Generated {formatDateTime(report.created_at)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/verify/${report.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-coral-50 text-coral-700 border border-coral-200 rounded-lg hover:bg-coral-100 text-sm font-semibold transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-coral-600" />
                Public Certificate &amp; Proof of Work
              </Link>
              <button
                onClick={handleDeleteReport}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors disabled:opacity-50"
                title="Delete this report"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Advisory Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">Advisory Use Only</p>
            <p className="text-sm text-amber-700 mt-1">
              This report is decision support, not an objective measurement. Some important work may be invisible or difficult to quantify. Review as a team before making decisions.
            </p>
          </div>
        </div>

        {/* Team Overview */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Overview
          </h2>
          <div className="space-y-6">
            {results.map((member) => (
              <div key={member.userId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-medium">
                      {member.displayName?.[0] || "?"}
                    </div>
                    <div>
                      <p className="font-semibold">{member.displayName || member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getConfidenceBadge(member.confidenceLevel)}`}>
                          {member.confidenceLevel}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatPercent(member.evidenceCoverage)} coverage
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{member.contributionShare.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">contribution share</p>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="mb-4">
                  <div className="flex h-4 rounded-full overflow-hidden">
                    {member.categoryResults.map((cat) => (
                      <div
                        key={cat.category}
                        className={`${getCategoryColor(cat.category)}`}
                        style={{ width: `${cat.normalizedValue * 100}%` }}
                        title={`${cat.category}: ${cat.evidenceCount} items`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {member.categoryResults.filter((c) => c.evidenceCount > 0).map((cat) => (
                      <div key={cat.category} className="flex items-center gap-1 text-xs">
                        <div className={`w-2 h-2 rounded-full ${getCategoryColor(cat.category)}`} />
                        <span className="capitalize">{cat.category.replace("_", " ")}</span>
                        <span className="text-gray-500">({cat.evidenceCount})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confidence Reasons */}
                {member.confidenceReasons.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-gray-700 mb-1">Confidence Notes:</p>
                    <ul className="space-y-1">
                      {member.confidenceReasons.map((reason, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Top Contributors */}
                {member.positiveContributors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Key Evidence:</p>
                    <div className="space-y-1">
                      {member.positiveContributors.slice(0, 3).map((contrib) => (
                        <div key={contrib.evidenceId} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                          <span className="truncate flex-1">{contrib.description}</span>
                          <span className="text-xs text-gray-500 ml-2">+{contrib.impact.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exclusions */}
                {member.importantExclusions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Excluded/Duplicate:</p>
                    {member.importantExclusions.map((ex) => (
                      <p key={ex.evidenceId} className="text-xs text-gray-500 flex items-center gap-1">
                        <Minus className="w-3 h-3" /> {ex.reason}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scoring Logic */}
        {report.scoring_logic && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Scoring Method
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
              <p className="mb-2">Formula: {report.scoring_logic.formula as string}</p>
              <p className="text-gray-600">Category weights applied:</p>
              <ul className="mt-1 space-y-1">
                {Object.entries((report.scoring_logic as any).categoryWeightsApplied || {}).map(
                  ([cat, weight]: [string, any]) => (
                    <li key={cat} className="text-gray-600">
                      {cat}: {(weight as number * 100).toFixed(0)}%
                    </li>
                  )
                )}
              </ul>
              <div className="mt-3 pt-3 border-t text-gray-500">
                <p>Total evidence: {(report.scoring_logic as any).totalEvidenceItems}</p>
                <p>Excluded: {(report.scoring_logic as any).excludedItems}</p>
                <p>Bot detected: {(report.scoring_logic as any).botItems}</p>
              </div>
            </div>
          </div>
        )}

        {/* Limitations */}
        {report.limitations && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Limitations & Coverage
            </h2>
            <div className="whitespace-pre-line text-sm text-gray-600">{report.limitations}</div>
          </div>
        )}

        {/* Dispute Section */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-600" />
            Review &amp; Split-Credit Disputes
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            If you believe evidence is missing, incorrectly attributed, or should be split with a teammate, you can propose a joint-credit split or raise a dispute.
          </p>
          <button
            onClick={() => setShowDisputeModal(true)}
            className="px-4 py-2 border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl text-sm font-semibold transition-colors inline-flex items-center gap-2 shadow-sm"
          >
            <Scale className="w-4 h-4" />
            Raise a Dispute / Propose Split
          </button>
        </div>
      </main>

      {/* Dispute & Split-Credit Room Modal */}
      {showDisputeModal && (
        <DisputeRoomModal
          workspaceId={workspaceId}
          evidenceItems={evidence}
          isLeader={isLeader}
          onClose={() => setShowDisputeModal(false)}
        />
      )}
    </div>
  );
}
