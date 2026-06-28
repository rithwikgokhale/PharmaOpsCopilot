import type { ProcessEvent } from "../types/domain";
import { eventCategoryClass, formatTimeOnly } from "../utils/time";

interface Props {
  events: ProcessEvent[];
}

export function EventTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-500">No events for selected filters.</p>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Batch Timeline
      </h3>
      <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
        {events.map((evt) => (
          <div
            key={evt.id}
            className="flex items-start gap-2 rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <span className="shrink-0 font-mono text-xs text-slate-500">
              {formatTimeOnly(evt.timestamp)}
            </span>
            <span
              className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${eventCategoryClass(evt.category)}`}
            >
              {evt.category.replace("_", " ")}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-slate-800">{evt.title}</p>
              {evt.description && (
                <p className="text-xs text-slate-500">{evt.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
