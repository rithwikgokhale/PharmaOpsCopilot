import { motion } from "framer-motion";
import { CDF_MAPPINGS } from "../types/cdfMapping";
import { ArchitectureDiagram, type FlowStep } from "./ArchitectureDiagram";
import { staggerContainer, fadeUpItem } from "../utils/motion";

const TODAY_FLOW: FlowStep[] = [
  { label: "Synthetic source systems", sublabel: "MES / Historian / CMMS", tone: "source" },
  { label: "Python generator", sublabel: "local ingestion", tone: "process" },
  { label: "Local domain model (JSON)", tone: "model" },
  { label: "LocalDataProvider (IDataProvider)", tone: "app" },
  { label: "React dashboard ←→ Express /api/copilot", tone: "app" },
  { label: "Evidence builder + deterministic tools", tone: "process" },
  { label: "OpenAI (optional, server-side)", sublabel: "evidence-grounded response", tone: "ai" },
];

const FUTURE_FLOW: FlowStep[] = [
  { label: "SAP / MES / CMMS / Historian / Files", tone: "source" },
  { label: "CDF extractors + contextualization", tone: "process" },
  { label: "CDF core / process data model (CDM views)", tone: "model" },
  { label: "CdfDataProvider (connectToHostApp)", tone: "app" },
  { label: "Flows custom app (this UI, hosted in CDF)", tone: "app" },
  { label: "Atlas AI agent + tools", sublabel: "queryKnowledgeGraph · queryTimeSeriesDatapoints · askDocument", tone: "ai" },
];

export function CdfReadinessPanel() {
  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-brand-800"
      >
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Local → CDF / Atlas mapping
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          The app depends only on the{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">IDataProvider</code>{" "}
          interface. Today a{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">LocalDataProvider</code>{" "}
          reads synthetic JSON; a{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">CdfDataProvider</code>{" "}
          could swap in without touching the UI. Mappings follow the{" "}
          <a
            href="https://docs.cognite.com/cdf/dm/dm_reference/dm_core_data_model"
            target="_blank"
            rel="noreferrer"
            className="text-accent-700 underline dark:text-accent-300"
          >
            CDF core data model
          </a>
          .
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="py-2 pr-4">Local entity</th>
                <th className="py-2 pr-4">CDF concept</th>
                <th className="py-2 pr-4">View</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
              {CDF_MAPPINGS.map((m) => (
                <motion.tr
                  variants={fadeUpItem}
                  key={m.localType}
                  className="border-b border-slate-100 align-top transition-colors hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-brand-700/30"
                >
                  <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">{m.localType}</td>
                  <td className="py-2 pr-4 text-accent-700 dark:text-accent-300">{m.cdfConcept}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-slate-500 dark:text-slate-400">{m.cdfView ?? "—"}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-300">{m.notes}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-2">
        <ArchitectureDiagram title="Today — local-first" steps={TODAY_FLOW} />
        <ArchitectureDiagram title="Future — CDF / Atlas" steps={FUTURE_FLOW} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-brand-800">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Integration steps</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>
            Implement <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">CdfDataProvider</code> against the
            Cognite SDK; authenticate via{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">connectToHostApp()</code> from{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">@cognite/app-sdk</code> when hosted in Flows.
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
