"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/types";

// ============================================
// Fetch helper
// ============================================
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export async function api<T = any>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.code);
  return data as T;
}

export type ToastFn = (message: string, type?: "success" | "error" | "info") => void;

// ============================================
// Modal
// ============================================
export function Modal({
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  size = "md",
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const width = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-3xl" }[size];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "bg-[#09090b] rounded-2xl w-full shadow-2xl border border-zinc-800 max-h-full flex flex-col outline-none",
          width
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white truncate">{title}</h2>
              {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// ============================================
// Small building blocks
// ============================================
export function Avatar({
  name,
  url,
  size = "sm",
  className,
}: {
  name: string;
  url?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const dims = { xs: "w-5 h-5 text-[9px]", sm: "w-7 h-7 text-[11px]", md: "w-9 h-9 text-xs" }[size];
  return (
    <span
      title={name}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold overflow-hidden shrink-0",
        dims,
        className
      )}
    >
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (name || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

export function AvatarStack({ ids, members, max = 3 }: { ids: string[]; members: TeamMember[]; max?: number }) {
  if (ids.length === 0) return null;
  const byId = new Map(members.map((m) => [m.userId, m] as [string, TeamMember]));
  const shown = ids.slice(0, max);
  return (
    <span className="flex -space-x-1.5" aria-label={ids.map((id) => byId.get(id)?.name || "Former member").join(", ")}>
      {shown.map((id) => {
        const m = byId.get(id);
        return <Avatar key={id} name={m?.name || "?"} url={m?.avatarUrl} size="xs" className="ring-2 ring-[#09090b]" />;
      })}
      {ids.length > max && (
        <span className="w-5 h-5 rounded-full bg-zinc-800 ring-2 ring-[#09090b] text-[9px] text-zinc-300 flex items-center justify-center">
          +{ids.length - max}
        </span>
      )}
    </span>
  );
}

const PILL_TONES = {
  zinc: "bg-zinc-800/80 text-zinc-300 border-zinc-700",
  purple: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  red: "bg-red-500/10 text-red-300 border-red-500/20",
  blue: "bg-blue-500/10 text-blue-300 border-blue-500/20",
};

export function Pill({
  tone = "zinc",
  children,
  className,
  title,
}: {
  tone?: keyof typeof PILL_TONES;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap",
        PILL_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("w-4 h-4 animate-spin", className)} aria-hidden="true" />;
}

export function SectionTitle({ icon, children, action }: { icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        {icon && <span className="text-purple-400">{icon}</span>}
        {children}
      </h3>
      {action}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-zinc-800 bg-[#09090b] p-5", className)}>{children}</section>;
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-zinc-400 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-zinc-500 mt-1">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg bg-black border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-60";

export const primaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-3.5 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const secondaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 hover:bg-white/[0.04] text-zinc-300 hover:text-white text-sm font-medium px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const dangerButton =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm font-medium px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export function memberName(members: TeamMember[], id: string | null | undefined): string {
  if (!id) return "Unassigned";
  return members.find((m) => m.userId === id)?.name || "Former member";
}
