"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Copy,
  Check,
  Zap,
  Activity,
  Flame,
} from "lucide-react";
import type { EvidenceItem, CategoryConfig } from "@/types";
import { formatPercent } from "@/lib/utils";

export interface TeamRadarMember {
  id: string;
  user_id?: string;
  role?: string;
  joined_at?: string;
  invitation_state?: string;
  user?: {
    id?: string;
    email?: string;
    raw_user_meta_data?: {
      name?: string;
      user_name?: string;
      avatar_url?: string;
    };
  } | null;
}

export interface TeamRadarWorkspace {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  start_date?: string;
  end_date?: string;
  categories?: CategoryConfig[];
}

interface TeamHealthRadarProps {
  workspace: TeamRadarWorkspace;
  members: TeamRadarMember[];
  evidence: EvidenceItem[];
}

export default function TeamHealthRadar({ workspace, members, evidence }: TeamHealthRadarProps) {
  const [copiedDigest, setCopiedDigest] = useState(false);

  // 1. Calculate Per-Member Contribution Proportions & Hero Syndrome
  const { topContributor, topContributorRatio, hasHeroSyndrome, isBalanced, memberCounts } = useMemo(() => {
    if (evidence.length === 0 || members.length === 0) {
      return { topContributor: null, topContributorRatio: 0, hasHeroSyndrome: false, isBalanced: true, memberCounts: {} };
    }

    const counts: Record<string, number> = {};
    for (const item of evidence) {
      const key = item.actor_id || item.actor_username || "unassigned";
      counts[key] = (counts[key] || 0) + 1;
    }

    let maxKey = "";
    let maxCount = 0;
    for (const [key, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxKey = key;
      }
    }

    const ratio = maxCount / evidence.length;
    const heroThreshold = members.length >= 3 ? 0.50 : 0.70;
    const isHero = ratio >= heroThreshold && evidence.length >= 8;
    const balanced = !isHero && ratio <= 0.45;

    // Find contributor display name
    const foundMember = members.find((m) => m.user_id === maxKey || m.user?.email === maxKey);
    const topName =
      foundMember?.user?.raw_user_meta_data?.name ||
      foundMember?.user?.raw_user_meta_data?.user_name ||
      foundMember?.user?.email ||
      maxKey;

    return {
      topContributor: topName,
      topContributorRatio: ratio,
      hasHeroSyndrome: isHero,
      isBalanced: balanced,
      memberCounts: counts,
    };
  }, [evidence, members]);

  // 2. Category Alignment Analysis
  const categoryAlignment = useMemo(() => {
    if (evidence.length === 0) return [];
    const catCounts: Record<string, number> = {};
    for (const item of evidence) {
      if (item.category) {
        catCounts[item.category] = (catCounts[item.category] || 0) + 1;
      }
    }

    return (workspace.categories || []).map((cat: CategoryConfig) => {
      const actualCount = catCounts[cat.id] || 0;
      const actualPct = actualCount / evidence.length;
      const targetPct = cat.weight || 0;
      const diff = actualPct - targetPct;

      let status: "on_track" | "under" | "over" = "on_track";
      if (diff < -0.10) status = "under";
      else if (diff > 0.15) status = "over";

      return {
        id: cat.id,
        name: cat.name,
        targetPct,
        actualPct,
        actualCount,
        status,
      };
    });
  }, [evidence, workspace.categories]);

  // 3. Peer Trust & Co-Signing Metric
  const peerTrustMetric = useMemo(() => {
    const manualAndReviewItems = evidence.filter(
      (e) => e.source === "manual" || e.source === "csv_import"
    );
    if (manualAndReviewItems.length === 0) return { total: 0, confirmed: 0, pct: 1.0 };

    const confirmed = manualAndReviewItems.filter(
      (e) => e.verification_state === "collaborator_confirmed"
    ).length;

    return {
      total: manualAndReviewItems.length,
      confirmed,
      pct: confirmed / manualAndReviewItems.length,
    };
  }, [evidence]);

  // 4. Generate Markdown Retrospective Digest
  const retrospectiveDigest = useMemo(() => {
    const dateStr = new Date().toLocaleDateString();
    const categoriesSummary = categoryAlignment
      .map((c) => `- **${c.name}**: ${c.actualCount} items (${formatPercent(c.actualPct)} of total)`)
      .join("\n");

    return `# 📊 TeamTrack AI — Sprint & Milestone Digest (${dateStr})
**Workspace**: ${workspace.name}
**Status**: ${workspace.status.toUpperCase()}
**Total Verified Evidence**: ${evidence.length} items across ${members.length} contributors

### 🏆 Team Health Summary
- **Work Distribution**: ${hasHeroSyndrome ? `⚠️ Hero Syndrome warning: ${topContributor} handles ${formatPercent(topContributorRatio)} of evidence.` : `✅ Healthy, balanced velocity across the team.`}
- **Peer Co-Signing Trust Index**: ${formatPercent(peerTrustMetric.pct)} of non-code deliverables have been peer-verified.

### 📈 Workstream Proportions
${categoriesSummary}

---
*Generated by TeamTrack AI — Outcome-based contribution tracking without Jira ticket fatigue.*`;
  }, [workspace, members, evidence, categoryAlignment, hasHeroSyndrome, topContributor, topContributorRatio, peerTrustMetric]);

  const handleCopyDigest = () => {
    navigator.clipboard.writeText(retrospectiveDigest);
    setCopiedDigest(true);
    setTimeout(() => setCopiedDigest(false), 2000);
  };

  return (
    <div className="card p-6 bg-white border border-border shadow-soft rounded-2xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-coral-50 flex items-center justify-center text-coral-600 shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Team Health & Velocity Radar</h3>
            <p className="text-xs text-muted">
              Live automated insights on bus factor, burnout risks, and role distribution.
            </p>
          </div>
        </div>

        <button
          onClick={handleCopyDigest}
          className="btn-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5 flex-shrink-0"
        >
          {copiedDigest ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedDigest ? "Digest Copied!" : "Copy Retrospective Digest"}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Metric 1: Work Distribution & Hero Syndrome */}
        <div className={`p-4 rounded-xl border ${
          hasHeroSyndrome
            ? "bg-amber-50/70 border-amber-200 text-amber-900"
            : "bg-emerald-50/50 border-emerald-100 text-emerald-950"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {hasHeroSyndrome ? (
              <Flame className="w-4 h-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider">
              {hasHeroSyndrome ? "Hero Syndrome Risk" : "Balanced Velocity"}
            </span>
          </div>

          {hasHeroSyndrome ? (
            <p className="text-xs leading-relaxed text-amber-800">
              <span className="font-bold">{topContributor}</span> is responsible for{" "}
              <span className="font-bold">{formatPercent(topContributorRatio)}</span> of total evidence. Consider redistributing code reviews or pairing to avoid burnout.
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-emerald-800">
              Contributions are evenly distributed across team members. No single point of failure (healthy bus factor).
            </p>
          )}
        </div>

        {/* Metric 2: Peer Trust & Co-Signing */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-coral-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Peer Trust Index
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-black text-foreground">
              {formatPercent(peerTrustMetric.pct)}
            </span>
            <span className="text-xs text-muted">
              ({peerTrustMetric.confirmed}/{peerTrustMetric.total} co-signed)
            </span>
          </div>
          <p className="text-xs text-muted">
            Non-code deliverables (Figma, docs, pitches) vouched by teammates.
          </p>
        </div>

        {/* Metric 3: Automated Effort Balance */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-coral-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Category Balance
            </span>
          </div>
          <div className="space-y-1.5">
            {categoryAlignment.slice(0, 3).map((cat) => (
              <div key={cat.id} className="flex items-center justify-between text-xs">
                <span className="text-muted truncate max-w-[120px]">{cat.name}:</span>
                <span className="font-semibold text-foreground">
                  {formatPercent(cat.actualPct)} <span className="text-muted font-normal">/ {formatPercent(cat.targetPct)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
