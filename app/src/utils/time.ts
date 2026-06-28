import type { EventCategory } from "../types/domain";

const CATEGORY_COLORS: Record<EventCategory, string> = {
  process: "bg-blue-100 text-blue-800 border-blue-200",
  alarm: "bg-red-100 text-red-800 border-red-200",
  operator_action: "bg-green-100 text-green-800 border-green-200",
  maintenance: "bg-orange-100 text-orange-800 border-orange-200",
  quality: "bg-purple-100 text-purple-800 border-purple-200",
  document: "bg-slate-100 text-slate-700 border-slate-200",
};

export function eventCategoryClass(category: EventCategory): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.process;
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
