import { motion } from "framer-motion";
import { AlertTriangle, ClipboardCheck, ShieldAlert } from "lucide-react";
import type { Batch, Deviation } from "../types/domain";
import { formatTimestamp } from "../utils/time";
import { StatusDot } from "./ui/StatusDot";

interface Props {
  batch: Batch;
  deviation?: Deviation;
}

const STATUS_STYLES: Record<string, string> = {
  deviation: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  delayed: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  running: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  complete: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  planned: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

function Chip({
  tone,
  icon,
  children,
}: {
  tone: "alarm" | "warning" | "info";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const cls =
    tone === "alarm"
      ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
      : tone === "warning"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
        : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      <StatusDot tone={tone} />
      {icon}
      {children}
    </span>
  );
}

export function DeviationSummary({ batch, deviation }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-brand-800"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{batch.name}</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${STATUS_STYLES[batch.status] ?? STATUS_STYLES.planned}`}
        >
          {batch.status}
        </span>
        {deviation && (
          <>
            <Chip tone="alarm" icon={<AlertTriangle size={12} />}>
              {deviation.id} — {deviation.status.replace("_", " ")}
            </Chip>
            <Chip tone="warning" icon={<ClipboardCheck size={12} />}>
              QA Review Pending
            </Chip>
            <Chip tone="info" icon={<ShieldAlert size={12} />}>
              Human Review Required
            </Chip>
          </>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <Field label="Product" value={batch.productCode} />
        <Field label="Phase" value={batch.currentPhase} capitalize />
        <Field label="Planned Start" value={formatTimestamp(batch.plannedStart)} />
        <Field
          label="Actual Start"
          value={batch.actualStart ? formatTimestamp(batch.actualStart) : "—"}
        />
      </div>
      {deviation && (
        <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800/60 dark:bg-purple-900/20">
          <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">
            {deviation.title}
          </p>
          <p className="mt-1 text-sm text-purple-800 dark:text-purple-300">{deviation.description}</p>
        </div>
      )}
      {batch.notes && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{batch.notes}</p>
      )}
    </motion.div>
  );
}

function Field({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`font-medium text-slate-800 dark:text-slate-200 ${capitalize ? "capitalize" : ""}`}>
        {value}
      </p>
    </div>
  );
}
