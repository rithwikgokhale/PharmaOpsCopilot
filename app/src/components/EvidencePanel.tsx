import type { Document, OperatorNote, WorkOrder } from "../types/domain";
import { formatTimestamp } from "../utils/time";

interface Props {
  workOrders: WorkOrder[];
  notes: OperatorNote[];
  documents: Document[];
}

export function EvidencePanel({ workOrders, notes, documents }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Work Orders
        </h3>
        <ul className="space-y-2">
          {workOrders.map((wo) => (
            <li
              key={wo.id}
              className="rounded border border-slate-200 bg-white p-2 text-sm"
            >
              <span className="font-mono text-xs text-brand-600">{wo.id}</span>
              <p className="font-medium">{wo.title}</p>
              <p className="text-xs text-slate-500">{wo.status} · {wo.priority}</p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Operator Notes
        </h3>
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded border border-slate-200 bg-white p-2 text-sm"
            >
              <p className="text-xs text-slate-500">
                {formatTimestamp(n.timestamp)} — {n.author}
              </p>
              <p className="mt-1">{n.content}</p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Documents / SOPs
        </h3>
        <ul className="space-y-2">
          {documents.map((d) => (
            <li
              key={d.id}
              className="rounded border border-slate-200 bg-white p-2 text-sm"
            >
              <p className="font-medium">{d.title}</p>
              <p className="text-xs text-slate-500">
                {d.documentType} · {d.sections.length} sections
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
