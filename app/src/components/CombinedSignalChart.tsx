import { useMemo, useState } from "react";
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeSeriesPoint, TimeSeriesSignal } from "../types/domain";
import { formatTimeOnly } from "../utils/time";
import { useTheme } from "../hooks/useTheme";

interface Props {
  signals: TimeSeriesSignal[];
  seriesData: Record<string, TimeSeriesPoint[]>;
}

const COLORS = ["#0ea5e9", "#dc2626", "#7c3aed", "#16a34a", "#ea580c", "#0891b2"];

/**
 * Overlays multiple signals on one axis by normalizing each to 0–100% of its
 * own acceptable range (so heterogeneous units are comparable). Toggle series,
 * zoom with the brush, and read all values from the shared crosshair tooltip.
 */
export function CombinedSignalChart({ signals, seriesData }: Props) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const [active, setActive] = useState<Set<string>>(() => new Set(signals.map((s) => s.id)));

  const axisColor = dark ? "#94a3b8" : "#64748b";

  const data = useMemo(() => {
    const normalizers: Record<string, (v: number) => number> = {};
    for (const sig of signals) {
      const span = sig.range.max - sig.range.min || 1;
      // Map [min, max] → [0, 100], keep some headroom for excursions.
      normalizers[sig.id] = (v: number) => ((v - sig.range.min) / span) * 100;
    }

    // Build a time-aligned table keyed by formatted time.
    const base = signals[0] ? seriesData[signals[0].id] ?? [] : [];
    const rows = base.map((p, i) => {
      const row: Record<string, number | string> = { time: formatTimeOnly(p.timestamp) };
      for (const sig of signals) {
        const pts = seriesData[sig.id] ?? [];
        const pt = pts[i];
        if (pt) {
          row[sig.id] = Math.round(normalizers[sig.id](pt.value) * 10) / 10;
          row[`${sig.id}__raw`] = pt.value;
        }
      }
      return row;
    });
    return rows;
  }, [signals, seriesData]);

  const toggle = (id: string) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-600 dark:bg-brand-900/40 dark:text-slate-400">
        No time-series data for this batch. Switch to Batch B-104 for the full demo storyline.
      </div>
    );
  }

  const activeNames = signals.filter((s) => active.has(s.id)).map((s) => s.name).join(", ");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card dark:border-slate-700 dark:bg-brand-800">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Combined signals{" "}
          <span className="font-normal text-slate-500 dark:text-slate-400">(% of acceptable range)</span>
        </h4>
        <div className="flex flex-wrap gap-1">
          {signals.map((sig, i) => {
            const on = active.has(sig.id);
            return (
              <button
                key={sig.id}
                type="button"
                onClick={() => toggle(sig.id)}
                aria-pressed={on}
                aria-label={`${on ? "Hide" : "Show"} ${sig.name} series`}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-all ${
                  on
                    ? "border-transparent text-white"
                    : "border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400"
                }`}
                style={on ? { backgroundColor: COLORS[i % COLORS.length] } : undefined}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: on ? "rgba(255,255,255,0.9)" : COLORS[i % COLORS.length] }}
                  aria-hidden
                />
                {sig.name}
              </button>
            );
          })}
        </div>
      </div>
      <div
        role="img"
        aria-label={`Combined normalized signals chart showing ${activeNames || "no active series"}`}
      >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1e3a52" : "#e2e8f0"} />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: axisColor }} minTickGap={40} stroke={axisColor} />
          <YAxis
            tick={{ fontSize: 10, fill: axisColor }}
            width={40}
            stroke={axisColor}
            domain={[-20, 120]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              backgroundColor: dark ? "#0b2035" : "#ffffff",
              color: dark ? "#e2e8f0" : "#0f172a",
            }}
            formatter={(value: number, name: string, item) => {
              const sig = signals.find((s) => s.name === name);
              const raw = sig ? (item.payload as Record<string, number>)[`${sig.id}__raw`] : undefined;
              return [raw !== undefined ? `${raw} ${sig?.unit} (${value}%)` : `${value}%`, name];
            }}
          />
          {signals.map((sig, i) =>
            active.has(sig.id) ? (
              <Line
                key={sig.id}
                type="monotone"
                dataKey={sig.id}
                name={sig.name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive
                animationDuration={500}
              />
            ) : null
          )}
          <Brush
            dataKey="time"
            height={20}
            stroke={axisColor}
            fill={dark ? "#0b2035" : "#f1f5f9"}
            travellerWidth={8}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        50% = range midpoint · values outside 0–100% are out of spec. Drag the brush to zoom.
      </p>
    </div>
  );
}
