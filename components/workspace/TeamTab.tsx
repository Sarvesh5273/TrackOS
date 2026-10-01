"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  FileText,
  Github,
  Link2,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Webhook,
} from "lucide-react";
import { CATEGORY_LABELS, DEFAULT_CATEGORY_WEIGHTS, TASK_KEY_PATTERN } from "@/lib/tasks";
import { cn, formatDateTime, toDateInput } from "@/lib/utils";
import type { ContributionCategory, PendingInvite, Workspace } from "@/types";
import { isLocalInviteUrl } from "@/lib/invites/url";
import type { IntegrationView, ProjectContext } from "./types";
import {
  Avatar,
  Field,
  Modal,
  Panel,
  Pill,
  SectionTitle,
  Spinner,
  api,
  dangerButton,
  inputClass,
  primaryButton,
  secondaryButton,
  type ToastFn,
} from "./ui";

interface Props {
  ctx: ProjectContext;
  integration: IntegrationView | null;
  syncing: boolean;
  onSync: () => void;
  onIntegrationChange: (integration: IntegrationView | null) => void;
  onWorkspaceChange: (workspace: Workspace) => void;
  onMembersChanged: () => void;
  toast: ToastFn;
}

export default function TeamTab({
  ctx,
  integration,
  syncing,
  onSync,
  onIntegrationChange,
  onWorkspaceChange,
  onMembersChanged,
  toast,
}: Props) {
  const { workspace, members, currentUserId, isLeader, canEdit, readOnly, taskKey } = ctx;
  const router = useRouter();

  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const loadInvites = useCallback(async () => {
    if (!isLeader) return;
    try {
      const data = await api<{ invites: PendingInvite[] }>(`/api/workspaces/${workspace.id}/members`);
      setInvites(data.invites || []);
    } catch {
      /* non-critical */
    }
  }, [isLeader, workspace.id]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const removeMember = async (membershipId: string, label: string) => {
    if (!confirm(`Remove ${label}? Their past work stays in the history, but they lose access.`)) return;
    try {
      await api(`/api/workspaces/${workspace.id}/members/${membershipId}`, { method: "DELETE" });
      toast(`${label} removed`, "success");
      onMembersChanged();
      loadInvites();
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  const disconnect = async () => {
    if (!integration || !confirm("Disconnect GitHub? Synced activity stays; the saved token is deleted.")) return;
    try {
      await api(`/api/workspaces/${workspace.id}/integrations/${integration.id}`, { method: "DELETE" });
      onIntegrationChange(null);
      toast("GitHub disconnected", "success");
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-5 items-start">
      <div className="lg:col-span-3 space-y-5">
        {/* Members */}
        <Panel>
          <SectionTitle
            icon={<Users className="w-4 h-4" />}
            action={
              isLeader && (
                <button onClick={() => setShowInvite(true)} className={cn(primaryButton, "py-1.5 text-xs")}>
                  <UserPlus className="w-3.5 h-3.5" />
                  Invite
                </button>
              )
            }
          >
            Team ({members.length})
          </SectionTitle>
          <ul className="divide-y divide-zinc-800/80">
            {members.map((m) => (
              <li key={m.membershipId} className="flex items-center gap-3 py-3">
                <Avatar name={m.name} url={m.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">
                    {m.name}
                    {m.userId === currentUserId && <span className="text-zinc-500"> (you)</span>}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {m.githubLogin ? `@${m.githubLogin}` : "No GitHub username yet"}
                    {m.email ? ` · ${m.email}` : ""}
                  </p>
                </div>
                <Pill tone={m.role === "leader" ? "purple" : m.role === "reviewer" ? "blue" : "zinc"}>
                  {m.role === "leader" ? "Leader" : m.role === "reviewer" ? "Reviewer" : "Member"}
                </Pill>
                {isLeader && m.role !== "leader" && (
                  <button
                    onClick={() => removeMember(m.membershipId, m.name)}
                    aria-label={`Remove ${m.name}`}
                    className="p-1.5 rounded-lg text-zinc-600 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {members.some((m) => !m.githubLogin) && (
            <p className="text-xs text-zinc-500 mt-3">
              Teammates without a GitHub username won&apos;t get credit for their commits. They can add it in their profile
              (avatar, top right).
            </p>
          )}

          {isLeader && invites.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-xs font-semibold text-zinc-400 mb-2">Pending invites</p>
              <ul className="space-y-2">
                {invites.map((inv) => (
                  <li key={inv.membershipId} className="flex items-center gap-2 text-xs text-zinc-400">
                    <Link2 className="w-3.5 h-3.5" />
                    <span className="flex-1">
                      {inv.role === "reviewer" ? "Reviewer" : "Member"} invite
                      {inv.expiresAt && ` · expires ${formatDateTime(inv.expiresAt)}`}
                    </span>
                    {inv.inviteUrl && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inv.inviteUrl!);
                          toast("Invite link copied", "success");
                        }}
                        className="text-purple-300 hover:text-purple-200"
                      >
                        Copy link
                      </button>
                    )}
                    {!inv.inviteUrl && <span className="text-amber-300">Set a public app URL to share this invite</span>}
                    <button
                      onClick={() => removeMember(inv.membershipId, "this invite")}
                      className="text-zinc-500 hover:text-red-300"
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
              {invites.some((inv) => inv.inviteUrl && isLocalInviteUrl(inv.inviteUrl)) && (
                <p className="text-xs text-amber-300 mt-2">Local links only work on this computer. Deploy the app before sharing them with remote teammates.</p>
              )}
            </div>
          )}
        </Panel>

        {/* GitHub */}
        <Panel>
          <SectionTitle icon={<Github className="w-4 h-4" />}>GitHub</SectionTitle>
          {integration ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-white font-medium">
                  {integration.selected_resources?.fullName || integration.selected_resources?.repo}
                </span>
                {integration.selected_resources?.isPrivate && <Pill>Private</Pill>}
                {integration.status === "error" ? (
                  <Pill tone="red">Last sync failed</Pill>
                ) : (
                  <Pill tone="green">Connected</Pill>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                {integration.last_synced_at ? `Last synced ${formatDateTime(integration.last_synced_at)}` : "Not synced yet"}
                {integration.error_message && ` · ${integration.error_message}`}
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={onSync} disabled={syncing} className={cn(primaryButton, "py-1.5 text-xs")}>
                  <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
                  {syncing ? "Syncing..." : "Sync now"}
                </button>
                <button onClick={() => setShowWebhook(true)} className={cn(secondaryButton, "py-1.5 text-xs")}>
                  <Webhook className="w-3.5 h-3.5" />
                  Auto-sync (webhook)
                </button>
                {isLeader && (
                  <>
                    <button onClick={() => setShowConnect(true)} className={cn(secondaryButton, "py-1.5 text-xs")}>
                      Change repository
                    </button>
                    <button onClick={disconnect} className={cn(secondaryButton, "py-1.5 text-xs hover:text-red-300")}>
                      Disconnect
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Connect your repository so commits, pull requests and reviews count automatically and link to tasks.
              </p>
              {isLeader ? (
                <button onClick={() => setShowConnect(true)} className={primaryButton}>
                  <Github className="w-4 h-4" />
                  Connect repository
                </button>
              ) : (
                <p className="text-xs text-zinc-500">Ask your project leader to connect the repository.</p>
              )}
            </div>
          )}
        </Panel>

        {isLeader && !readOnly && <SettingsPanel ctx={ctx} onWorkspaceChange={onWorkspaceChange} toast={toast} />}
      </div>

      <div className="lg:col-span-2 space-y-5">
        <BriefPanel ctx={ctx} canEdit={canEdit && !readOnly} onWorkspaceChange={onWorkspaceChange} toast={toast} />

        <Panel>
          <SectionTitle icon={<ShieldCheck className="w-4 h-4" />}>Credit weights</SectionTitle>
          <p className="text-xs text-zinc-500 mb-3">
            How much each type of work counts toward the final split. {isLeader ? "Change them in Project settings." : ""}
          </p>
          <ul className="space-y-2">
            {(workspace.categories?.length ? workspace.categories : DEFAULT_CATEGORY_WEIGHTS).map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-xs">
                <span className="w-32 text-zinc-400 truncate">{CATEGORY_LABELS[c.id as ContributionCategory] || c.name}</span>
                <span className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <span className="block h-full bg-purple-500" style={{ width: `${Math.round(c.weight * 100)}%` }} />
                </span>
                <span className="w-9 text-right text-zinc-300 tabular-nums">{Math.round(c.weight * 100)}%</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-zinc-600 mt-3">Task key: {taskKey}</p>
        </Panel>

        {isLeader && (
          <Panel className="border-red-500/20">
            <SectionTitle icon={<Trash2 className="w-4 h-4" />}>Danger zone</SectionTitle>
            <p className="text-xs text-zinc-500 mb-3">
              Deleting removes the board, activity and reports for everyone. Published report links stop working.
            </p>
            <button onClick={() => setShowDelete(true)} className={dangerButton}>
              Delete project
            </button>
          </Panel>
        )}
      </div>

      {showInvite && (
        <InviteModal
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          onClose={() => setShowInvite(false)}
          onCreated={loadInvites}
          toast={toast}
        />
      )}
      {showConnect && (
        <ConnectModal
          workspaceId={workspace.id}
          current={integration?.selected_resources?.fullName || ""}
          onClose={() => setShowConnect(false)}
          onConnected={(i) => {
            onIntegrationChange(i);
            setShowConnect(false);
            onSync();
          }}
        />
      )}
      {showWebhook && <WebhookModal taskKey={taskKey} onClose={() => setShowWebhook(false)} />}
      {showDelete && (
        <DeleteModal
          workspace={workspace}
          onClose={() => setShowDelete(false)}
          onDeleted={() => router.push("/dashboard")}
          toast={toast}
        />
      )}
    </div>
  );
}

// ============================================
// Project brief
// ============================================
function BriefPanel({
  ctx,
  canEdit,
  onWorkspaceChange,
  toast,
}: {
  ctx: ProjectContext;
  canEdit: boolean;
  onWorkspaceChange: (w: Workspace) => void;
  toast: ToastFn;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(ctx.workspace.project_brief || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const data = await api<{ workspace: Workspace }>(`/api/workspaces/${ctx.workspace.id}`, {
        method: "PUT",
        json: { project_brief: text },
      });
      onWorkspaceChange(data.workspace);
      setEditing(false);
      toast("Brief saved", "success");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel>
      <SectionTitle
        icon={<FileText className="w-4 h-4" />}
        action={
          canEdit &&
          !editing && (
            <button onClick={() => setEditing(true)} className="text-xs text-purple-300 hover:text-purple-200">
              {ctx.workspace.project_brief ? "Edit" : "Add"}
            </button>
          )
        }
      >
        Project brief
      </SectionTitle>
      {editing ? (
        <div className="space-y-3">
          <textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={8000}
            aria-label="Project brief"
            placeholder="What are you building, for whom, and what must be ready by the deadline?"
            className={cn(inputClass, "resize-y")}
          />
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className={cn(primaryButton, "py-1.5 text-xs")}>
              {saving && <Spinner />}
              Save
            </button>
            <button
              onClick={() => {
                setText(ctx.workspace.project_brief || "");
                setEditing(false);
              }}
              className={cn(secondaryButton, "py-1.5 text-xs")}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : ctx.workspace.project_brief ? (
        <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
          {ctx.workspace.project_brief}
        </p>
      ) : (
        <p className="text-sm text-zinc-500">
          A few sentences about the project. AI uses it to draft tasks and summaries.
        </p>
      )}
    </Panel>
  );
}

// ============================================
// Settings (leader)
// ============================================
function SettingsPanel({
  ctx,
  onWorkspaceChange,
  toast,
}: {
  ctx: ProjectContext;
  onWorkspaceChange: (w: Workspace) => void;
  toast: ToastFn;
}) {
  const w = ctx.workspace;
  const [name, setName] = useState(w.name);
  const [description, setDescription] = useState(w.description || "");
  const [taskKey, setTaskKey] = useState(ctx.taskKey);
  const [start, setStart] = useState(toDateInput(new Date(w.start_date)));
  const [end, setEnd] = useState(toDateInput(new Date(w.end_date)));
  const [weights, setWeights] = useState(
    (w.categories?.length ? w.categories : DEFAULT_CATEGORY_WEIGHTS).map((c) => ({ ...c, pct: Math.round(c.weight * 100) }))
  );
  const [saving, setSaving] = useState(false);
  const total = weights.reduce((s, c) => s + (Number(c.pct) || 0), 0);

  const save = async () => {
    if (!TASK_KEY_PATTERN.test(taskKey)) {
      toast("Task key: 2-6 letters or digits, starting with a letter.", "error");
      return;
    }
    if (total !== 100) {
      toast(`Credit weights must add up to 100% (now ${total}%).`, "error");
      return;
    }
    setSaving(true);
    try {
      const data = await api<{ workspace: Workspace }>(`/api/workspaces/${w.id}`, {
        method: "PUT",
        json: {
          name: name.trim(),
          description: description.trim() || null,
          taskKey,
          startDate: start,
          endDate: end,
          categories: weights.map((c) => ({ id: c.id, name: c.name, weight: (Number(c.pct) || 0) / 100 })),
        },
      });
      onWorkspaceChange(data.workspace);
      toast("Settings saved", "success");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel>
      <SectionTitle icon={<Settings className="w-4 h-4" />}>Project settings</SectionTitle>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Name" htmlFor="set-name">
            <input id="set-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={inputClass} />
          </Field>
          <Field
            label="Task key"
            htmlFor="set-key"
            hint={taskKey !== ctx.taskKey ? "Old references (like commits) keep the old key and won't link." : undefined}
          >
            <input
              id="set-key"
              value={taskKey}
              onChange={(e) => setTaskKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              className={cn(inputClass, "font-mono")}
            />
          </Field>
        </div>
        <Field label="Short description" htmlFor="set-desc">
          <input
            id="set-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            className={inputClass}
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Start date" htmlFor="set-start">
            <input id="set-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Deadline" htmlFor="set-end">
            <input id="set-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label={`Credit weights (total ${total}%)`} hint="Changing weights changes how future reports split credit.">
          <div className="grid sm:grid-cols-2 gap-2">
            {weights.map((c, i) => (
              <label key={c.id} className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="flex-1 truncate">{CATEGORY_LABELS[c.id as ContributionCategory] || c.name}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={c.pct}
                  onChange={(e) =>
                    setWeights((ws) => ws.map((x, j) => (j === i ? { ...x, pct: Math.round(Number(e.target.value) || 0) } : x)))
                  }
                  className={cn(inputClass, "w-20 py-1.5")}
                />
                <span>%</span>
              </label>
            ))}
          </div>
        </Field>
        <button onClick={save} disabled={saving} className={primaryButton}>
          {saving && <Spinner />}
          Save settings
        </button>
      </div>
    </Panel>
  );
}

// ============================================
// Modals
// ============================================
function InviteModal({
  workspaceId,
  workspaceName,
  onClose,
  onCreated,
  toast,
}: {
  workspaceId: string;
  workspaceName: string;
  onClose: () => void;
  onCreated: () => void;
  toast: ToastFn;
}) {
  const [role, setRole] = useState<"member" | "reviewer">("member");
  const [link, setLink] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const localLink = link ? isLocalInviteUrl(link) : false;

  const create = async () => {
    setLoading(true);
    try {
      const data = await api<{ inviteUrl: string; expiresAt: string }>(`/api/workspaces/${workspaceId}/invite`, {
        method: "POST",
        json: { role },
      });
      setLink(data.inviteUrl);
      setExpiresAt(data.expiresAt);
      onCreated();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Invite to the project" subtitle="Each link works once and expires in 7 days." icon={<UserPlus className="w-4 h-4" />} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Role" htmlFor="invite-role">
          <select
            id="invite-role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as "member" | "reviewer");
              setLink("");
            }}
            className={inputClass}
          >
            <option value="member">Member: works on tasks and earns credit</option>
            <option value="reviewer">Reviewer (professor, TA, mentor): view only, can confirm work</option>
          </select>
        </Field>
        {!link ? (
          <button onClick={create} disabled={loading} className={primaryButton}>
            {loading && <Spinner />}
            Create invite link
          </button>
        ) : (
          <div className="space-y-2">
            {localLink && (
              <p role="status" className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
                This localhost link only opens on this computer while the app is running. To invite someone on another device, deploy the app and set NEXT_PUBLIC_APP_URL to its public HTTPS address.
              </p>
            )}
            <div className="flex gap-2">
              <input readOnly value={link} aria-label="Invite link" className={cn(inputClass, "font-mono text-xs")} />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={secondaryButton}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Expires {formatDateTime(expiresAt)}.{" "}
              {!localLink && <a
                className="text-purple-300 hover:text-purple-200"
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/?text=${encodeURIComponent(`Join our project "${workspaceName}" on TeamTrack: ${link}`)}`}
              >
                Share on WhatsApp
              </a>}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ConnectModal({
  workspaceId,
  current,
  onClose,
  onConnected,
}: {
  workspaceId: string;
  current: string;
  onClose: () => void;
  onConnected: (integration: IntegrationView) => void;
}) {
  const [repo, setRepo] = useState(current);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const connect = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ integration: IntegrationView }>(`/api/workspaces/${workspaceId}/integrations`, {
        method: "POST",
        json: { provider: "github", config: { repo: repo.trim(), token: token.trim() || undefined } },
      });
      onConnected(data.integration);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Connect a GitHub repository"
      icon={<Github className="w-4 h-4" />}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={secondaryButton}>
            Cancel
          </button>
          <button onClick={connect} disabled={loading || !repo.trim()} className={primaryButton}>
            {loading && <Spinner />}
            Connect and sync
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <Field label="Repository" htmlFor="repo" hint="owner/repo or the full GitHub URL">
          <input
            id="repo"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="my-team/my-app"
            className={inputClass}
          />
        </Field>
        <Field
          label="Access token (only for private repos)"
          htmlFor="token"
          hint="A fine-grained token with read-only access to this repo's contents, pull requests and issues. It's stored on the server and never shown again."
        >
          <input
            id="token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="github_pat_..."
            className={inputClass}
          />
        </Field>
      </div>
    </Modal>
  );
}

function WebhookModal({ taskKey, onClose }: { taskKey: string; onClose: () => void }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/github` : "/api/webhooks/github";
  const [copied, setCopied] = useState(false);
  return (
    <Modal title="Auto-sync with a webhook" icon={<Webhook className="w-4 h-4" />} onClose={onClose}>
      <ol className="space-y-3 text-sm text-zinc-300 list-decimal list-inside">
        <li>In your repo on GitHub, open Settings → Webhooks → Add webhook.</li>
        <li>
          Payload URL:
          <span className="flex gap-2 mt-1.5">
            <input readOnly value={url} aria-label="Webhook URL" className={cn(inputClass, "font-mono text-xs")} />
            <button
              onClick={() => {
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={secondaryButton}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </span>
        </li>
        <li>Content type: application/json.</li>
        <li>
          Secret: the value of <code className="text-zinc-100">GITHUB_WEBHOOK_SECRET</code> on the server. Ask whoever runs
           the app if you don&apos;t have it. Without a matching secret, events are rejected.
        </li>
        <li>Events: pushes, pull requests, and pull request reviews.</li>
      </ol>
      <p className="text-xs text-zinc-500 mt-4">
        After that, commits and PRs appear within seconds, and PRs that say “closes {taskKey}-12” move tasks to Done on
        merge.
      </p>
    </Modal>
  );
}

function DeleteModal({
  workspace,
  onClose,
  onDeleted,
  toast,
}: {
  workspace: Workspace;
  onClose: () => void;
  onDeleted: () => void;
  toast: ToastFn;
}) {
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const remove = async () => {
    setLoading(true);
    try {
      await api(`/api/workspaces/${workspace.id}`, { method: "DELETE" });
      toast("Project deleted", "success");
      onDeleted();
    } catch (err: any) {
      toast(err.message, "error");
      setLoading(false);
    }
  };
  return (
    <Modal
      title="Delete this project?"
      icon={<Trash2 className="w-4 h-4" />}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className={secondaryButton}>
            Cancel
          </button>
          <button onClick={remove} disabled={typed !== workspace.name || loading} className={dangerButton}>
            {loading && <Spinner />}
            Delete forever
          </button>
        </>
      }
    >
      <p className="text-sm text-zinc-400 mb-3">
         This can&apos;t be undone. Type <span className="text-white font-medium">{workspace.name}</span> to confirm.
      </p>
      <input value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Project name" className={inputClass} />
    </Modal>
  );
}
