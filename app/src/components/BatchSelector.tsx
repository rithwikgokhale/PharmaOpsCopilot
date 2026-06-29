import type { Batch } from "../types/domain";

interface Props {
  batches: Batch[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function BatchSelector({ batches, selectedId, onSelect }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="batch-select" className="text-sm font-medium text-white/90">
        Batch
      </label>
      <select
        id="batch-select"
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="rounded-md border border-white/30 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition-colors focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/50 dark:bg-brand-800/90 dark:text-slate-100"
      >
        {batches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} — {b.status}
          </option>
        ))}
      </select>
    </div>
  );
}
