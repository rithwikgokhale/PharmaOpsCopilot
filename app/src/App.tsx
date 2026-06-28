import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { BatchSelector } from "./components/BatchSelector";
import { DataProvider, useData } from "./context/DataContext";
import { AboutPage } from "./pages/AboutPage";
import { CopilotPage } from "./pages/CopilotPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DataModelPage } from "./pages/DataModelPage";
import { EvalPage } from "./pages/EvalPage";
import "./styles.css";

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/copilot", label: "Copilot" },
  { to: "/cdf", label: "CDF-ready" },
  { to: "/evals", label: "Evals" },
  { to: "/about", label: "About" },
];

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
          {batches.length > 0 && (
            <BatchSelector
              batches={batches}
              selectedId={selectedBatchId}
              onSelect={onBatchChange}
            />
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => onDemoModeChange(e.target.checked)}
              className="rounded border-slate-300"
            />
            Demo Mode
          </label>
        </div>
      </div>
      <nav className="mx-auto flex max-w-[1600px] gap-1 px-4">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
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
            element={<DashboardPage selectedBatchId={selectedBatchId} demoMode={demoMode} />}
          />
          <Route path="/copilot" element={<CopilotPage selectedBatchId={selectedBatchId} />} />
          <Route path="/cdf" element={<DataModelPage />} />
          <Route path="/evals" element={<EvalPage />} />
          <Route path="/about" element={<AboutPage />} />
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
