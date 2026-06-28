import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { AnomalyWindow, TimeSeriesPoint, TimeSeriesSignal } from "../types/domain";
import { formatTimeOnly } from "../utils/time";

interface Props {
  signal: TimeSeriesSignal;
  points: TimeSeriesPoint[];
  anomalies: AnomalyWindow[];
}

export function TimeSeriesPanel({ signal, points, anomalies }: Props) {
  const chartData = points.map((p) => ({
    time: formatTimeOnly(p.timestamp),
    value: p.value,
    timestamp: p.timestamp,
  }));

  const signalAnomalies = anomalies.filter((a) => a.signalId === signal.id);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">
          {signal.name}{" "}
          <span className="font-normal text-slate-500">({signal.unit})</span>
        </h4>
        <span className="text-xs text-slate-500">
          Target {signal.range.target} · Range {signal.range.min}–{signal.range.max}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            domain={[
              signal.range.min - (signal.range.max - signal.range.min) * 0.2,
              signal.range.max + (signal.range.max - signal.range.min) * 0.2,
            ]}
            tick={{ fontSize: 10 }}
            width={45}
          />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value: number) => [value.toFixed(3), signal.name]}
          />
          <ReferenceLine
            y={signal.range.min}
            stroke="#94a3b8"
            strokeDasharray="4 4"
          />
          <ReferenceLine y={signal.range.max} stroke="#94a3b8" strokeDasharray="4 4" />
          <ReferenceLine y={signal.range.target} stroke="#3b82f6" strokeDasharray="2 2" />
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
                fill={a.severity === "alarm" ? "#fecaca" : "#fef3c7"}
                fillOpacity={0.5}
              />
            );
          })}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#334e68"
            strokeWidth={2}
            dot={false}
            name={signal.name}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
