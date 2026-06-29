import {
  Brush,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnomalyWindow, TimeSeriesPoint, TimeSeriesSignal } from "../types/domain";
import { formatTimeOnly } from "../utils/time";
import { useTheme } from "../hooks/useTheme";
import { useCopilotBus } from "../context/CopilotContext";
import { useToast } from "../context/ToastContext";

interface Props {
  signal: TimeSeriesSignal;
  points: TimeSeriesPoint[];
  anomalies: AnomalyWindow[];
  showBrush?: boolean;
}

export function TimeSeriesPanel({ signal, points, anomalies, showBrush = false }: Props) {
  const { theme } = useTheme();
  const { ask } = useCopilotBus();
  const { notify } = useToast();
  const dark = theme === "dark";

  const axisColor = dark ? "#94a3b8" : "#64748b";
  const gridDash = dark ? "#334155" : "#cbd5e1";

  const chartData = points.map((p) => ({
    time: formatTimeOnly(p.timestamp),
    value: p.value,
    timestamp: p.timestamp,
  }));

  const signalAnomalies = anomalies.filter((a) => a.signalId === signal.id);

  const askAboutAnomaly = (a: AnomalyWindow) => {
    ask(`Explain the "${a.label}" anomaly on ${signal.name} (${a.id}). What does the evidence show?`);
    notify(`Asked copilot about ${a.id}`, "info");
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card transition-shadow hover:shadow-card-hover dark:border-slate-700 dark:bg-brand-800">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {signal.name}{" "}
          <span className="font-normal text-slate-500 dark:text-slate-400">({signal.unit})</span>
        </h4>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Target {signal.range.target} · Range {signal.range.min}–{signal.range.max}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={showBrush ? 210 : 180}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={`grad-${signal.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={dark ? "#38bdf8" : "#334e68"} stopOpacity={0.9} />
              <stop offset="100%" stopColor={dark ? "#38bdf8" : "#334e68"} stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: axisColor }}
            interval="preserveStartEnd"
            minTickGap={40}
            stroke={axisColor}
          />
          <YAxis
            domain={[
              signal.range.min - (signal.range.max - signal.range.min) * 0.2,
              signal.range.max + (signal.range.max - signal.range.min) * 0.2,
            ]}
            tick={{ fontSize: 10, fill: axisColor }}
            width={45}
            stroke={axisColor}
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
            formatter={(value: number) => [value.toFixed(3), signal.name]}
          />
          <ReferenceLine y={signal.range.min} stroke={gridDash} strokeDasharray="4 4" />
          <ReferenceLine y={signal.range.max} stroke={gridDash} strokeDasharray="4 4" />
          <ReferenceLine y={signal.range.target} stroke={dark ? "#38bdf8" : "#3b82f6"} strokeDasharray="2 2" />
          {signalAnomalies.map((a) => {
            const startIdx = chartData.findIndex((d) => d.timestamp >= a.start);
            const endIdx = chartData.findIndex((d) => d.timestamp >= a.end);
            if (startIdx < 0) return null;
            const x1 = chartData[startIdx]?.time;
            const x2 = chartData[endIdx >= 0 ? endIdx : chartData.length - 1]?.time;
            return (
              <ReferenceArea
                key={a.id}
                x1={x1}
                x2={x2}
                fill={a.severity === "alarm" ? "#ef4444" : "#f59e0b"}
                fillOpacity={dark ? 0.22 : 0.16}
                onClick={() => askAboutAnomaly(a)}
                style={{ cursor: "pointer" }}
              />
            );
          })}
          <Line
            type="monotone"
            dataKey="value"
            stroke={`url(#grad-${signal.id})`}
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={600}
            name={signal.name}
          />
          {showBrush && (
            <Brush
              dataKey="time"
              height={20}
              stroke={axisColor}
              fill={dark ? "#0b2035" : "#f1f5f9"}
              travellerWidth={8}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {signalAnomalies.length > 0 && (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Tip: click a shaded anomaly to ask the copilot about it.
        </p>
      )}
    </div>
  );
}
