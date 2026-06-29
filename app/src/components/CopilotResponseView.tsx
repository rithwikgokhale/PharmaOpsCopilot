import { motion } from "framer-motion";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  ClipboardList,
  FileText,
  ListChecks,
  MessageSquareText,
  ScrollText,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import type { CopilotResponse, EvidenceRef } from "../types/agent";
import { formatTimeOnly } from "../utils/time";
import { staggerContainer, fadeUpItem } from "../utils/motion";
import { Tooltip } from "./ui/Tooltip";

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  low: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
};

const EVIDENCE_STYLES: Record<EvidenceRef["type"], string> = {
  event: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  anomaly: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  workOrder: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  operator_note: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  deviation: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  signal: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
  document_section: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
};

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div variants={fadeUpItem}>
      <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {icon}
        {title}
      </h4>
      {children}
    </motion.div>
  );
}

export function CopilotResponseView({ resp }: { resp: CopilotResponse }) {
  const { notify } = useToast();

  const copyId = (id: string) => {
    navigator.clipboard?.writeText(id).then(
      () => notify(`Copied ${id}`, "success"),
      () => notify("Copy failed", "warning")
    );
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-4 text-sm"
    >
      {resp.humanReviewRequired && (
        <motion.div
          variants={fadeUpItem}
          className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200"
        >
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">Human review required.</span>{" "}
            {resp.humanReviewDisclaimer}
          </span>
        </motion.div>
      )}

      <motion.div variants={fadeUpItem} className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${CONFIDENCE_STYLES[resp.confidence]}`}>
          {resp.confidence} confidence
        </span>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          intent: {resp.intent.replace(/_/g, " ")}
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {resp.generatedBy === "openai" ? (
            <>
              <Sparkles size={11} /> OpenAI · {resp.model}
            </>
          ) : (
            "deterministic engine"
          )}
        </span>
      </motion.div>

      <Section title="Answer" icon={<MessageSquareText size={13} />}>
        <p className="text-slate-800 dark:text-slate-200">{resp.answer}</p>
      </Section>

      {resp.whatHappened.length > 0 && (
        <Section title="What happened" icon={<ScrollText size={13} />}>
          <ul className="list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">
            {resp.whatHappened.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Section>
      )}

      {resp.contributingFactors.length > 0 && (
        <Section title="Likely contributing factors (hypotheses)" icon={<AlertTriangle size={13} />}>
          <ul className="space-y-1.5">
            {resp.contributingFactors.map((f, i) => (
              <li
                key={i}
                className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-brand-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-800 dark:text-slate-200">{f.factor}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${CONFIDENCE_STYLES[f.confidence]}`}>
                    {f.confidence}
                  </span>
                </div>
                {f.evidenceIds.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {f.evidenceIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => copyId(id)}
                        className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {resp.evidenceTimeline.length > 0 && (
        <Section title="Evidence timeline" icon={<CalendarClock size={13} />}>
          <div className="space-y-1">
            {resp.evidenceTimeline.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {formatTimeOnly(t.timestamp)}
                </span>
                <span>{t.description}</span>
                {t.evidenceId && (
                  <span className="rounded bg-slate-100 px-1 font-mono text-[10px] text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    {t.evidenceId}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {resp.whatToCheckNext.length > 0 && (
        <Section title="What to check next" icon={<ListChecks size={13} />}>
          <ul className="list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">
            {resp.whatToCheckNext.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Section>
      )}

      {resp.dataQuality.length > 0 && (
        <Section title="Data quality / missing context" icon={<AlertTriangle size={13} />}>
          <ul className="list-disc space-y-1 pl-5 text-amber-800 dark:text-amber-300">
            {resp.dataQuality.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {resp.relatedAssets.length > 0 && (
          <Section title="Related equipment" icon={<Boxes size={13} />}>
            <div className="flex flex-wrap gap-1">
              {resp.relatedAssets.map((a) => (
                <span
                  key={a.id}
                  className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-brand-800 dark:text-slate-300"
                >
                  {a.name}
                </span>
              ))}
            </div>
          </Section>
        )}
        {resp.relatedDocuments.length > 0 && (
          <Section title="SOP / document references" icon={<FileText size={13} />}>
            <div className="flex flex-wrap gap-1">
              {resp.relatedDocuments.map((d) => (
                <Tooltip key={d.id} content={d.detail ? `${d.detail} — ${d.label}` : d.label}>
                  <span className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {d.id}
                  </span>
                </Tooltip>
              ))}
            </div>
          </Section>
        )}
      </div>

      {resp.evidence.length > 0 && (
        <Section title={`Evidence used (${resp.evidence.length})`} icon={<ClipboardList size={13} />}>
          <div className="flex flex-wrap gap-1">
            {resp.evidence.map((e) => (
              <Tooltip key={`${e.type}-${e.id}`} content={e.detail ?? e.label}>
                <button
                  type="button"
                  onClick={() => copyId(e.id)}
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] transition-transform hover:scale-105 ${EVIDENCE_STYLES[e.type]}`}
                >
                  {e.id}
                </button>
              </Tooltip>
            ))}
          </div>
        </Section>
      )}

      {resp.limitations.length > 0 && (
        <Section title="Confidence & limitations">
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500 dark:text-slate-400">
            {resp.limitations.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Section>
      )}
    </motion.div>
  );
}
