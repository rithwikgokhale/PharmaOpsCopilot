import type { Batch, Deviation } from "../types/domain";
import { formatTimestamp } from "../utils/time";

interface Props {
  batch: Batch;
  deviation?: Deviation;
}

const STATUS_STYLES: Record<string, string> = {
  deviation: "bg-red-100 text-red-800",
  delayed: "bg-amber-100 text-amber-800",
  running: "bg-blue-100 text-blue-800",
  complete: "bg-green-100 text-green-800",
  planned: "bg-slate-100 text-slate-600",
};

export function DeviationSummary({ batch, deviation }: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{batch.name}</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${STATUS_STYLES[batch.status] ?? STATUS_STYLES.planned}`}
        >
          {batch.status}
        </span>
        {deviation && (
          <>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
              {deviation.id} — {deviation.status.replace("_", " ")}
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              QA Review Pending
            </span>
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              Human Review Required
            </span>
          </>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div>
          <p className="text-xs text-slate-500">Product</p>
          <p className="font-medium">{batch.productCode}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Phase</p>
          <p className="font-medium capitalize">{batch.currentPhase}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Planned Start</p>
          <p className="font-medium">{formatTimestamp(batch.plannedStart)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Actual Start</p>
          <p className="font-medium">
            {batch.actualStart ? formatTimestamp(batch.actualStart) : "—"}
          </p>
        </div>
      </div>
      {deviation && (
        <div className="mt-3 rounded border border-purple-200 bg-purple-50 p-3">
          <p className="text-sm font-semibold text-purple-900">{deviation.title}</p>
          <p className="mt-1 text-sm text-purple-800">{deviation.description}</p>
        </div>
      )}
      {batch.notes && (
        <p className="mt-2 text-sm text-slate-600">{batch.notes}</p>
      )}
    </div>
  );
}
