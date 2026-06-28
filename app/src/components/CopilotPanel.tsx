export function CopilotPanel() {
  return (
    <div className="flex h-full flex-col rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-700">PharmaOps Copilot</h3>
      <p className="mt-2 text-sm text-slate-500">
        AI copilot coming in Phase 2. Will answer evidence-grounded questions via
        server-side OpenAI with human-review guardrails.
      </p>
      <div className="mt-4 flex-1 rounded border border-slate-200 bg-white p-3">
        <p className="text-xs text-slate-400">
          Demo question: &ldquo;Why was Batch B-104 delayed, and what should I check
          before escalating the deviation?&rdquo;
        </p>
      </div>
    </div>
  );
}
