import { Section } from "../components/Section";
import { CodeBlock } from "../components/CodeBlock";
import { Card } from "../components/Card";

const STEPS = [
  { title: "Install dependencies", code: "npm install" },
  { title: "Generate synthetic data", code: "npm run generate-data" },
  { title: "Run frontend + API", code: "npm run dev" },
  { title: "Run eval suite", code: "npm run eval" },
  { title: "Run unit tests", code: "npm test" },
];

export function GettingStarted() {
  return (
    <Section
      id="setup"
      title="Getting started"
      subtitle="Open http://localhost:5173 after npm run dev. Default batch: B-104. Vite proxies /api to Express on port 3001."
    >
      <div className="space-y-6">
        {STEPS.map((s) => (
          <div key={s.title}>
            <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{s.title}</h3>
            <CodeBlock code={s.code} />
          </div>
        ))}
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Optional: LLM narrative</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Copy <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">.env.example</code> to{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">.env</code> and set one of{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">OPENAI_API_KEY</code>,{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">ANTHROPIC_API_KEY</code>, or{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">GEMINI_API_KEY</code>.{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">LLM_PROVIDER</code> selects
            among them; if unset, the first key present wins. Keys are read server-side only. The
            copilot and evals work without any key — evals always stay deterministic.
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Optional: MCP and Atlas export</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">npm run mcp</code> starts
            the local stdio MCP server (see{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">mcp.json.example</code>).{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">npm run export:atlas</code>{" "}
            regenerates the Atlas AI agent, skill, and eval YAML under{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-brand-900">cdf/</code>. Neither requires
            a CDF tenant.
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Demo question</h3>
          <p className="mt-2 text-sm italic text-slate-700 dark:text-slate-300">
            &quot;Why was Batch B-104 delayed, and what should I check before escalating the
            deviation?&quot;
          </p>
        </Card>
      </div>
    </Section>
  );
}
