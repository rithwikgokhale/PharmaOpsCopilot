import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Copy, Database, Wrench } from "lucide-react";
import type { ContextualizationReport } from "../types/contextualization";
import { staggerContainer, fadeUpItem } from "../utils/motion";

const METHOD_LABEL: Record<string, string> = {
  exact: "Exact",
  alias: "Alias table",
  normalized: "Normalized",
  master_data_join: "Master-data join",
  fuzzy: "Fuzzy",
};

const LAYER_STYLE: Record<string, string> = {
  IT: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  OT: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  ET: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  derived: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
};

function Stat({ label, value, tone = "neutral" }: { label: string; value: number | string; tone?: "neutral" | "good" | "warn" }) {
  const color =
    tone === "good"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "warn"
        ? "text-amber-700 dark:text-amber-300"
        : "text-slate-900 dark:text-slate-100";
  return (
    <motion.div
      variants={fadeUpItem}
      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-brand-900/40"
    >
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-slate-600 dark:text-slate-400">{label}</div>
    </motion.div>
  );
}

function SubHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
      {icon}
      {children}
    </h3>
  );
}

/**
 * Shows how the siloed IT/OT/ET source exports under data/raw were resolved
 * into the unified model — the local stand-in for a CDF contextualization
 * pipeline. Reads the report written by scripts/contextualize.py.
 */
export function ContextualizationPanel() {
  const [report, setReport] = useState<ContextualizationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/generated/contextualization_report.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: ContextualizationReport) => setReport(json))
      .catch((e: Error) =>
        setError(`Contextualization report not available (${e.message}). Run npm run generate-data.`)
      );
  }, []);

  if (error) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
        {error}
      </section>
    );
  }
  if (!report) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-card dark:border-slate-700 dark:bg-brand-800 dark:text-slate-400">
        Loading contextualization report…
      </section>
    );
  }

  const { summary } = report;
  const methods = Object.entries(summary.matchesByMethod).sort((a, b) => b[1] - a[1]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-brand-800"
    >
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Contextualization: siloed sources → one model
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        The dashboard does not read clean data. <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">data/raw/</code>{" "}
        holds per-system exports with their own IDs, tag names, units, clocks, and status codes;{" "}
        <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">scripts/contextualize.py</code> resolves them
        into the unified model and records every join below. This is the local equivalent of CDF RAW → transformations →
        data model, and the report is what a reviewer would check before trusting the knowledge graph.
      </p>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Source systems" value={summary.sources} />
        <Stat label="Source rows (excl. datapoints)" value={summary.sourceRecords.toLocaleString()} />
        <Stat label="Cross-system matches" value={summary.matches} tone="good" />
        <Stat label="Unresolved" value={summary.unresolved} tone={summary.unresolved ? "warn" : "good"} />
        <Stat label="Duplicates removed" value={summary.duplicatesRemoved} />
        <Stat label="Fields repaired" value={summary.repairs} />
      </motion.div>

      <SubHeading icon={<Database size={14} />}>Source systems (IT / OT / ET)</SubHeading>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="py-2 pr-4">System</th>
              <th className="py-2 pr-4">Layer</th>
              <th className="py-2 pr-4">Records</th>
              <th className="py-2">Contents</th>
            </tr>
          </thead>
          <tbody>
            {report.sources.map((s) => (
              <tr key={s.system} className="border-b border-slate-100 align-top dark:border-slate-700/60">
                <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">{s.system}</td>
                <td className="py-2 pr-4">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${LAYER_STYLE[s.layer]}`}>{s.layer}</span>
                </td>
                <td className="py-2 pr-4 tabular-nums text-slate-700 dark:text-slate-300">{s.records.toLocaleString()}</td>
                <td className="py-2 text-slate-600 dark:text-slate-300">
                  {s.description}
                  <div className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{s.files.join(" · ")}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SubHeading icon={<ArrowRightLeft size={14} />}>How identities were resolved</SubHeading>
      <div className="mt-2 flex flex-wrap gap-2">
        {methods.map(([method, count]) => (
          <span
            key={method}
            className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-brand-900/40 dark:text-slate-200"
          >
            {METHOD_LABEL[method] ?? method}: <span className="font-semibold">{count}</span>
          </span>
        ))}
        <span className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-brand-900/40 dark:text-slate-200">
          Low confidence (&lt;0.9): <span className="font-semibold">{summary.lowConfidenceMatches}</span>
        </span>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
        {pickExamples(report).map((m) => (
          <li key={`${m.source}-${m.sourceKey}-${m.resolvedId}`} className="flex flex-wrap items-baseline gap-x-2">
            <span className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-slate-700">{m.source}</span>
            <span className="font-mono text-xs">{m.sourceKey}</span>
            <span className="text-slate-400">→</span>
            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">{m.resolvedId}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {METHOD_LABEL[m.method]} · {m.confidence.toFixed(2)} — {m.note}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <SubHeading icon={<AlertTriangle size={14} className="text-amber-600 dark:text-amber-300" />}>
            Unresolved (excluded from the model)
          </SubHeading>
          {report.unresolved.length === 0 ? (
            <p className="mt-2 flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={14} /> Everything resolved.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {report.unresolved.map((u) => (
                <li key={`${u.source}-${u.sourceKey}`}>
                  <span className="font-mono text-xs">{u.source} · {u.sourceKey}</span> — {u.reason}
                </li>
              ))}
            </ul>
          )}

          <SubHeading icon={<Copy size={14} />}>Duplicates removed</SubHeading>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {report.duplicatesRemoved.map((d) => (
              <li key={`${d.source}-${d.key}`}>
                <span className="font-mono text-xs">{d.source} · {d.key}</span> — kept {d.kept}, dropped {d.dropped}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SubHeading icon={<Wrench size={14} />}>Conversions and repairs</SubHeading>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {report.conversions.map((c) => (
              <li key={`${c.source}-${c.key}-${c.kind}`}>
                <span className="rounded bg-slate-100 px-1 text-xs uppercase dark:bg-slate-700">{c.kind}</span>{" "}
                <span className="font-mono text-xs">{c.source} · {c.key}</span> — {c.detail}{" "}
                <span className="text-xs text-slate-500 dark:text-slate-400">({c.records.toLocaleString()} records)</span>
              </li>
            ))}
            {report.repairs.map((r) => (
              <li key={`${r.source}-${r.key}-${r.field}`}>
                <span className="rounded bg-slate-100 px-1 text-xs uppercase dark:bg-slate-700">repair</span>{" "}
                <span className="font-mono text-xs">{r.source} · {r.key}.{r.field}</span> — {r.action}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.section>
  );
}

/** A handful of representative matches: one per method, preferring the more interesting ones. */
function pickExamples(report: ContextualizationReport) {
  const order = ["fuzzy", "alias", "master_data_join", "normalized", "exact"];
  const seen = new Set<string>();
  const out = [];
  for (const method of order) {
    const candidates = report.matches.filter((m) => m.method === method && m.sourceKey !== m.resolvedId);
    for (const m of candidates.slice(0, method === "exact" ? 1 : 2)) {
      const key = `${m.source}:${m.sourceKey}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(m);
      }
    }
  }
  return out;
}
