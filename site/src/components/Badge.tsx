export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-brand-800 dark:text-slate-200">
      {children}
    </span>
  );
}
