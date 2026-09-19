import { Bot, GitBranch, Plug } from "lucide-react";
import { Section } from "../components/Section";
import { FlowDiagram } from "../components/FlowDiagram";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import report from "../../../data/generated/contextualization_report.json";

const GITHUB = "https://github.com/rithwikgokhale/PharmaOpsCopilot";

const MAPPINGS = [
  { local: "Site / Area", cdf: "ISA-95 Site → Area", notes: "isa_manufacturing views on CogniteAsset" },
  { local: "Bioreactor train / BIO-101", cdf: "ISA-95 ProcessCell / Unit", notes: "The unit that executes the batch" },
  { local: "Sensors, valves, CIP skid", cdf: "Equipment / EquipmentModule", notes: "CogniteEquipment, component of the unit" },
  { local: "Batch, phases", cdf: "ISA-88 Batch / Phase / Operation", notes: "Recipe execution on a unit" },
  { local: "Deviation", cdf: "PharmaDeviation (extension view)", notes: "Toolkit YAML in cdf/modules/" },
  { local: "Events, alarms, operator actions", cdf: "Records (BatchEvent)", notes: "Immutable, high-volume, linked to batch + equipment" },
  { local: "Historian tags", cdf: "ISATimeSeries", notes: "Matched to instrument-index loops" },
  { local: "Work orders", cdf: "ISA WorkOrder", notes: "or CogniteMaintenanceOrder for SAP-PM data" },
  { local: "SOPs, batch record, logbook", cdf: "ISAFile / CogniteFile", notes: "Sectioned for citation" },
  { local: "MES / Historian / CMMS / QMS", cdf: "CogniteSourceSystem", notes: "Provenance on every instance" },
  { local: "Copilot tools", cdf: "Atlas AI agent (agents as code)", notes: "Agent + skill + eval YAML exported from the repo" },
  { local: "server/mcp", cdf: "Industrial MCP", notes: "Same tool vocabulary; swap the endpoint" },
  { local: "React app", cdf: "Flows custom app", notes: "connectToHostApp()" },
];

const TODAY = [
  { label: "Siloed exports (data/raw)", sublabel: "MES · Historian · CMMS · QMS · Eng. register", tone: "source" as const },
  { label: "contextualize.py", sublabel: "ID resolution · units · timezones · dedupe", tone: "process" as const },
  { label: "Unified model (JSON)", sublabel: "ISA-88/95-shaped", tone: "model" as const },
  { label: "LocalDataProvider → React + Express", tone: "app" as const },
  { label: "Evidence tools + optional LLM", sublabel: "OpenAI / Anthropic / Gemini; also served as a local MCP server", tone: "ai" as const },
];

const FUTURE = [
  { label: "MES · Historian · CMMS · QMS · Files", tone: "source" as const },
  { label: "Extractors → RAW → transformations", sublabel: "Toolkit-deployed; entity matching", tone: "process" as const },
  { label: "ISA-88/95 data model + Records", tone: "model" as const },
  { label: "CdfDataProvider → Flows custom app", tone: "app" as const },
  { label: "Atlas AI agent + Industrial MCP", sublabel: "same tools, hosted by CDF", tone: "ai" as const },
];

const { summary } = report;

export function CdfReadiness() {
  return (
    <Section
      id="cdf"
      title="CDF-ready architecture"
      subtitle="Messy IT / OT / ET exports become one ISA-88/95-shaped model; the app depends only on IDataProvider, and the agent's tools are the ones Atlas AI and Industrial MCP expose."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <GitBranch size={18} className="text-accent-700 dark:text-accent-300" />
            <h3 className="font-semibold">Contextualization pipeline</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            The generator writes per-system exports with their own IDs, tag names, units, clocks and
            status codes. <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">contextualize.py</code>{" "}
            resolves them and writes a report that the app renders on its CDF-ready page.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Metric label="Source systems" value={summary.sources} />
            <Metric label="Historian datapoints" value={summary.datapointRows} />
            <Metric label="Cross-system matches" value={summary.matches} />
            <Metric label="Unresolved (excluded)" value={summary.unresolved} />
            <Metric label="Duplicates removed" value={summary.duplicatesRemoved} />
            <Metric label="Unit / time conversions" value={summary.conversions} />
            <Metric label="Fields repaired" value={summary.repairs} />
          </dl>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Bot size={18} className="text-accent-700 dark:text-accent-300" />
            <h3 className="font-semibold">Atlas AI agent as code</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">npm run export:atlas</code>{" "}
            generates the agent definition, an SOP-derived skill, and a Cognite CLI eval suite from
            the same guardrails and eval cases the local agent uses, so the Toolkit artifacts can never
            drift from the code.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge>pharmaops_triage.Agent.yaml</Badge>
            <Badge>…deviation_triage.Skill.md</Badge>
            <Badge>eval/eval.yaml</Badge>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Plug size={18} className="text-accent-700 dark:text-accent-300" />
            <h3 className="font-semibold">Local MCP server</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">npm run mcp</code> serves
            the evidence tools and the full triage over the Model Context Protocol, so Cursor or Claude
            Desktop can triage a batch directly. It mirrors Cognite's Industrial MCP: on CDF you point
            the client at the hosted endpoint instead.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge>query_events</Badge>
            <Badge>query_time_series_stats</Badge>
            <Badge>ask_documents</Badge>
            <Badge>triage_batch</Badge>
          </div>
        </Card>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-brand-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-4 py-2">Local</th>
              <th className="px-4 py-2">CDF</th>
              <th className="px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {MAPPINGS.map((m) => (
              <tr key={m.local} className="border-b border-slate-100 dark:border-slate-700/60">
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{m.local}</td>
                <td className="px-4 py-2 text-accent-700 dark:text-accent-300">{m.cdf}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{m.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <FlowDiagram title="Today — local-first" steps={TODAY} />
        <FlowDiagram title="Future — CDF / Atlas" steps={FUTURE} />
      </div>
      <Card className="mt-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">What is already written down</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>
            <a className="text-accent-700 underline dark:text-accent-300" href={`${GITHUB}/blob/main/COGNITE_MAPPING.md`}>
              COGNITE_MAPPING.md
            </a>{" "}
            — entity-by-entity mapping onto the ISA-88/95 pack, Records, and the deviation extension.
          </li>
          <li>
            <a className="text-accent-700 underline dark:text-accent-300" href={`${GITHUB}/tree/main/cdf`}>
              cdf/
            </a>{" "}
            — Toolkit module:{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">data_modeling/</code> (
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">PharmaDeviation</code>
            ),{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">streams/</code> (Records{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">BatchEvent</code>
            ), <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">agents/</code> (generated
            Atlas YAML) and the CLI eval suite.
          </li>
          <li>
            Retrieval today is keyword overlap over a bounded SOP set; the evidence packet contract
            is unchanged when it becomes embedding search or Atlas AI&apos;s{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">askDocument</code>.
          </li>
        </ul>
      </Card>
    </Section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-brand-900/40">
      <dt className="text-xs text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}
