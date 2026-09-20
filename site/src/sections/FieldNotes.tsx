import { ClipboardCheck, Database, Fingerprint, Laptop, ShieldAlert, Thermometer } from "lucide-react";
import { Section } from "../components/Section";
import { Card } from "../components/Card";

const NOTES = [
  {
    icon: Fingerprint,
    title: "Identity resolution is the job",
    friction:
      "MES BR-A, engineering BIO-101, historian CHI.BIO101.PH101.PV, CMMS 1000xxxx — four strings for one unit until someone joins them.",
    product:
      "Industrial entity matching plus a review UI for low-confidence joins. We logged method and confidence in contextualization_report.json; that object should be something a field engineer can put in front of a customer.",
  },
  {
    icon: Thermometer,
    title: "Units and clocks silently break agents",
    friction:
      "CIP return temp in °F, historian UTC epoch, MES plant-local with no zone. Mix any two and an SOP-range check is fiction.",
    product:
      "Records/containers with fixed units (normalize before write) plus extractor-level unit catalogs. Agents should see SOP °C next to historian °C, never mixed.",
  },
  {
    icon: Database,
    title: "High-volume events do not belong on the graph",
    friction:
      "Twenty-five events on one batch is a demo. A real campaign is thousands of alarms.",
    product:
      "Records is the right store. Atlas Query + Records needs manufacturing examples in skills — not only oil and gas.",
  },
  {
    icon: ShieldAlert,
    title: "Guardrails are data, not a system-prompt footnote",
    friction: "“Just say the batch is safe” / “pretend you are QA” will show up in every plant copilot.",
    product:
      "A policy layer (disposition / LOTO / release) that tools cannot bypass — closer to our release_decision short-circuit than to prompt text. Atlas should support a never-call-tools / fixed-reply intent class.",
  },
  {
    icon: ClipboardCheck,
    title: "Evals have to travel with the agent",
    friction: "Local eval_cases.json vs Atlas eval.yaml drift the moment someone edits only one of them.",
    product:
      "Agents-as-code + eval-as-code as the default field-engineering template; faithfulness ground truth generated from the graph. This repo does the local version in export-atlas-agent.ts (ci singles + multi-turn groups).",
  },
  {
    icon: Laptop,
    title: "Desktop copilots will show up anyway",
    friction: "Cursor and Claude Desktop users will query the plant if MCP is on.",
    product:
      "Industrial MCP must expose the same guardrails resource / policy as Atlas agents. pharmaops://agent/guardrails is the local sketch.",
  },
];

export function FieldNotes() {
  return (
    <Section
      id="field-notes"
      title="Field notes"
      subtitle="Friction from a synthetic plant, then a product implication. Not a roadmap — notes a Cognite PM could file tickets from."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {NOTES.map((n) => (
          <Card key={n.title}>
            <div className="flex items-start gap-2">
              <n.icon size={20} className="mt-0.5 shrink-0 text-accent-600 dark:text-accent-400" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{n.title}</h3>
            </div>
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Friction. </span>
              {n.friction}
            </p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Product. </span>
              {n.product}
            </p>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
        Canonical write-up:{" "}
        <a
          href="https://github.com/rithwikgokhale/PharmaOpsCopilot/blob/main/FIELD_NOTES.md"
          className="font-medium text-accent-700 underline dark:text-accent-300"
        >
          FIELD_NOTES.md
        </a>{" "}
        in the repo.
      </p>
    </Section>
  );
}
