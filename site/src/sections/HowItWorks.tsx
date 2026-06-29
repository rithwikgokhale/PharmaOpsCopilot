import { Section } from "../components/Section";
import { FlowDiagram } from "../components/FlowDiagram";
import { Card } from "../components/Card";

const PIPELINE = [
  { label: "User question", sublabel: "e.g. Why was B-104 delayed?", tone: "source" as const },
  { label: "Intent classification", sublabel: "triage / release / SOP / maintenance…", tone: "process" as const },
  { label: "Deterministic evidence packet", sublabel: "events, anomalies, stats, WOs, notes, SOPs", tone: "model" as const },
  { label: "Optional LLM narrative", sublabel: "OpenAI enriches prose only — citations stay deterministic", tone: "ai" as const },
  { label: "Guardrails sanitization", sublabel: "neutralize release/safety/root-cause overreach", tone: "process" as const },
  { label: "Structured answer", sublabel: "answer, timeline, factors, evidence IDs", tone: "app" as const },
];

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      title="How it works"
      subtitle="Evidence-first: the backend gathers facts via deterministic tools before any LLM reasoning. Citations come from data, not the model."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <FlowDiagram title="Copilot pipeline" steps={PIPELINE} />
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Evidence builder</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">evidenceBuilder.ts</code>{" "}
              calls tools to load batch summary, events, anomaly windows, time-series stats, work
              orders, operator notes, and keyword-retrieved SOP sections into one packet.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Deterministic core</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              The orchestrator builds a full structured response per intent without an API key.
              OpenAI, when configured, only rewrites narrative fields — evidence IDs are validated
              against the packet.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">IDataProvider</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              The UI reads synthetic JSON via <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">LocalDataProvider</code>.
              A future <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">CdfDataProvider</code> swaps
              in without UI changes.
            </p>
          </Card>
        </div>
      </div>
    </Section>
  );
}
