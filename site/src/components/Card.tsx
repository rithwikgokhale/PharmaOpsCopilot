import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-brand-800 ${className}`}
    >
      {children}
    </div>
  );
}
