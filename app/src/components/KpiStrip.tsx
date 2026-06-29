import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, AlertOctagon, Clock, Wrench } from "lucide-react";
import { useData } from "../context/DataContext";
import { CountUp } from "./ui/CountUp";
import { Sparkline } from "./ui/Sparkline";
import { staggerContainer, fadeUpItem } from "../utils/motion";

interface Kpis {
  delayMinutes: number;
  oosPoints: number;
  openWorkOrders: number;
  severity: string;
  tempValues: number[];
  phValues: number[];
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: "text-red-600 dark:text-red-400",
  major: "text-amber-600 dark:text-amber-400",
  minor: "text-sky-600 dark:text-sky-400",
  none: "text-green-600 dark:text-green-400",
};

export function KpiStrip({ batchId }: { batchId: string }) {
  const { provider, loading, signals } = useData();
  const [kpis, setKpis] = useState<Kpis | null>(null);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;

    (async () => {
      const [batch, deviations, workOrders, series] = await Promise.all([
        provider.getBatch(batchId),
        provider.getDeviations(batchId),
        provider.listWorkOrders(),
        provider.getTimeSeries(batchId, ["SIG-TEMP-101", "SIG-PH-101"]),
      ]);

      let delayMinutes = 0;
      if (batch?.actualStart && batch.plannedStart) {
        delayMinutes = Math.round(
          (new Date(batch.actualStart).getTime() - new Date(batch.plannedStart).getTime()) / 60000
        );
      }

      const allSeries = await provider.getTimeSeries(
        batchId,
        signals.map((s) => s.id)
      );
      let oosPoints = 0;
      for (const sig of signals) {
        const pts = allSeries[sig.id] ?? [];
        oosPoints += pts.filter((p) => p.value < sig.range.min || p.value > sig.range.max).length;
      }

      const openWorkOrders = workOrders.filter((w) => w.status !== "closed").length;
      const severity = deviations[0]?.severity ?? "none";

      if (!cancelled) {
        setKpis({
          delayMinutes,
          oosPoints,
          openWorkOrders,
          severity,
          tempValues: (series["SIG-TEMP-101"] ?? []).map((p) => p.value),
          phValues: (series["SIG-PH-101"] ?? []).map((p) => p.value),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [provider, loading, batchId, signals]);

  if (!kpis) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-brand-800"
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      <KpiCard
        icon={<Clock size={16} />}
        label="Start delay"
        value={<CountUp value={kpis.delayMinutes} />}
        unit="min"
        tone={kpis.delayMinutes > 10 ? "warn" : "ok"}
      />
      <KpiCard
        icon={<AlertOctagon size={16} />}
        label="Out-of-spec points"
        value={<CountUp value={kpis.oosPoints} />}
        tone={kpis.oosPoints > 0 ? "warn" : "ok"}
        sparkline={kpis.tempValues}
        sparkColor="#dc2626"
      />
      <KpiCard
        icon={<Wrench size={16} />}
        label="Open work orders"
        value={<CountUp value={kpis.openWorkOrders} />}
        tone={kpis.openWorkOrders > 0 ? "warn" : "ok"}
      />
      <KpiCard
        icon={<Activity size={16} />}
        label="Deviation severity"
        value={<span className={`capitalize ${SEVERITY_STYLES[kpis.severity]}`}>{kpis.severity}</span>}
        sparkline={kpis.phValues}
        sparkColor="#7c3aed"
      />
    </motion.div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  unit,
  tone = "ok",
  sparkline,
  sparkColor = "#0ea5e9",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  unit?: string;
  tone?: "ok" | "warn";
  sparkline?: number[];
  sparkColor?: string;
}) {
  return (
    <motion.div
      variants={fadeUpItem}
      whileHover={{ y: -2 }}
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-card transition-shadow hover:shadow-card-hover dark:border-slate-700 dark:bg-brand-800"
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 ${tone === "warn" ? "bg-amber-400" : "bg-green-400"}`}
      />
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className={tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}>{icon}</span>
          {label}
        </span>
        {sparkline && sparkline.length > 1 && (
          <span style={{ color: sparkColor }}>
            <Sparkline values={sparkline} width={64} height={20} stroke={sparkColor} fill={sparkColor} />
          </span>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</span>
        {unit && <span className="text-xs text-slate-500 dark:text-slate-400">{unit}</span>}
      </div>
    </motion.div>
  );
}
