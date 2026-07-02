import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { staggerContainer, fadeUpItem } from "../utils/motion";

interface DataQualityFlag {
  id: string;
  category: string;
  message: string;
  severity: "info" | "warning";
  evidenceIds: string[];
}

interface EvidencePacketLite {
  dataQuality: DataQualityFlag[];
  deviation?: { id: string; status: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  missing_value: "Missing value",
  stale_data: "Stale data",
  calibration_due: "Calibration due",
  sensor_reliability: "Sensor reliability",
  incomplete_note: "Incomplete note",
  qa_pending: "QA disposition",
};

export function DataQualityPanel({ batchId }: { batchId: string }) {
  const [flags, setFlags] = useState<DataQualityFlag[]>([]);
  const [deviationOpen, setDeviationOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/batch/${batchId}/evidence`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`API returned ${r.status}`))))
      .then((packet: EvidencePacketLite) => {
        setFlags(packet.dataQuality);
        setDeviationOpen(Boolean(packet.deviation && packet.deviation.status !== "closed"));
      })
      .catch(() => {
        // Distinguish "API unreachable" from "no flags" — never show a green
        // all-clear when we simply couldn't check.
        setFlags([]);
        setDeviationOpen(false);
        setError("Data quality could not be checked — the copilot API is not reachable.");
      })
      .finally(() => setLoading(false));
  }, [batchId]);

  const safeToAct = !error && !deviationOpen && flags.length === 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card dark:border-slate-700 dark:bg-brand-800">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Data Quality
        </h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            safeToAct
              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
          }`}
        >
          {safeToAct ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
          {safeToAct ? "No blocking flags" : error ? "Status unknown" : "Human review before acting"}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Checking data quality…</p>
      ) : error ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
      ) : flags.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No data quality issues detected for this batch.
        </p>
      ) : (
        <motion.ul variants={staggerContainer} initial="hidden" animate="show" className="space-y-1.5">
          {flags.map((f) => (
            <motion.li
              variants={fadeUpItem}
              key={f.id}
              className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm dark:border-amber-800/60 dark:bg-amber-900/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase text-amber-700 dark:text-amber-300">
                  {CATEGORY_LABELS[f.category] ?? f.category}
                </span>
                <span className="flex gap-1">
                  {f.evidenceIds.map((id) => (
                    <span
                      key={id}
                      className="rounded bg-white px-1 font-mono text-[10px] text-amber-700 dark:bg-brand-900 dark:text-amber-300"
                    >
                      {id}
                    </span>
                  ))}
                </span>
              </div>
              <p className="mt-0.5 text-amber-900 dark:text-amber-200">{f.message}</p>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}
