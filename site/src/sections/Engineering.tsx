import { Link } from "react-router-dom";
import { Section } from "../components/Section";
import { FlowDiagram } from "../components/FlowDiagram";
import { Card } from "../components/Card";
import { slugify } from "../docs/slug";
import evalCases from "../../../evals/eval_cases.json";
import report from "../../../data/generated/contextualization_report.json";

const LIFECYCLE = [
  { label: "CopilotPanel", sublabel: "askCopilot from the browser", tone: "app" as const },
  { label: "POST /api/copilot/chat", sublabel: "zod chatRequestSchema", tone: "process" as const },
  { label: "classifyIntent", sublabel: "release questions never hit the LLM", tone: "process" as const },
  { label: "buildEvidencePacket", sublabel: "events, anomalies, WOs, notes, SOPs", tone: "model" as const },
  { label: "Deterministic builder or generateNarrative", sublabel: "OpenAI / Anthropic / Gemini optional", tone: "ai" as const },
  { label: "groundToPacket + applyGuardrails", sublabel: "citations from data; banned phrases neutralized", tone: "process" as const },
  { label: "CopilotResponse JSON", sublabel: "answer, factors, next checks, disclaimer", tone: "app" as const },
  { label: "CopilotResponseView", sublabel: "evidence chips in the UI", tone: "app" as const },
];

const ADRS = [
  "1. Local-first synthetic data, no CDF tenant",
  "2. IDataProvider seam with CdfDataProvider as a stub",
  "3. Deterministic-first agent; LLM optional",
  "6. Keyword first, then TF-IDF hybrid; no vector DB",
  "7. Records for events; ISA-88 Batch; `PharmaDeviation` extension",
  "9. Local MCP mirroring Industrial MCP families",
  "14. Guardrails as code + short-circuit for release/safety",
  "16. Evals as a CI gate without LLM keys",
];

const { summary } = report;

export function Engineering() {
  return (
    <Section
      id="engineering"
      title="Engineering documentation"
      subtitle="Architecture, decisions, and the CDF path as real pages — the same markdown GitHub renders, with diagrams and a table of contents."
    >
      <p className="mb-6 max-w-3xl text-slate-700 dark:text-slate-300">
        A senior engineer who has never opened the repo should be able to draw the runtime, name
        every library, and trace one copilot question from keystroke to answer. The canonical files
        live in <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">docs/engineering/</code>.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <FlowDiagram title="Request lifecycle" steps={LIFECYCLE} />
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Decisions at a glance</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {ADRS.map((heading) => (
                <li key={heading}>
                  <Link
                    to={`/docs/08-decisions#${slugify(heading.replace(/`/g, ""))}`}
                    className="text-accent-700 hover:underline dark:text-accent-300"
                  >
                    {heading.replace(/`/g, "")}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">By the numbers</h3>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Metric label="Eval cases" value={evalCases.length} />
              <Metric label="Source systems" value={summary.sources} />
              <Metric label="Source rows" value={summary.sourceRecords} />
              <Metric label="Datapoints" value={summary.datapointRows} />
              <Metric label="Matches" value={summary.matches} />
              <Metric label="Unresolved" value={summary.unresolved} />
            </dl>
          </Card>
        </div>
      </div>
      <div className="mt-8">
        <Link
          to="/docs"
          className="inline-flex items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-accent-700"
        >
          Read the engineering docs
        </Link>
      </div>
    </Section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-brand-900/40">
      <dt className="text-xs text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {value.toLocaleString("en-US")}
      </dd>
    </div>
  );
}
