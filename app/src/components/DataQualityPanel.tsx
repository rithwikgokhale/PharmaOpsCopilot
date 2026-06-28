import { useEffect, useState } from "react";

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

  useEffect(() => {
    setLoading(true);
    fetch(`/api/batch/${batchId}/evidence`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((packet: EvidencePacketLite) => {
        setFlags(packet.dataQuality);
        setDeviationOpen(Boolean(packet.deviation && packet.deviation.status !== "closed"));
      })
      .catch(() => setFlags([]))
      .finally(() => setLoading(false));
  }, [batchId]);

  const safeToAct = !deviationOpen && flags.length === 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Data Quality
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            safeToAct ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {safeToAct ? "No blocking flags" : "Human review before acting"}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Checking data quality…</p>
      ) : flags.length === 0 ? (
        <p className="text-sm text-slate-500">No data quality issues detected for this batch.</p>
      ) : (
        <ul className="space-y-1.5">
          {flags.map((f) => (
            <li key={f.id} className="rounded border border-amber-200 bg-amber-50 p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase text-amber-700">
                  {CATEGORY_LABELS[f.category] ?? f.category}
                </span>
                <span className="flex gap-1">
                  {f.evidenceIds.map((id) => (
                    <span key={id} className="rounded bg-white px-1 font-mono text-[10px] text-amber-700">
                      {id}
                    </span>
                  ))}
                </span>
              </div>
              <p className="mt-0.5 text-amber-900">{f.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
