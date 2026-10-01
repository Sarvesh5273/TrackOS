import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(date: string | Date) {
  const d = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`) : new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** For fractions (0-1), e.g. 0.42 -> "42.0%". */
export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

/** For report shares, which are already percents (0-100), e.g. 33.3 -> "33.3%". */
export function formatShare(percent: number | null | undefined) {
  const value = Number(percent) || 0;
  return `${value.toFixed(1)}%`;
}

export function timeAgo(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

/** YYYY-MM-DD in local time, for <input type="date">. */
export function toDateInput(date: Date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
