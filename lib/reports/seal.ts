// Tamper-evident seal for published reports. Server only.
// The seal is stored inside scoring_logic.seal and covers the report's
// results + snapshot. The public page recomputes it on every view.

import { createHash, createHmac, timingSafeEqual } from "crypto";

export interface ReportSeal {
  algorithm: "HMAC-SHA256";
  version?: 2;
  contentHash: string;
  signature: string;
  sealedAt: string;
}

export type SealStatus = "valid" | "modified" | "unsealed" | "unverifiable";

function signingKey(): Buffer {
  const explicit = process.env.REPORT_SIGNING_SECRET;
  if (explicit && explicit.length >= 16) return Buffer.from(explicit, "utf8");
  // Fallback: derive a separate key from the service role key.
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!base) throw new Error("Set REPORT_SIGNING_SECRET (or SUPABASE_SERVICE_ROLE_KEY) to seal reports.");
  return createHmac("sha256", base).update("teamtrack-report-seal-v1").digest();
}

/** JSON with sorted keys so the same data always hashes the same way. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v === undefined ? null : v)).join(",")}]`;
  const entries = Object.keys(value as Record<string, unknown>)
    .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
  return `{${entries.join(",")}}`;
}

interface SealableReport {
  id: string;
  workspace_id: string;
  version: number;
  status?: string;
  published_at?: string | null;
  member_results: unknown;
  scoring_logic: Record<string, unknown> | null;
}

function contentHashOf(report: SealableReport, sealedAt: string, version: 1 | 2): string {
  const { seal: _seal, ...logic } = (report.scoring_logic || {}) as Record<string, unknown>;
  const payload = canonicalJson({
    reportId: report.id,
    workspaceId: report.workspace_id,
    version: report.version,
    memberResults: report.member_results,
    scoringLogic: logic,
    sealedAt,
    ...(version === 2 ? {
      status: report.status,
      publishedAt: report.published_at ? new Date(report.published_at).toISOString() : null,
    } : {}),
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function createSeal(report: SealableReport, sealedAt: string): ReportSeal {
  const contentHash = contentHashOf(report, sealedAt, 2);
  const signature = createHmac("sha256", signingKey()).update(contentHash).digest("hex");
  return { algorithm: "HMAC-SHA256", version: 2, contentHash, signature, sealedAt };
}

export function verifySeal(report: SealableReport): { status: SealStatus; seal: ReportSeal | null } {
  const seal = (report.scoring_logic as Record<string, any> | null)?.seal as ReportSeal | undefined;
  if (!seal?.contentHash || !seal?.signature || !seal?.sealedAt) return { status: "unsealed", seal: null };

  let contentHash: string;
  try {
    // Existing v1 seals remain readable; newly published v2 seals also cover
    // publication state and timestamp.
    contentHash = contentHashOf(report, seal.sealedAt, seal.version === 2 ? 2 : 1);
  } catch {
    return { status: "modified", seal };
  }
  if (contentHash !== seal.contentHash) return { status: "modified", seal };

  try {
    const expected = Buffer.from(createHmac("sha256", signingKey()).update(contentHash).digest("hex"), "hex");
    const actual = Buffer.from(seal.signature, "hex");
    if (expected.length === actual.length && timingSafeEqual(expected, actual)) return { status: "valid", seal };
    return { status: "unverifiable", seal };
  } catch {
    return { status: "unverifiable", seal };
  }
}
