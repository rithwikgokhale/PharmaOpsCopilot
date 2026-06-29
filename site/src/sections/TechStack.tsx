import { Section } from "../components/Section";
import { Card } from "../components/Card";

const STACK = [
  {
    layer: "Frontend",
    items: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "Recharts", "framer-motion", "lucide-react"],
  },
  {
    layer: "Backend",
    items: ["Node.js", "Express", "OpenAI SDK (optional)", "dotenv"],
  },
  {
    layer: "Data",
    items: ["Synthetic JSON", "Python generator", "IDataProvider abstraction", "Keyword document retrieval"],
  },
  {
    layer: "Quality",
    items: ["Vitest unit tests", "12-case eval runner", "Deterministic copilot mode", "Guardrail sanitization"],
  },
];

export function TechStack() {
  return (
    <Section
      id="tech"
      title="Tech stack"
      subtitle="Local-first development with no Cognite or OpenAI credentials required for the core demo."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {STACK.map((s) => (
          <Card key={s.layer}>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{s.layer}</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {s.items.map((item) => (
                <li
                  key={item}
                  className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-brand-900 dark:text-slate-300"
                >
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Why local-first?</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Field engineers can demo deviation triage without CDF access. The same UI and agent
          architecture maps cleanly onto Cognite Data Fusion, Flows custom apps, and Atlas AI when
          credentials and contextualized data are available.
        </p>
      </Card>
    </Section>
  );
}
