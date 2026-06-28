import { useState } from "react";
import { runEvalSuite, type EvalRunResult } from "../agent/agentClient";

const RISK_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-200 text-slate-700",
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
          <h1 className="text-xl font-bold text-slate-900">Evaluation suite</h1>
          <p className="text-sm text-slate-600">
            12 cases checking required mentions, banned phrasing (release/safety), and expected
            evidence IDs. Runs in deterministic mode for reproducibility.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Running…" : "Run evals"}
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <>
          <div className="flex gap-3">
            <Stat label="Total" value={result.total} />
            <Stat label="Passed" value={result.passed} tone="green" />
            <Stat label="Failed" value={result.failed} tone={result.failed ? "red" : "slate"} />
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Result</th>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Risk</th>
                  <th className="px-3 py-2">Question</th>
                  <th className="px-3 py-2">Intent</th>
                  <th className="px-3 py-2">Issues</th>
                </tr>
              </thead>
              <tbody>
                {result.cases.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                          c.pass ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {c.pass ? "PASS" : "FAIL"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{c.id}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${RISK_STYLES[c.riskLevel]}`}>
                        {c.riskLevel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{c.userQuestion}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{c.intent}</td>
                    <td className="px-3 py-2 text-xs text-red-600">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!result && !loading && (
        <p className="text-sm text-slate-500">Click “Run evals” to execute the suite.</p>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: number; tone?: "green" | "red" | "slate" }) {
  const styles =
    tone === "green"
      ? "bg-green-50 text-green-800 border-green-200"
      : tone === "red"
        ? "bg-red-50 text-red-800 border-red-200"
        : "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <div className={`rounded-lg border px-4 py-2 ${styles}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wide">{label}</div>
    </div>
  );
}
