import { Clock, ClipboardList, Link2 } from "lucide-react";
import { Section } from "../components/Section";
import { Card } from "../components/Card";
import { FlowDiagram } from "../components/FlowDiagram";

const ASSUMPTIONS = [
  {
    label: "Cost of one delayed batch (illustrative)",
    value: "$80k–$250k",
    note: "Investigation labor, slot loss, and hold time on a pilot plant — a range, not a point estimate.",
  },
  {
    label: "Hand assembly of the B-104 packet (illustrative)",
    value: "2–4 hours",
    note: "Supervisor + QA pulling events, historian, CMMS, and SOP sections by hand.",
  },
  {
    label: "Copilot triage + human review (illustrative)",
    value: "15–25 minutes",
    note: "Deterministic packet first; a person still reads it and owns disposition.",
  },
  {
    label: "Similar deviations per quarter (illustrative)",
    value: "8–15",
    note: "A worked count for a site like the Chicago pilot plant, not a measured rate.",
  },
];

const ARCHITECTURE = [
  {
    label: "MES · Historian · CMMS · QMS · Eng. register",
    sublabel: "Siloed IT / OT / ET exports",
    tone: "source" as const,
  },
  {
    label: "Extractors / contextualization",
    sublabel: "Entity matching · units · timezones · dedupe",
    tone: "process" as const,
  },
  {
    label: "ISA-88/95 model + Records + PharmaDeviation",
    sublabel: "One navigable model; high-volume events stay off the graph",
    tone: "model" as const,
  },
  {
    label: "Industrial MCP · Atlas AI agent · Flows custom app",
    sublabel: "The same tool families; three surfaces, one packet contract",
    tone: "ai" as const,
  },
  {
    label: "Supervisor / QA",
    sublabel: "Human review — the assistant does not disposition the batch",
    tone: "app" as const,
  },
];

export function Value() {
  return (
    <Section
      id="value"
      title="Illustrative value"
      subtitle="A worked discovery-slide example for a pilot plant like B-104: time returned as the floor, avoided delay as the upside. Every figure below is synthetic."
    >
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
        <p className="font-semibold">Illustrative and synthetic — not a customer result</p>
        <p className="mt-1">
          These numbers are a field-engineering worked example, not a measured plant outcome and not
          Cognite pricing. PharmaOps Copilot is a local prototype; it is not in production and it
          does not make release, safety, or regulatory decisions.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {ASSUMPTIONS.map((a) => (
          <Card key={a.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {a.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{a.value}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.note}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          Worked example (illustrative midpoints)
        </h3>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          Take 3 h to assemble the packet by hand, 0.3 h for copilot triage plus human review, and
          12 deviations in a quarter:
        </p>
        <p className="mt-2 font-mono text-sm text-slate-800 dark:text-slate-200">
          hours returned ≈ (3 h − 0.3 h) × 12 ≈ 32 hours / quarter
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Those hours are the floor. If CIP / pH / temperature evidence surfaces the same day and
          one delayed batch is shortened, the illustrative upside is the $80k–$250k range above —
          still a hypothesis a reviewer would test on their own plant, not a claimed saving.
        </p>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <Clock className="text-accent-600 dark:text-accent-400" size={22} />
          <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">Triage time</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Illustrative: 2–4 hours of hand gathering → about 20 minutes of copilot triage plus
            review, with evidence IDs (EVT-, WO-, SOP-, DEV-) already attached. The packet is what
            a supervisor would otherwise assemble from four systems.
          </p>
        </Card>
        <Card>
          <ClipboardList className="text-accent-600 dark:text-accent-400" size={22} />
          <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">
            Deviation cycle time
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            A faster escalation package for QA — investigation steps and timing from{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">SOP-DEV-004</code> /{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">SOP-DEV-005</code>.
            Disposition stays with a qualified reviewer. The assistant only cites.
          </p>
        </Card>
        <Card>
          <Link2 className="text-accent-600 dark:text-accent-400" size={22} />
          <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">
            Data quality is the multiplier
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            An unresolved WFI tag, a duplicate work order, or a °F series treated as °C will
            poison every downstream answer. Bad joins make bad agents. The{" "}
            <a href="#cdf" className="font-medium text-accent-700 underline dark:text-accent-300">
              CDF-ready
            </a>{" "}
            page shows the three unresolved records this pipeline leaves unmatched on purpose.
          </p>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <FlowDiagram title="Target reference architecture" steps={ARCHITECTURE} />
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            What this repo actually runs
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Target reference architecture. This repo runs the local equivalent (
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">data/raw</code> →{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">contextualize.py</code> →
            MCP + React). Industrial MCP, Atlas AI, and Flows are the landing zones on CDF — not
            something this prototype deploys.
          </p>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            The{" "}
            <a href="#cdf" className="font-medium text-accent-700 underline dark:text-accent-300">
              CDF-ready
            </a>{" "}
            section keeps the today / future split. This picture is the single end-to-end slide.
          </p>
        </Card>
      </div>
    </Section>
  );
}
