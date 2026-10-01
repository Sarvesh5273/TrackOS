"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, ExternalLink, MessageSquareWarning, ShieldCheck } from "lucide-react";
import ReportView from "@/components/report/ReportView";
import type { ReportScoringLogic } from "@/lib/reports/types";
import { formatDateTime } from "@/lib/utils";
import type { Report } from "@/types";
import { Pill, Spinner, api, secondaryButton } from "@/components/workspace/ui";

export default function ReportDetailPage() {
  const { id, reportId } = useParams<{ id: string; reportId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [seal, setSeal] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ report: Report; seal: string | null }>(`/api/workspaces/${id}/reports/${reportId}`),
      api<{ workspace: { name: string } }>(`/api/workspaces/${id}`),
    ])
      .then(([r, w]) => {
        setReport(r.report);
        setSeal(r.seal);
        setWorkspaceName(w.workspace.name);
      })
      .catch((err) => setError(err.message));
  }, [id, reportId]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
          <p className="text-sm text-zinc-400 mb-6">{error}</p>
          <Link href={`/workspaces/${id}?tab=report`} className={secondaryButton}>
            Back to project
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner className="w-7 h-7 text-purple-400" />
      </div>
    );
  }

  const logic = (report.scoring_logic || {}) as ReportScoringLogic;

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <header className="border-b border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
          <Link
            href={`/workspaces/${id}?tab=report`}
            aria-label="Back to project"
            className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-white truncate">
              {workspaceName} · Report v{report.version}
            </h1>
            <p className="text-xs text-zinc-500">
              {report.status === "published" ? `Published ${formatDateTime(report.published_at!)}` : `Draft from ${formatDateTime(report.created_at)}`}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {report.status === "published" ? <Pill tone="green">Published</Pill> : <Pill tone="amber">Draft</Pill>}
            {seal === "valid" && (
              <Pill tone="green" title="The report hasn't changed since it was published">
                <ShieldCheck className="w-3 h-3" />
                Sealed
              </Pill>
            )}
            {seal === "modified" && <Pill tone="red">Changed after publishing</Pill>}
            {report.status === "published" && (
              <a href={`/verify/${report.id}`} target="_blank" rel="noreferrer" className={secondaryButton}>
                <ExternalLink className="w-4 h-4" />
                Public page
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {report.status === "provisional" && (
          <div className="rounded-xl border border-zinc-800 bg-[#09090b] p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-300">
              This is a draft. If something looks wrong, fix the task (people, split, size) and regenerate, or raise an issue
              for the leader.
            </p>
            <Link href={`/workspaces/${id}?tab=report`} className={secondaryButton}>
              <MessageSquareWarning className="w-4 h-4" />
              Raise an issue
            </Link>
          </div>
        )}

        {logic.summary?.text && (
          <section className="rounded-2xl border border-zinc-800 bg-[#09090b] p-5">
            <h2 className="text-sm font-semibold text-white mb-2">Project summary</h2>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{logic.summary.text}</p>
            {logic.summary.aiAssisted && <p className="text-[11px] text-zinc-500 mt-2">Drafted with AI, reviewed by the team leader.</p>}
          </section>
        )}

        <ReportView memberResults={report.member_results || []} logic={logic} />

        <p className="text-xs text-zinc-600">
          Advisory: this report estimates contribution from recorded work. It supports, but doesn&apos;t replace, a conversation
          with your team or instructor.
        </p>
      </main>
    </div>
  );
}
