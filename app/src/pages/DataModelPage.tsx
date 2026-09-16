import { CdfReadinessPanel } from "../components/CdfReadinessPanel";
import { ContextualizationPanel } from "../components/ContextualizationPanel";

export function DataModelPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">CDF-ready architecture</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          How siloed IT / OT / ET data becomes one model, and how that model maps onto Cognite Data
          Fusion (ISA-88/95, Records), Atlas AI, and Industrial MCP.
        </p>
      </div>
      <ContextualizationPanel />
      <CdfReadinessPanel />
    </div>
  );
}
