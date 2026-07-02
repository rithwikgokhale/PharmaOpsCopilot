import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Play } from "lucide-react";
import { runEvalSuite, type EvalRunResult } from "../agent/agentClient";
import { CountUp } from "../components/ui/CountUp";
import { staggerContainer, fadeUpItem } from "../utils/motion";

const RISK_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  low: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
};

export function EvalPage() {
  const [result, setResult] = useState<EvalRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setResult(await runEvalSuite());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eval run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Evaluation suite</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            18 cases checking required mentions, banned phrasing (release/safety), expected
            evidence IDs, and adversarial prompts. Runs in deterministic mode for reproducibility.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50 dark:bg-accent-700 dark:hover:bg-accent-600"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          {loading ? "Running…" : "Run evals"}
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="flex gap-3">
            <Stat label="Total" value={result.total} />
            <Stat label="Passed" value={result.passed} tone="green" />
            <Stat label="Failed" value={result.failed} tone={result.failed ? "red" : "slate"} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-brand-800">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-3 py-2">Result</th>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Risk</th>
                  <th className="px-3 py-2">Question</th>
                  <th className="px-3 py-2">Intent</th>
                  <th className="px-3 py-2">Issues</th>
                </tr>
              </thead>
              <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
                {result.cases.map((c) => (
                  <motion.tr
                    variants={fadeUpItem}
                    key={c.id}
                    className="border-b border-slate-100 align-top transition-colors hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-brand-700/30"
                  >
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                          c.pass
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                        }`}
                      >
                        {c.pass ? "PASS" : "FAIL"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-300">{c.id}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${RISK_STYLES[c.riskLevel]}`}>
                        {c.riskLevel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{c.userQuestion}</td>
                    <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">{c.intent}</td>
                    <td className="px-3 py-2 text-xs text-red-600 dark:text-red-400">
                      {c.pass
                        ? ""
                        : [
                            c.missingMentions.length ? `missing: ${c.missingMentions.join(", ")}` : "",
                            c.forbiddenFound.length ? `forbidden: ${c.forbiddenFound.join(", ")}` : "",
                            c.missingEvidenceIds.length ? `no evidence: ${c.missingEvidenceIds.join(", ")}` : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        </>
      )}

      {!result && !loading && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Click “Run evals” to execute the suite.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: number; tone?: "green" | "red" | "slate" }) {
  const styles =
    tone === "green"
      ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800"
      : tone === "red"
        ? "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
        : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-brand-800 dark:text-slate-200 dark:border-slate-700";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl border px-4 py-2 shadow-card ${styles}`}
    >
      <div className="text-2xl font-bold">
        <CountUp value={value} />
      </div>
      <div className="text-xs uppercase tracking-wide">{label}</div>
    </motion.div>
  );
}
