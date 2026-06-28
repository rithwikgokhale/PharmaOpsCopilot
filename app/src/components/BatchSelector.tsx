import type { Batch } from "../types/domain";

interface Props {
  batches: Batch[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function BatchSelector({ batches, selectedId, onSelect }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="batch-select" className="text-sm font-medium text-slate-600">
        Batch
      </label>
      <select
        id="batch-select"
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
