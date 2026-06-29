import { ShieldAlert, ShieldCheck, ListChecks } from "lucide-react";
import { Section } from "../components/Section";
import { Card } from "../components/Card";

const INTENTS = [
  "deviation_triage",
  "release_decision",
  "maintenance_review",
  "shift_handover",
  "data_gaps",
  "sop_reference",
  "audience_framing",
];

const RULES = [
  "Use only the provided evidence packet and retrieved document sections.",
  "Never claim a confirmed root cause — prefer contributing factors and hypotheses.",
  "For QA/release/safety questions, decline and recommend human review.",
  "Cite evidence IDs (EVT-, WO-, SOP-, DEV-, SIG-) for factual claims.",
];

export function AgentDesign() {
  return (
    <Section
      id="agent"
      title="Agent design & guardrails"
      subtitle="The assistant summarizes operational evidence but must not make batch release, GMP, safety, or regulatory decisions."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <ShieldCheck className="text-green-600 dark:text-green-400" size={24} />
          <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">Evidence-first</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Every citation ID exists in the data packet before the model sees anything.
            Hallucinated references are structurally prevented.
          </p>
        </Card>
        <Card>
          <ShieldAlert className="text-amber-600 dark:text-amber-400" size={24} />
          <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">Release refusal</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Questions about release, disposition, GMP, or safety route to{" "}
            <code className="text-xs">release_decision</code> intent with a deterministic decline —
            the LLM never improvises disposition.
          </p>
        </Card>
        <Card>
          <ListChecks className="text-accent-600 dark:text-accent-400" size={24} />
          <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">Post-sanitization</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Banned phrases (e.g. &quot;safe to release&quot;, &quot;confirmed root cause&quot;) are
            rewritten to &quot;[requires human review]&quot; in all output fields.
          </p>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Scoped intents</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {INTENTS.map((i) => (
              <li
                key={i}
                className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 dark:bg-brand-900 dark:text-slate-300"
              >
                {i}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Universal rules</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
            {RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Card>
      </div>
    </Section>
  );
}
