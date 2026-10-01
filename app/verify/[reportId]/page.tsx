"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, CalendarDays, Check, Copy, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import ReportView, { type Highlight } from "@/components/report/ReportView";
import type { ReportScoringLogic } from "@/lib/reports/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { MemberResult } from "@/types";
import { Spinner, api, secondaryButton } from "@/components/workspace/ui";

interface PublicReport {
  report: {
    id: string;
    version: number;
    published_at: string;
    overall_confidence: string;
    coverage_score: number;
    limitations: string | null;
    member_results: MemberResult[];
    scoring_logic: ReportScoringLogic;
  };
  workspace: { id: string; name: string; description: string | null; start_date: string; end_date: string } | null;
  highlights: Highlight[];
  seal: { status: "valid" | "modified" | "unsealed" | "unverifiable"; sealedAt: string | null; contentHash: string | null };
  supersededBy: { id: string; version: number } | null;
}

function SealBadge({ seal }: { seal: PublicReport["seal"] }) {
  if (seal.status === "valid") {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-100">Unchanged since it was published</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sealed {seal.sealedAt ? formatDateTime(seal.sealedAt) : ""} with a server signature. Any edit to the shares or
            task list after publishing would show here.
          </p>
          {seal.contentHash && <p className="text-[10px] font-mono text-zinc-600 mt-1 break-all">{seal.contentHash}</p>}
        </div>
      </div>
    );
  }
  if (seal.status === "modified") {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex gap-3">
        <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
        <p className="text-sm text-red-100">This report&apos;s data changed after it was published. Don&apos;t rely on these numbers.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#09090b] p-4 flex gap-3">
      <ShieldQuestion className="w-5 h-5 text-zinc-500 shrink-0" />
      <p className="text-sm text-zinc-400">
        {seal.status === "unsealed"
          ? "Published before reports were sealed, so changes can't be detected."
          : "The seal can't be checked right now (the server's signing key changed)."}
      </p>
    </div>
  );
}

export default function PublicReportPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [data, setData] = useState<PublicReport | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<PublicReport>(`/api/verify/${reportId}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [reportId]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-white mb-2">Report not available</h1>
          <p className="text-sm text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner className="w-7 h-7 text-purple-400" />
      </div>
    );
  }

  const { report, workspace, seal, supersededBy, highlights } = data;
  const logic = report.scoring_logic || {};

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Team contribution report</p>
          <h1 className="text-3xl font-semibold text-white">{workspace?.name || "Project"}</h1>
          {workspace?.description && <p className="text-zinc-400">{workspace.description}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
            {workspace && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                {formatDate(workspace.start_date)} – {formatDate(workspace.end_date)}
              </span>
            )}
            <span>Version {report.version}</span>
            <span>Published {formatDateTime(report.published_at)}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={`${secondaryButton} py-1 text-xs`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </header>

        {supersededBy && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
            A newer version of this report was published.{" "}
            <Link href={`/verify/${supersededBy.id}`} className="underline underline-offset-2">
              View version {supersededBy.version}
            </Link>
          </div>
        )}

        <SealBadge seal={seal} />

        {logic.summary?.text && (
          <section className="rounded-2xl border border-zinc-800 bg-[#09090b] p-5">
            <h2 className="text-sm font-semibold text-white mb-2">Summary from the team</h2>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{logic.summary.text}</p>
            {logic.summary.aiAssisted && <p className="text-[11px] text-zinc-500 mt-2">Drafted with AI and approved by the team leader.</p>}
          </section>
        )}

        <ReportView memberResults={report.member_results || []} logic={logic} highlights={highlights} />

        <footer className="text-xs text-zinc-600 space-y-1 pt-4 border-t border-zinc-900">
          <p>
            Credit is estimated from the team&apos;s task board and GitHub activity. It&apos;s a structured starting point for
            grading or judging, not a final verdict.
          </p>
          <p>Generated with TrackOS.</p>
        </footer>
      </main>
    </div>
  );
}
