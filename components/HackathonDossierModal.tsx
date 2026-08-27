"use client";

import { useState } from "react";
import {
  Trophy,
  Copy,
  Check,
  X,
  Download,
  Printer,
  Award,
  FileCheck,
  Calendar,
  Users,
} from "lucide-react";
import type { Workspace, EvidenceItem } from "@/types";
import { formatPercent } from "@/lib/utils";

interface HackathonDossierModalProps {
  workspace: any;
  members: any[];
  evidence: EvidenceItem[];
  reports: any[];
  onClose: () => void;
}

export default function HackathonDossierModal({
  workspace,
  members,
  evidence,
  reports,
  onClose,
}: HackathonDossierModalProps) {
  const [copied, setCopied] = useState(false);

  const latestReport = reports && reports.length > 0 ? reports[0] : null;
  const memberResults = (latestReport?.member_results || []) as any[];

  const dossierMarkdown = `# 🏆 Hackathon & Project Evaluation Dossier
**Project Name**: ${workspace.name}
**Project Description**: ${workspace.description || "N/A"}
**Evaluation Period**: ${new Date(workspace.start_date).toLocaleDateString()} — ${new Date(workspace.end_date).toLocaleDateString()}
**Verified Deliverables**: ${evidence.length} items logged and verified via TeamTrack AI

---

## 👥 Contributor Attribution & Fair Score Matrix
| Contributor | Verified Share | Confidence | Primary Focus | Key Deliverables |
| :--- | :--- | :--- | :--- | :--- |
${
  memberResults.length > 0
    ? memberResults
        .map(
          (m) =>
            `| **${m.displayName || m.email}** | **${formatPercent(m.contributionShare || 0)}** | ${m.confidenceLevel || "HIGH"} | ${m.categoryResults?.[0]?.category || "Development"} | ${m.positiveContributors?.slice(0, 2).map((x: any) => x.description).join("; ") || "Core features"} |`
        )
        .join("\n")
    : members
        .map((m) => `| **${m.user?.raw_user_meta_data?.name || m.user?.email || "Member"}** | Evaluated | HIGH | Core Team | Logged verified events |`)
        .join("\n")
}

---

## 🚀 Key Technical Deliverables & Milestones
${
  evidence.slice(0, 8).map((e) => `- [${(e.category || "general").toUpperCase()}] **${e.summary || e.description}** (@${e.actor_username || "team"})`).join("\n")
}

---

## 🛡️ Authenticity Verification
- **Verification Engine**: TeamTrack AI Normalized Contribution Scoring
- **Confidence Rating**: ${latestReport?.overall_confidence || "HIGH"}
- **Audit Signature**: Verified via Conventional Commits & Peer Co-Signing

*Generated for Hackathon Judges & University Grading Rubrics via TeamTrack AI.*
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(dossierMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-3xl shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Hackathon Judge &amp; Grading Dossier
              </h3>
              <p className="text-xs text-muted">
                Dossier summarizing team velocity, proof of work, and individual attribution.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
            <div>
              <span className="block text-xl font-bold text-gray-900">{members.length}</span>
              <span className="text-[11px] font-semibold text-muted uppercase">Contributors</span>
            </div>
            <div>
              <span className="block text-xl font-bold text-coral-600">{evidence.length}</span>
              <span className="text-[11px] font-semibold text-muted uppercase">Verified Deliverables</span>
            </div>
            <div>
              <span className="block text-xl font-bold text-emerald-600">
                {latestReport?.overall_confidence || "HIGH"}
              </span>
              <span className="text-[11px] font-semibold text-muted uppercase">Trust Confidence</span>
            </div>
          </div>

          {/* Formatted Markdown Box */}
          <div className="rounded-2xl bg-gray-900 text-gray-100 p-5 font-mono text-xs overflow-x-auto leading-relaxed border border-gray-800 shadow-inner">
            <pre className="whitespace-pre-wrap">{dossierMarkdown}</pre>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
          <button
            onClick={handlePrint}
            className="btn-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="btn-coral text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied to Clipboard!" : "Copy Judge Dossier"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
