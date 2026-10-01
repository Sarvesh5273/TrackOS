"use client";

import { AlertTriangle, CheckCircle2, ExternalLink, GitCommit, GitPullRequest, Info, MessageSquare, ShieldCheck } from "lucide-react";
import { CATEGORY_DOT, CATEGORY_LABELS } from "@/lib/tasks";
import { CREDIT_RULES, type ReportScoringLogic } from "@/lib/reports/types";
import { cn, formatShare, formatShortDate } from "@/lib/utils";
import type { ContributionCategory, MemberResult } from "@/types";
import { Avatar, Pill } from "@/components/workspace/ui";

export interface Highlight {
  id: string;
  source: string;
  url: string | null;
  summary: string | null;
  timestamp: string;
}

const CHECK_ICON = {
  ok: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  warn: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
  info: <Info className="w-4 h-4 text-zinc-500 shrink-0" />,
};

function SourceIcon({ source }: { source?: string }) {
  if (source === "github_pr") return <GitPullRequest className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
  if (source === "github_review") return <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
  return <GitCommit className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
}

export default function ReportView({
  memberResults,
  logic,
  highlights = [],
}: {
  memberResults: MemberResult[];
  logic: ReportScoringLogic;
  highlights?: Highlight[];
}) {
  const weights = logic.categoryWeightsApplied || {};
  const members = [...memberResults].sort((a, b) => b.contributionShare - a.contributionShare);
  const highlightById = new Map(highlights.map((h) => [h.id, h] as [string, Highlight]));
  const tasks = logic.tasks || [];

  return (
    <div className="space-y-8">
      {/* Shares */}
      <section aria-labelledby="shares">
        <h2 id="shares" className="text-sm font-semibold text-white mb-3">
          Contribution split
        </h2>
        <div className="h-3 rounded-full overflow-hidden flex bg-zinc-800 mb-4" aria-hidden="true">
          {members.map((m, i) => (
            <div
              key={m.userId}
              className={cn(["bg-purple-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-cyan-500"][i % 6])}
              style={{ width: `${Math.max(0, m.contributionShare)}%` }}
              title={`${m.displayName}: ${formatShare(m.contributionShare)}`}
            />
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {members.map((m) => {
            const parts = (m.categoryResults || [])
              .map((c) => ({ id: c.category, value: (weights[c.category] || 0) * c.normalizedValue, count: c.evidenceCount }))
              .filter((p) => p.value > 0);
            const partTotal = parts.reduce((s, p) => s + p.value, 0) || 1;
            return (
              <article key={m.userId} className="rounded-2xl border border-zinc-800 bg-[#09090b] p-5">
                <header className="flex items-center gap-3 mb-4">
                  <Avatar name={m.displayName} url={m.avatarUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white truncate">{m.displayName}</h3>
                    <p className="text-xs text-zinc-500">
                      {m.githubLogin ? `@${m.githubLogin} · ` : ""}
                      {typeof m.tasksDone === "number" ? `${m.tasksDone} tasks done · ${m.taskPoints ?? 0} pts` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-white tabular-nums">{formatShare(m.contributionShare)}</p>
                    <Pill tone={m.confidenceLevel === "HIGH" ? "green" : m.confidenceLevel === "MEDIUM" ? "amber" : "red"}>
                      {m.confidenceLevel?.toLowerCase()} confidence
                    </Pill>
                  </div>
                </header>

                {parts.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] text-zinc-500 mb-1.5">Where this share comes from</p>
                    <ul className="space-y-1">
                      {parts
                        .sort((a, b) => b.value - a.value)
                        .map((p) => (
                          <li key={p.id} className="flex items-center gap-2 text-xs text-zinc-400">
                            <span className={cn("w-1.5 h-1.5 rounded-full", CATEGORY_DOT[p.id as ContributionCategory])} />
                            <span className="flex-1">{CATEGORY_LABELS[p.id as ContributionCategory] || p.id}</span>
                            <span className="tabular-nums text-zinc-300">{Math.round((p.value / partTotal) * 100)}%</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {(m.positiveContributors || []).length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] text-zinc-500 mb-1.5">Biggest contributions</p>
                    <ul className="space-y-1">
                      {m.positiveContributors.slice(0, 5).map((c) => {
                        const h = highlightById.get(c.evidenceId);
                        return (
                          <li key={c.evidenceId} className="flex items-center gap-2 text-xs text-zinc-300">
                            {String(c.evidenceId).startsWith("task:") ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            ) : (
                              <SourceIcon source={h?.source} />
                            )}
                            <span className="truncate flex-1">{c.description}</span>
                            {h?.url && /^https?:\/\//i.test(h.url) && (
                              <a href={h.url} target="_blank" rel="noreferrer" aria-label="Open on GitHub" className="text-zinc-500 hover:text-white">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {(m.confidenceReasons || []).length > 0 && (
                  <ul className="text-[11px] text-amber-200/80 space-y-0.5">
                    {m.confidenceReasons.map((r) => (
                      <li key={r}>· {r}</li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Checks */}
      {(logic.integrity || []).length > 0 && (
        <section aria-labelledby="checks">
          <h2 id="checks" className="text-sm font-semibold text-white mb-3">
            Checks
          </h2>
          <ul className="rounded-2xl border border-zinc-800 bg-[#09090b] divide-y divide-zinc-800/80">
            {(logic.integrity || []).map((c) => (
              <li key={c.id} className="flex gap-3 px-4 py-3 text-sm">
                {CHECK_ICON[c.status]}
                <span className="text-zinc-300">
                  <span className="text-zinc-500">{c.label}:</span> {c.detail}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <section aria-labelledby="tasks">
          <h2 id="tasks" className="text-sm font-semibold text-white mb-3">
            Finished tasks ({tasks.length})
          </h2>
          <div className="rounded-2xl border border-zinc-800 bg-[#09090b] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-zinc-500 border-b border-zinc-800">
                  <th scope="col" className="px-4 py-2 font-medium">Task</th>
                  <th scope="col" className="px-4 py-2 font-medium">Type</th>
                  <th scope="col" className="px-4 py-2 font-medium">Points</th>
                  <th scope="col" className="px-4 py-2 font-medium">People</th>
                  <th scope="col" className="px-4 py-2 font-medium">Verified</th>
                  <th scope="col" className="px-4 py-2 font-medium">Done</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {tasks.map((t) => (
                  <tr key={t.id} className="align-top">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[11px] text-zinc-500 mr-2">{t.ref}</span>
                      <span className="text-zinc-200">{t.title}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-400 whitespace-nowrap">{CATEGORY_LABELS[t.category] || t.category}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-400">{t.points}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-300">
                      {t.assignees.length === 0
                        ? "Nobody"
                        : t.assignees.map((a) => (t.assignees.length > 1 ? `${a.name} ${a.share}%` : a.name)).join(", ")}
                    </td>
                    <td className="px-4 py-2.5">
                      {t.verification === "github" ? (
                        <Pill tone="green">
                          <ShieldCheck className="w-3 h-3" />
                          GitHub
                        </Pill>
                      ) : t.verification === "teammate" ? (
                        <Pill tone="green">Teammate</Pill>
                      ) : (
                        <Pill tone="amber">Self-reported</Pill>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500 whitespace-nowrap">
                      {t.completedAt ? formatShortDate(t.completedAt) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Open issues at publication */}
      {(logic.openIssues || []).length > 0 && (
        <section aria-labelledby="issues">
          <h2 id="issues" className="text-sm font-semibold text-white mb-3">
            Issues still open when this was published
          </h2>
          <ul className="space-y-2">
            {(logic.openIssues || []).map((i, idx) => (
              <li key={idx} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
                <p className="text-amber-100">{i.reason}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Asked for: {i.requestedChange} · raised by {i.raisedBy}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Method */}
      <section aria-labelledby="method" className="rounded-2xl border border-zinc-800 bg-[#09090b] p-5">
        <h2 id="method" className="text-sm font-semibold text-white mb-3">
          How credit was calculated
        </h2>
        <ul className="space-y-1.5 text-xs text-zinc-400 list-disc list-inside">
          {(logic.rules?.length ? logic.rules : CREDIT_RULES).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {Object.keys(weights).length > 0 && (
          <p className="text-xs text-zinc-500 mt-3">
            Weights:{" "}
            {Object.entries(weights)
              .map(([id, w]) => `${CATEGORY_LABELS[id as ContributionCategory] || id} ${Math.round(Number(w) * 100)}%`)
              .join(" · ")}
          </p>
        )}
        {logic.counts && (
          <p className="text-xs text-zinc-500 mt-1">
            Based on {logic.counts.doneTasks} done tasks and {logic.counts.githubItems} GitHub items
            {logic.counts.unattributedItems > 0 ? ` (${logic.counts.unattributedItems} unmatched items count for no one)` : ""}.
          </p>
        )}
      </section>
    </div>
  );
}
