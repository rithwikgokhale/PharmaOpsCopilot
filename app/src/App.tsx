import { useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bot,
  Info,
  LayoutDashboard,
  Moon,
  Network,
  Sun,
} from "lucide-react";
import { BatchSelector } from "./components/BatchSelector";
import { DataProvider, useData } from "./context/DataContext";
import { CopilotProvider } from "./context/CopilotContext";
import { useTheme } from "./hooks/useTheme";
import { AboutPage } from "./pages/AboutPage";
import { CopilotPage } from "./pages/CopilotPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DataModelPage } from "./pages/DataModelPage";
import { EvalPage } from "./pages/EvalPage";
import "./styles.css";

const NAV = [
  { to: "/", label: "Dashboard", end: true, icon: LayoutDashboard },
  { to: "/copilot", label: "Copilot", icon: Bot },
  { to: "/cdf", label: "CDF-ready", icon: Network },
  { to: "/evals", label: "Evals", icon: BarChart3 },
  { to: "/about", label: "About", icon: Info },
];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white/70 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-brand-800/70 dark:text-slate-300 dark:hover:bg-brand-700"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

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
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-700/60 dark:bg-brand-900/80">
      <div className="bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 dark:from-brand-900 dark:via-brand-800 dark:to-brand-700">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/25">
              <Activity size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">PharmaOps Copilot</h1>
                <span className="rounded bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                  CDF-ready prototype
                </span>
              </div>
              <p className="text-xs text-white/80">Batch Deviation Triage</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {batches.length > 0 && (
              <BatchSelector
                batches={batches}
                selectedId={selectedBatchId}
                onSelect={onBatchChange}
              />
            )}
            <label className="flex items-center gap-2 text-sm text-white/90">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => onDemoModeChange(e.target.checked)}
                className="rounded border-white/40 bg-white/20 text-accent-500 focus:ring-accent-400"
              />
              Demo Mode
            </label>
            <ThemeToggle />
          </div>
        </div>
      </div>
      <nav className="mx-auto flex max-w-[1600px] gap-1 px-4">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "text-brand-700 dark:text-accent-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={15} />
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand-600 dark:bg-accent-400"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function AnimatedRoutes({ selectedBatchId, demoMode }: { selectedBatchId: string; demoMode: boolean }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <Routes location={location}>
          <Route
            path="/"
            element={<DashboardPage selectedBatchId={selectedBatchId} demoMode={demoMode} />}
          />
          <Route path="/copilot" element={<CopilotPage selectedBatchId={selectedBatchId} />} />
          <Route path="/cdf" element={<DataModelPage />} />
          <Route path="/evals" element={<EvalPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function AppShell() {
  const [selectedBatchId, setSelectedBatchId] = useState("B-104");
  const [demoMode, setDemoMode] = useState(true);

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <AppHeader
        selectedBatchId={selectedBatchId}
        onBatchChange={setSelectedBatchId}
        demoMode={demoMode}
        onDemoModeChange={setDemoMode}
      />
      <main className="mx-auto max-w-[1600px] px-4 py-4">
        <AnimatedRoutes selectedBatchId={selectedBatchId} demoMode={demoMode} />
      </main>
      <footer className="border-t border-slate-200 bg-white/60 py-3 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-brand-900/60 dark:text-slate-400">
        Synthetic data only — not a validated GxP application. Human review required
        for QA/release decisions.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <CopilotProvider>
        <AppShell />
      </CopilotProvider>
    </DataProvider>
  );
}
