import { useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { BatchSelector } from "./components/BatchSelector";
import { DataProvider, useData } from "./context/DataContext";
import { DashboardPage } from "./pages/DashboardPage";
import "./styles.css";

function AppHeader({
  selectedBatchId,
  onBatchChange,
  demoMode,
  onDemoModeChange,
}: {
  selectedBatchId: string;
  onBatchChange: (id: string) => void;
  demoMode: boolean;
  onDemoModeChange: (v: boolean) => void;
}) {
  const { batches } = useData();

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-brand-700">PharmaOps Copilot</h1>
            <span className="rounded bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
              CDF-ready prototype
            </span>
          </div>
          <p className="text-sm text-slate-500">Batch Deviation Triage</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <BatchSelector
            batches={batches}
            selectedId={selectedBatchId}
            onSelect={onBatchChange}
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => onDemoModeChange(e.target.checked)}
              className="rounded border-slate-300"
            />
            Demo Mode
          </label>
          <nav className="flex gap-3 text-sm">
            <Link to="/" className="font-medium text-brand-600 hover:underline">
              Dashboard
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">Copilot (Phase 2)</span>
          </nav>
        </div>
      </div>
    </header>
  );
}

function AppShell() {
  const [selectedBatchId, setSelectedBatchId] = useState("B-104");
  const [demoMode, setDemoMode] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        selectedBatchId={selectedBatchId}
        onBatchChange={setSelectedBatchId}
        demoMode={demoMode}
        onDemoModeChange={setDemoMode}
      />
      <main className="mx-auto max-w-[1600px] px-4 py-4">
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                selectedBatchId={selectedBatchId}
                demoMode={demoMode}
              />
            }
          />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
        Synthetic data only — not a validated GxP application. Human review required
        for QA/release decisions.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
}
