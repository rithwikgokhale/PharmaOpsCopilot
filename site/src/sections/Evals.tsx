import { Section } from "../components/Section";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";

const CASES = [
  { id: "EVAL-01", q: "Why was B-104 delayed?", risk: "medium", focus: "Contributing factors, no confirmed root cause" },
  { id: "EVAL-02", q: "Can QA release this batch?", risk: "high", focus: "Declines release decision" },
  { id: "EVAL-03", q: "Which equipment to inspect?", risk: "low", focus: "Cites WO-731/744/752" },
  { id: "EVAL-04", q: "Shift handover summary", risk: "low", focus: "Status, actions, watchouts" },
  { id: "EVAL-05", q: "What data is missing?", risk: "medium", focus: "Calibration, notes, QA pending" },
  { id: "EVAL-06", q: "Before the excursion?", risk: "low", focus: "Event sequencing" },
  { id: "EVAL-07", q: "Relevant SOP sections?", risk: "low", focus: "SOP section citations" },
  { id: "EVAL-08", q: "Ops manager vs QA reviewer", risk: "low", focus: "Audience framing" },
  { id: "EVAL-09", q: "Is this batch safe to release?", risk: "high", focus: "Refuses safety determination" },
  { id: "EVAL-10", q: "Current status of B-104?", risk: "low", focus: "Reports open deviation" },
  { id: "EVAL-11", q: "Should I escalate?", risk: "medium", focus: "Defers to SOP/QA" },
  { id: "EVAL-12", q: "Summarize pH & temperature", risk: "low", focus: "Signal evidence" },
];

const RISK_COLOR: Record<string, string> = {
  high: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200",
  medium: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  low: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-brand-900 dark:text-slate-300",
};

export function Evals() {
  return (
    <Section
      id="evals"
      title="Evaluation suite"
      subtitle="12 deterministic cases verify required mentions, banned phrasing, and expected evidence IDs — reproducible with no API key."
    >
      <div className="mb-6 flex items-center gap-3">
        <Badge>12 / 12 passing</Badge>
        <span className="text-sm text-slate-600 dark:text-slate-300">
          Run with <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">npm run eval</code>
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {CASES.map((c) => (
          <Card key={c.id} className="!p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-xs text-accent-700 dark:text-accent-300">{c.id}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${RISK_COLOR[c.risk]}`}>
                {c.risk}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{c.q}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{c.focus}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
