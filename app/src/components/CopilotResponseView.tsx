import type { CopilotResponse, EvidenceRef } from "../types/agent";
import { formatTimeOnly } from "../utils/time";

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-200 text-slate-700",
};

const EVIDENCE_STYLES: Record<EvidenceRef["type"], string> = {
  event: "bg-blue-50 text-blue-700 border-blue-200",
  anomaly: "bg-red-50 text-red-700 border-red-200",
  workOrder: "bg-orange-50 text-orange-700 border-orange-200",
  operator_note: "bg-green-50 text-green-700 border-green-200",
  deviation: "bg-purple-50 text-purple-700 border-purple-200",
  signal: "bg-slate-50 text-slate-700 border-slate-200",
  document_section: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      {children}
    </div>
  );
}

export function CopilotResponseView({ resp }: { resp: CopilotResponse }) {
  return (
    <div className="space-y-4 text-sm">
      {resp.humanReviewRequired && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
          <span className="font-semibold">Human review required.</span>{" "}
          {resp.humanReviewDisclaimer}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${CONFIDENCE_STYLES[resp.confidence]}`}>
          {resp.confidence} confidence
        </span>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          intent: {resp.intent.replace(/_/g, " ")}
        </span>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          {resp.generatedBy === "openai" ? `OpenAI · ${resp.model}` : "deterministic engine"}
        </span>
      </div>

      <Section title="Answer">
        <p className="text-slate-800">{resp.answer}</p>
      </Section>

      {resp.whatHappened.length > 0 && (
        <Section title="What happened">
          <ul className="list-disc space-y-1 pl-5 text-slate-700">
            {resp.whatHappened.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Section>
      )}

      {resp.contributingFactors.length > 0 && (
        <Section title="Likely contributing factors (hypotheses)">
          <ul className="space-y-1.5">
            {resp.contributingFactors.map((f, i) => (
              <li key={i} className="rounded border border-slate-200 bg-white p-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-800">{f.factor}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${CONFIDENCE_STYLES[f.confidence]}`}>
                    {f.confidence}
                  </span>
                </div>
                {f.evidenceIds.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {f.evidenceIds.map((id) => (
                      <span key={id} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                        {id}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {resp.evidenceTimeline.length > 0 && (
        <Section title="Evidence timeline">
          <div className="space-y-1">
            {resp.evidenceTimeline.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-700">
                <span className="font-mono text-xs text-slate-500">{formatTimeOnly(t.timestamp)}</span>
                <span>{t.description}</span>
                {t.evidenceId && (
                  <span className="rounded bg-slate-100 px-1 font-mono text-[10px] text-slate-500">{t.evidenceId}</span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {resp.whatToCheckNext.length > 0 && (
        <Section title="What to check next">
          <ul className="list-disc space-y-1 pl-5 text-slate-700">
            {resp.whatToCheckNext.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Section>
      )}

      {resp.dataQuality.length > 0 && (
        <Section title="Data quality / missing context">
          <ul className="list-disc space-y-1 pl-5 text-amber-800">
            {resp.dataQuality.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {resp.relatedAssets.length > 0 && (
          <Section title="Related equipment">
            <div className="flex flex-wrap gap-1">
              {resp.relatedAssets.map((a) => (
                <span key={a.id} className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700">
                  {a.name}
                </span>
              ))}
            </div>
          </Section>
        )}
        {resp.relatedDocuments.length > 0 && (
          <Section title="SOP / document references">
            <div className="flex flex-wrap gap-1">
              {resp.relatedDocuments.map((d) => (
                <span key={d.id} className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] text-indigo-700">
                  {d.id}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>

      {resp.evidence.length > 0 && (
        <Section title={`Evidence used (${resp.evidence.length})`}>
          <div className="flex flex-wrap gap-1">
            {resp.evidence.map((e) => (
              <span
                key={`${e.type}-${e.id}`}
                title={e.detail ?? e.label}
                className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${EVIDENCE_STYLES[e.type]}`}
              >
                {e.id}
              </span>
            ))}
          </div>
        </Section>
      )}

      {resp.limitations.length > 0 && (
        <Section title="Confidence & limitations">
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
            {resp.limitations.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
