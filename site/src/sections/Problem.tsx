import { Section } from "../components/Section";
import { Card } from "../components/Card";

export function Problem() {
  return (
    <Section
      id="problem"
      title="The problem"
      subtitle="Batch deviations in pharma require fast triage across events, sensors, work orders, operator notes, and SOPs — with strict human review for QA and release decisions."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">For supervisors</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Understand what happened on Batch B-104 — CIP delay, pH drift, temperature excursion —
            and what to check before escalating.
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">For QA reviewers</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Evidence-backed summaries with real citation IDs (events, work orders, SOP sections) —
            never release or disposition decisions from the assistant.
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">For field engineers</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            A local-first prototype showing how contextualized industrial data and scoped AI
            agents could plug into Cognite CDF and Atlas.
          </p>
        </Card>
      </div>
    </Section>
  );
}
