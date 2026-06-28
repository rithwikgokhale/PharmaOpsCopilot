import { useEffect, useMemo, useState } from "react";
import { AssetTree } from "../components/AssetTree";
import { CopilotPanel } from "../components/CopilotPanel";
import { DeviationSummary } from "../components/DeviationSummary";
import { EventTimeline } from "../components/EventTimeline";
import { EvidencePanel } from "../components/EvidencePanel";
import { TimeSeriesPanel } from "../components/TimeSeriesPanel";
import { useData } from "../context/DataContext";
import type { Deviation, ProcessEvent } from "../types/domain";
import { useAssetTree } from "../utils/assetTree";

const CHART_SIGNALS = ["SIG-PH-101", "SIG-TEMP-101", "SIG-AG-101", "SIG-COND-201"];

interface Props {
  selectedBatchId: string;
  demoMode: boolean;
}

export function DashboardPage({ selectedBatchId, demoMode }: Props) {
  const { provider, loading, error, site, areas, assets, equipment, batches, signals } =
    useData();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
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
      (e) =>
        e.equipmentId === selectedNodeId ||
        e.assetId === selectedNodeId
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
      <div className="flex h-64 items-center justify-center text-slate-500">
        Loading synthetic pharma data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-semibold">Failed to load data</p>
        <p className="text-sm">{error}</p>
        <p className="mt-2 text-sm">Run: <code className="rounded bg-red-100 px-1">npm run generate-data</code></p>
      </div>
    );
  }

  if (!batch) return null;

  const chartSignals = signals.filter((s) => CHART_SIGNALS.includes(s.id));

  return (
    <div className="space-y-4">
      {demoMode && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Demo Mode — synthetic data only. Not for GxP or batch release decisions.
        </div>
      )}

      <DeviationSummary batch={batch} deviation={deviation} />

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 rounded-lg border border-slate-200 bg-white p-3 lg:col-span-2">
          <AssetTree
            tree={tree}
            selectedId={selectedNodeId}
            onSelect={(id) => setSelectedNodeId(id === selectedNodeId ? null : id)}
          />
        </aside>

        <main className="col-span-12 space-y-4 lg:col-span-7">
          <EventTimeline events={selectedNodeId ? filteredEvents : events} />

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Time Series
            </h3>
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
          </div>

          <EvidencePanel
            workOrders={workOrders}
            notes={notes}
            documents={documents}
          />
        </main>

        <aside className="col-span-12 lg:col-span-3">
          <div className="h-full min-h-[320px]">
            <CopilotPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}
