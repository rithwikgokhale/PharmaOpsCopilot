import { CDF_MAPPINGS } from "../types/cdfMapping";

export function CdfReadinessPanel() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Local → CDF / Atlas mapping</h2>
        <p className="mt-1 text-sm text-slate-600">
          The app depends only on the <code className="rounded bg-slate-100 px-1">IDataProvider</code>{" "}
          interface. Today a <code className="rounded bg-slate-100 px-1">LocalDataProvider</code> reads
          synthetic JSON; a <code className="rounded bg-slate-100 px-1">CdfDataProvider</code> could
          swap in without touching the UI. Mappings follow the{" "}
          <a
            href="https://docs.cognite.com/cdf/dm/dm_reference/dm_core_data_model"
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 underline"
          >
            CDF core data model
          </a>
          .
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Local entity</th>
                <th className="py-2 pr-4">CDF concept</th>
                <th className="py-2 pr-4">View</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {CDF_MAPPINGS.map((m) => (
                <tr key={m.localType} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-4 font-medium text-slate-800">{m.localType}</td>
                  <td className="py-2 pr-4 text-brand-700">{m.cdfConcept}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-slate-500">{m.cdfView ?? "—"}</td>
                  <td className="py-2 text-slate-600">{m.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-800">Today — local-first</h3>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
{`Synthetic source systems (MES / Historian / CMMS)
        ↓  Python generator
Local domain model (JSON)
        ↓  LocalDataProvider (IDataProvider)
React dashboard  ←→  Express /api/copilot
        ↓
Evidence builder + deterministic tools
        ↓ (optional)
OpenAI (server-side) → evidence-grounded response`}
          </pre>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-800">Future — CDF / Atlas</h3>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
{`SAP / MES / CMMS / Historian / Files
        ↓  CDF extractors + contextualization
CDF core / process data model (CDM views)
        ↓  CdfDataProvider (connectToHostApp)
Flows custom app (this UI, hosted in CDF)
        ↓
Atlas AI agent + tools
  (queryKnowledgeGraph, queryTimeSeriesDatapoints,
   askDocument) → grounded response`}
          </pre>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-800">Integration steps</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>
            Implement <code className="rounded bg-slate-100 px-1">CdfDataProvider</code> against the
            Cognite SDK; authenticate via{" "}
            <code className="rounded bg-slate-100 px-1">connectToHostApp()</code> from{" "}
            <code className="rounded bg-slate-100 px-1">@cognite/app-sdk</code> when hosted in Flows.
          </li>
          <li>Model Batch / Deviation / CIP cycle as domain extensions of CogniteActivity.</li>
          <li>Contextualize SOPs (CogniteFile) and work orders (CogniteMaintenanceOrder) to assets.</li>
          <li>
            Replace the local orchestrator with an Atlas AI agent configured against the CDF knowledge
            graph, keeping the same evidence-first, guardrailed tool design.
          </li>
        </ol>
      </section>
    </div>
  );
}
