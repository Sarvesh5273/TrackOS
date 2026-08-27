"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Github,
  Award,
  BarChart3,
  Calendar,
  Users,
  Sparkles,
  Share2,
  ArrowLeft,
  Loader2,
  FileCheck,
  Zap,
} from "lucide-react";
import { formatPercent, formatDateTime } from "@/lib/utils";

export default function PublicVerifyReportPage() {
  const { reportId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedBadge, setCopiedBadge] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchVerification();
  }, [reportId]);

  const fetchVerification = async () => {
    try {
      const res = await fetch(`/api/verify/${reportId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError("This report could not be verified or does not exist.");
      }
    } catch {
      setError("Failed to load verification record.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Verification Failed</h2>
          <p className="text-muted mb-6">{error || "Report not found"}</p>
          <Link href="/" className="btn-outline inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to TeamTrack AI
          </Link>
        </div>
      </div>
    );
  }

  const { report, workspace, members, verification } = data;
  const memberResults = (report.member_results || []) as any[];
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "https://teamtrack.ai";
  const verifyUrl = `${appOrigin}/verify/${report.id}`;
  const markdownBadge = `[![TeamTrack Verified](https://img.shields.io/badge/TeamTrack-Verified_Contribution-coral?style=flat-square&logo=github)](${verifyUrl})`;

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a] selection:bg-coral-100 selection:text-coral-900 pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-sm">
            <div className="w-7 h-7 rounded-lg bg-coral-500 text-white flex items-center justify-center shadow-sm">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span>TeamTrack AI</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(verifyUrl, setCopiedLink)}
              className="btn-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              {copiedLink ? "Link Copied!" : "Share Certificate"}
            </button>
            <Link href="/login" className="btn-coral text-xs py-1.5 px-3">
              Track Your Team
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-10">
        {/* Certificate Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-gray-100 relative overflow-hidden mb-10">
          {/* Subtle Decorative Gradient */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-coral-100/40 via-amber-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Trust Seal Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-8 mb-8 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60 shadow-sm">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                    Official Verification Record
                  </span>
                  <span className="text-xs text-muted">v{report.version}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-gray-900">
                  Proof of Contribution
                </h1>
              </div>
            </div>

            <div className="text-right">
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                report.overall_confidence === "HIGH"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : report.overall_confidence === "MEDIUM"
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}>
                {report.overall_confidence || "HIGH"} CONFIDENCE
              </span>
              <p className="text-xs text-muted mt-1">
                Issued {formatDateTime(verification.verifiedAt)}
              </p>
            </div>
          </div>

          {/* Project Details */}
          <div className="mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{workspace.name}</h2>
            {workspace.description && (
              <p className="text-muted text-sm max-w-2xl leading-relaxed mb-4">{workspace.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-6 text-xs text-muted pt-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-coral-500" />
                <span>
                  {new Date(workspace.start_date).toLocaleDateString()} —{" "}
                  {new Date(workspace.end_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-coral-500" />
                <span>{memberResults.length} Verified Contributors</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-coral-500" />
                <span>Algorithm: {verification.algorithmVersion}</span>
              </div>
            </div>
          </div>

          {/* Team Allocation Distribution Bar */}
          <div className="mb-12">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center justify-between">
              <span>Contribution Allocation Breakdown</span>
              <span>100% Normalized Output</span>
            </h3>

            <div className="h-4 rounded-full overflow-hidden flex shadow-inner bg-gray-100">
              {memberResults.map((m, idx) => {
                const colors = [
                  "bg-coral-500",
                  "bg-blue-500",
                  "bg-emerald-500",
                  "bg-purple-500",
                  "bg-amber-500",
                  "bg-pink-500",
                ];
                const color = colors[idx % colors.length];
                const pct = Math.max(2, (m.contributionShare || 0) * 100);

                return (
                  <div
                    key={m.userId}
                    style={{ width: `${pct}%` }}
                    className={`${color} hover:opacity-90 transition-opacity`}
                    title={`${m.displayName}: ${formatPercent(m.contributionShare || 0)}`}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3">
              {memberResults.map((m, idx) => {
                const colors = [
                  "bg-coral-500",
                  "bg-blue-500",
                  "bg-emerald-500",
                  "bg-purple-500",
                  "bg-amber-500",
                  "bg-pink-500",
                ];
                return (
                  <div key={m.userId} className="flex items-center gap-1.5 text-xs text-gray-700">
                    <span className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]}`} />
                    <span className="font-semibold">{m.displayName}:</span>
                    <span className="text-muted">{formatPercent(m.contributionShare || 0)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contributor Cards Grid */}
          <div className="space-y-6 mb-12">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-coral-500" />
              Verified Contributor Breakdown
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              {memberResults.map((m) => {
                const memberData = members.find((x: any) => x.user_id === m.userId);
                const avatar = memberData?.user?.avatarUrl;
                const username = memberData?.user?.username;

                return (
                  <div
                    key={m.userId}
                    className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 hover:border-gray-200 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-coral-100 text-coral-700 flex items-center justify-center font-bold text-sm overflow-hidden border border-coral-200 shadow-sm flex-shrink-0">
                            {avatar ? (
                              <img src={avatar} alt={m.displayName} className="w-full h-full object-cover" />
                            ) : (
                              m.displayName?.[0]?.toUpperCase() || "?"
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-gray-900 truncate">{m.displayName}</h4>
                            <p className="text-xs text-muted truncate">
                              {username ? `@${username}` : m.email}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-extrabold text-coral-600">
                            {formatPercent(m.contributionShare || 0)}
                          </p>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {m.confidenceLevel || "HIGH"} Conf
                          </span>
                        </div>
                      </div>

                      {/* Categories breakdown */}
                      {m.categoryResults && m.categoryResults.length > 0 && (
                        <div className="space-y-1.5 mb-4">
                          {m.categoryResults.map((cat: any) => (
                            <div key={cat.category} className="flex items-center justify-between text-xs">
                              <span className="text-muted capitalize">
                                {cat.category.replace("_", " ")}
                              </span>
                              <span className="font-medium text-gray-800">
                                {cat.evidenceCount} verified event{cat.evidenceCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Top Positive Contributions */}
                      {m.positiveContributors && m.positiveContributors.length > 0 && (
                        <div className="pt-3 border-t border-gray-200/60">
                          <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
                            Key Verified Impact
                          </p>
                          <ul className="space-y-1">
                            {m.positiveContributors.slice(0, 2).map((item: any, i: number) => (
                              <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-coral-500 flex-shrink-0 mt-0.5" />
                                <span className="line-clamp-1">{item.description}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cryptographic Proof Footer */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gray-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Cryptographic Verification Signature
                </span>
              </div>
              <p className="text-xs font-mono text-gray-300 truncate max-w-xl">
                SHA-256: {verification.hash}
              </p>
            </div>

            <button
              onClick={() => handleCopy(verification.hash, setCopiedHash)}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-white transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedHash ? "Copied" : "Copy Hash"}
            </button>
          </div>
        </div>

        {/* Embed & Share Accordion Card */}
        <div className="card p-6 bg-white border border-gray-100 rounded-2xl">
          <h3 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
            <Github className="w-4 h-4 text-gray-800" />
            Embed Verified Badge in your GitHub README / Resume
          </h3>
          <p className="text-xs text-muted mb-4">
            Showcase this verified contribution certificate on your personal portfolio, GitHub repository, or resume.
          </p>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200 font-mono text-xs text-gray-800 overflow-x-auto">
            <code className="flex-1 truncate">{markdownBadge}</code>
            <button
              onClick={() => handleCopy(markdownBadge, setCopiedBadge)}
              className="btn-coral text-xs py-1 px-3 flex-shrink-0"
            >
              {copiedBadge ? "Copied!" : "Copy Badge"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
