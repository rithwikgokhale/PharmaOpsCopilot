import { CdfReadinessPanel } from "../components/CdfReadinessPanel";

export function DataModelPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">CDF-ready architecture</h1>
        <p className="text-sm text-slate-600">
          How the local prototype maps onto Cognite Data Fusion, Flows, and Atlas AI.
        </p>
      </div>
      <CdfReadinessPanel />
    </div>
  );
}
