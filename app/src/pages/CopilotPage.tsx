import { CopilotPanel } from "../components/CopilotPanel";

export function CopilotPage({ selectedBatchId }: { selectedBatchId: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Copilot — deviation triage
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Evidence-grounded answers for Batch {selectedBatchId}. The backend assembles a structured
          evidence packet (events, anomalies, time-series stats, work orders, operator notes, SOP
          sections) before any LLM reasoning, so every citation is real and release/safety decisions
          are deferred to human review.
        </p>
      </div>
      <div className="h-[720px]">
        <CopilotPanel batchId={selectedBatchId} />
      </div>
    </div>
  );
}
