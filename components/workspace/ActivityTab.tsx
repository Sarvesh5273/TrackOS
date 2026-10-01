"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  FileText,
  GitCommit,
  GitPullRequest,
  MessageSquare,
  RefreshCw,
  Search,
} from "lucide-react";
import { CATEGORY_LABELS, extractTaskRefs, formatTaskRef } from "@/lib/tasks";
import { cn, formatDateTime } from "@/lib/utils";
import type { EvidenceView, IntegrationView, ProjectContext } from "./types";
import { Avatar, Pill, Spinner, api, inputClass, secondaryButton, type ToastFn } from "./ui";

interface Props {
  ctx: ProjectContext;
  evidence: EvidenceView[];
  integration: IntegrationView | null;
  syncing: boolean;
  onSync: () => void;
  onChanged: () => void;
  onOpenTeam: () => void;
  toast: ToastFn;
}

const SOURCES = [
  { id: "all", label: "Everything" },
  { id: "github_commit", label: "Commits" },
  { id: "github_pr", label: "Pull requests" },
  { id: "github_review", label: "Reviews" },
  { id: "github_issue", label: "Issues" },
  { id: "manual", label: "Self-reported" },
];

function SourceIcon({ source }: { source: string }) {
  const cls = "w-4 h-4 text-zinc-500";
  if (source === "github_pr") return <GitPullRequest className={cls} />;
  if (source === "github_review") return <MessageSquare className={cls} />;
  if (source === "github_issue") return <CircleDot className={cls} />;
  if (source === "manual" || source === "csv_import") return <FileText className={cls} />;
  return <GitCommit className={cls} />;
}

export default function ActivityTab({ ctx, evidence, integration, syncing, onSync, onChanged, onOpenTeam, toast }: Props) {
  const { members, taskKey, currentUserId, readOnly, workspace } = ctx;
  const [source, setSource] = useState("all");
  const [person, setPerson] = useState("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(100);
  const [confirming, setConfirming] = useState<string | null>(null);

  const byId = useMemo(() => new Map(members.map((m) => [m.userId, m] as const)), [members]);
  const unmatched = evidence.filter(
    (e) => String(e.source).startsWith("github") && !e.resolved_actor_id && !e.is_bot_generated
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return evidence.filter((e) => {
      if (source !== "all" && e.source !== source) return false;
      if (person === "unmatched" && (e.resolved_actor_id || e.is_bot_generated)) return false;
      if (person !== "all" && person !== "unmatched" && e.resolved_actor_id !== person) return false;
      if (!q) return true;
      const sha = String((e.metadata as any)?.sha || "");
      return (
        (e.summary || "").toLowerCase().includes(q) ||
        (e.actor_username || "").toLowerCase().includes(q) ||
        sha.startsWith(q)
      );
    });
  }, [evidence, source, person, search]);

  const confirmItem = async (id: string) => {
    setConfirming(id);
    try {
      const data = await api<{ message: string }>(`/api/workspaces/${workspace.id}/evidence/${id}/confirm`, { method: "POST" });
      toast(data.message, "success");
      onChanged();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="space-y-4">
      {!integration ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#09090b] p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Connect GitHub to pull in commits, PRs and reviews</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Linked work verifies tasks automatically and counts toward credit.
            </p>
          </div>
          <button onClick={onOpenTeam} className={secondaryButton}>
            Set up in Team
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
          <span>
            {integration.selected_resources?.fullName || integration.selected_resources?.repo} ·{" "}
            {integration.last_synced_at ? `synced ${formatDateTime(integration.last_synced_at)}` : "not synced yet"}
            {integration.status === "error" && <span className="text-red-300"> · last sync failed</span>}
          </span>
          <button onClick={onSync} disabled={syncing} className={cn(secondaryButton, "py-1.5 text-xs")}>
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync now"}
          </button>
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100 flex gap-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" />
          <p>
            {unmatched.length} GitHub item{unmatched.length === 1 ? " isn't" : "s aren't"} matched to a teammate, so{" "}
            {unmatched.length === 1 ? "it doesn't" : "they don't"} count for anyone. Teammates can fix this by signing in
            with GitHub or adding their GitHub username in their profile (top right).
          </p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages, authors or commit SHA"
            aria-label="Search activity"
            className={cn(inputClass, "pl-9")}
          />
        </div>
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Type" className={cn(inputClass, "md:w-44")}>
          {SOURCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Person" className={cn(inputClass, "md:w-48")}>
          <option value="all">Everyone</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name}
            </option>
          ))}
          <option value="unmatched">Not matched</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
          {evidence.length === 0 ? "No activity yet. Connect GitHub or finish some tasks." : "Nothing matches these filters."}
        </div>
      ) : (
        <ul className="rounded-2xl border border-zinc-800 divide-y divide-zinc-800/80 bg-[#09090b]">
          {filtered.slice(0, limit).map((e) => {
            const member = e.resolved_actor_id ? byId.get(e.resolved_actor_id) : undefined;
            const refs = Array.from(
              new Set(extractTaskRefs(e.summary, taskKey).concat(extractTaskRefs(e.description, taskKey)))
            );
            const confirmations = ((e.metadata as any)?.confirmations || []) as { userId: string }[];
            const canConfirm =
              !readOnly &&
              e.source === "manual" &&
              e.actor_id &&
              e.actor_id !== currentUserId &&
              !confirmations.some((c) => c.userId === currentUserId);

            return (
              <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5">
                  <SourceIcon source={e.source} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <p className="text-sm text-zinc-100 break-words flex-1">{e.summary || "Untitled"}</p>
                    {e.source_url && /^https?:\/\//i.test(e.source_url) && (
                      <a
                        href={e.source_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open source"
                        className="text-zinc-500 hover:text-white shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-zinc-500">
                    {member ? (
                      <span className="inline-flex items-center gap-1.5 text-zinc-300">
                        <Avatar name={member.name} url={member.avatarUrl} size="xs" />
                        {member.name}
                      </span>
                    ) : (
                      <span className="text-zinc-400">
                        @{e.actor_username || "unknown"}
                        {!e.is_bot_generated && <span className="text-amber-300"> · not matched</span>}
                      </span>
                    )}
                    <span>· {formatDateTime(e.timestamp)}</span>
                    {e.category && <Pill>{CATEGORY_LABELS[e.category] || e.category}</Pill>}
                    {refs.map((n) => (
                      <Pill key={n} tone="purple">
                        {formatTaskRef(taskKey, n)}
                      </Pill>
                    ))}
                    {(e.metadata as any)?.merged && <Pill tone="green">Merged</Pill>}
                    {e.is_bot_generated && (
                      <Pill title="Bots don't earn credit">
                        <Bot className="w-3 h-3" />
                        Bot
                      </Pill>
                    )}
                    {e.source === "manual" &&
                      (e.verification_state === "collaborator_confirmed" ? (
                        <Pill tone="green">
                          <CheckCircle2 className="w-3 h-3" />
                          Confirmed
                        </Pill>
                      ) : (
                        <Pill tone="amber">Self-reported</Pill>
                      ))}
                  </div>
                </div>
                {canConfirm && (
                  <button
                    onClick={() => confirmItem(e.id)}
                    disabled={confirming === e.id}
                    className={cn(secondaryButton, "py-1 px-2.5 text-xs shrink-0")}
                  >
                    {confirming === e.id ? <Spinner /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Confirm
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > limit && (
        <div className="text-center">
          <button onClick={() => setLimit((l) => l + 100)} className={secondaryButton}>
            Show more ({filtered.length - limit} left)
          </button>
        </div>
      )}
    </div>
  );
}
