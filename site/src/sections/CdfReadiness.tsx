import { Section } from "../components/Section";
import { FlowDiagram } from "../components/FlowDiagram";
import { Card } from "../components/Card";

const MAPPINGS = [
  { local: "Site / Area / Asset", cdf: "CogniteAsset", notes: "Parent hierarchy via relations" },
  { local: "Equipment", cdf: "CogniteEquipment", notes: "asset direct relation" },
  { local: "TimeSeriesSignal", cdf: "CogniteTimeSeries", notes: "Datapoints via TS API" },
  { local: "Batch / Deviation", cdf: "CogniteActivity", notes: "Domain extension" },
  { local: "WorkOrder", cdf: "CogniteMaintenanceOrder", notes: "mainAsset relation" },
  { local: "Document / SOP", cdf: "CogniteFile", notes: "assets relation" },
  { local: "Copilot", cdf: "Atlas AI Agent", notes: "queryKnowledgeGraph, askDocument" },
  { local: "React App", cdf: "Flows custom app", notes: "connectToHostApp()" },
];

const TODAY = [
  { label: "Synthetic source systems", sublabel: "MES / Historian / CMMS", tone: "source" as const },
  { label: "Python generator", sublabel: "local JSON ingestion", tone: "process" as const },
  { label: "LocalDataProvider", tone: "app" as const },
  { label: "React dashboard + Express API", tone: "app" as const },
  { label: "Evidence builder + optional OpenAI", tone: "ai" as const },
];

const FUTURE = [
  { label: "SAP / MES / CMMS / Historian", tone: "source" as const },
  { label: "CDF extractors + contextualization", tone: "process" as const },
  { label: "CdfDataProvider", sublabel: "connectToHostApp()", tone: "app" as const },
  { label: "Flows custom app", tone: "app" as const },
  { label: "Atlas AI agent + tools", tone: "ai" as const },
];

export function CdfReadiness() {
  return (
    <Section
      id="cdf"
      title="CDF-ready architecture"
      subtitle="The app depends only on IDataProvider — swap LocalDataProvider for CdfDataProvider without UI changes."
    >
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-brand-800">
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
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Retrieval (future)</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Document retrieval today uses keyword overlap over a bounded SOP set — adequate for the
          demo. A future upgrade would swap{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">simpleRetriever.ts</code> for
          embedding-based search (e.g. OpenAI embeddings + vector store) without changing the
          evidence packet contract.
        </p>
      </Card>
    </Section>
  );
}
