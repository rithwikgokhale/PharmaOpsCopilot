import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Info, LayoutGrid, LineChart as LineChartIcon } from "lucide-react";
import { AssetTree } from "../components/AssetTree";
import { CombinedSignalChart } from "../components/CombinedSignalChart";
import { CopilotPanel } from "../components/CopilotPanel";
import { DataQualityPanel } from "../components/DataQualityPanel";
import { DeviationSummary } from "../components/DeviationSummary";
import { EventTimeline } from "../components/EventTimeline";
import { EvidencePanel } from "../components/EvidencePanel";
import { KpiStrip } from "../components/KpiStrip";
import { TimeSeriesPanel } from "../components/TimeSeriesPanel";
import { SkeletonCard } from "../components/ui/Skeleton";
import { useData } from "../context/DataContext";
import type { Deviation, ProcessEvent } from "../types/domain";
import { useAssetTree } from "../utils/assetTree";

const CHART_SIGNALS = ["SIG-PH-101", "SIG-TEMP-101", "SIG-AG-101", "SIG-COND-201"];

interface Props {
  selectedBatchId: string;
  demoMode: boolean;
}

type ChartView = "grid" | "combined";

export function DashboardPage({ selectedBatchId, demoMode }: Props) {
  const { provider, loading, error, site, areas, assets, equipment, batches, signals } =
    useData();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [chartView, setChartView] = useState<ChartView>("grid");
  const [events, setEvents] = useState<ProcessEvent[]>([]);
  const [deviation, setDeviation] = useState<Deviation | undefined>();
  const [workOrders, setWorkOrders] = useState<Awaited<ReturnType<typeof provider.listWorkOrders>>>([]);
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof provider.getOperatorNotes>>>([]);
  const [documents, setDocuments] = useState<Awaited<ReturnType<typeof provider.listDocuments>>>([]);
  const [anomalies, setAnomalies] = useState<Awaited<ReturnType<typeof provider.getAnomalyWindows>>>([]);
  const [seriesData, setSeriesData] = useState<Record<string, Awaited<ReturnType<typeof provider.getTimeSeries>>[string]>>({});

  const tree = useAssetTree(site?.name ?? "Site", areas, assets, equipment);
  const batch = batches.find((b) => b.id === selectedBatchId);

  const filteredEvents = useMemo(() => {
    if (!selectedNodeId) return events;
    return events.filter(
      (e) => e.equipmentId === selectedNodeId || e.assetId === selectedNodeId
    );
  }, [events, selectedNodeId]);

  useEffect(() => {
    if (loading || !selectedBatchId) return;

    async function loadBatchData() {
      const [evts, devs, wos, opsNotes, docs, anoms, ts] = await Promise.all([
        provider.listEvents(selectedBatchId),
        provider.getDeviations(selectedBatchId),
        provider.listWorkOrders(),
        provider.getOperatorNotes(selectedBatchId),
        provider.listDocuments({ batchId: selectedBatchId }),
        provider.getAnomalyWindows(selectedBatchId),
        provider.getTimeSeries(selectedBatchId, CHART_SIGNALS),
      ]);

      setEvents(evts);
      setDeviation(devs[0]);
      setWorkOrders(wos);
      setNotes(opsNotes);
      setDocuments(docs);
      setAnomalies(anoms);
      setSeriesData(ts);
    }

    loadBatchData();
  }, [provider, loading, selectedBatchId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
        <p className="font-semibold">Failed to load data</p>
        <p className="text-sm">{error}</p>
        <p className="mt-2 text-sm">
          Run: <code className="rounded bg-red-100 px-1 dark:bg-red-900/50">npm run generate-data</code>
        </p>
      </div>
    );
  }

  if (!batch) return null;

  const chartSignals = signals.filter((s) => CHART_SIGNALS.includes(s.id));

  return (
    <div className="space-y-4">
      {demoMode && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200"
        >
          <Info size={15} />
          Demo Mode — synthetic data only. Not for GxP or batch release decisions.
        </motion.div>
      )}

      {selectedBatchId !== "B-104" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Batch B-104 is the fully modeled demo batch with events, anomalies, and copilot
          evidence. Other batches are illustrative placeholders.
        </div>
      )}

      <DeviationSummary batch={batch} deviation={deviation} />

      <KpiStrip batchId={selectedBatchId} />

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 rounded-xl border border-slate-200 bg-white p-3 shadow-card dark:border-slate-700 dark:bg-brand-800 lg:col-span-2">
          <AssetTree
            tree={tree}
            selectedId={selectedNodeId}
            onSelect={(id) => setSelectedNodeId(id === selectedNodeId ? null : id)}
          />
        </aside>

        <main className="col-span-12 space-y-4 lg:col-span-7">
          <EventTimeline events={selectedNodeId ? filteredEvents : events} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Time Series
              </h3>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-brand-800">
                <ViewToggle
                  active={chartView === "grid"}
                  onClick={() => setChartView("grid")}
                  icon={<LayoutGrid size={13} />}
                  label="Grid"
                />
                <ViewToggle
                  active={chartView === "combined"}
                  onClick={() => setChartView("combined")}
                  icon={<LineChartIcon size={13} />}
                  label="Combined"
                />
              </div>
            </div>

            {chartView === "grid" ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {chartSignals.map((sig) => (
                  <TimeSeriesPanel
                    key={sig.id}
                    signal={sig}
                    points={seriesData[sig.id] ?? []}
                    anomalies={anomalies}
                  />
                ))}
              </div>
            ) : (
              <CombinedSignalChart signals={chartSignals} seriesData={seriesData} />
            )}
          </div>

          <EvidencePanel workOrders={workOrders} notes={notes} documents={documents} />

          <DataQualityPanel batchId={selectedBatchId} />
        </main>

        <aside className="col-span-12 lg:col-span-3">
          <div className="sticky top-[140px] h-[640px]">
            <CopilotPanel batchId={selectedBatchId} compact />
          </div>
        </aside>
      </div>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-brand-600 text-white dark:bg-accent-700"
          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
