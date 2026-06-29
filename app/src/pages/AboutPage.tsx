import { motion } from "framer-motion";
import { staggerContainer, fadeUpItem } from "../utils/motion";

export function AboutPage() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-3xl space-y-6"
    >
      <motion.section variants={fadeUpItem}>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">About PharmaOps Copilot</h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          A Cognite-inspired, CDF-ready prototype for pharma batch deviation triage. It models a
          synthetic pilot plant — assets, equipment, time series, activities/events,
          files/documents, and source systems — and demonstrates how a scoped industrial AI agent
          could be grounded, guardrailed, and evaluated. It runs entirely locally with synthetic
          data and no Cognite or OpenAI credentials required.
        </p>
      </motion.section>

      <motion.section
        variants={fadeUpItem}
        className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-card dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200"
      >
        <p className="font-semibold">Synthetic data &amp; scope disclaimer</p>
        <p className="mt-1">
          This is not a validated GxP application and must not be used for real batch release, QA
          disposition, safety, or regulatory decisions. All data is synthetic. It is a
          field-engineering prototype showing how contextualized industrial data and LLM-based
          reasoning could support human-reviewed deviation triage.
        </p>
      </motion.section>

      <motion.section variants={fadeUpItem}>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          How the agent is designed
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>Backend assembles a deterministic evidence packet before any LLM call.</li>
          <li>Every claim cites real evidence IDs from the data — citations can't be hallucinated.</li>
          <li>Facts are separated from hypotheses; no confirmed root cause is asserted.</li>
          <li>Release / GMP / safety questions are declined and routed to human QA review.</li>
          <li>Output is checked by guardrails that neutralize overreaching phrasing.</li>
          <li>A 12-case eval suite verifies behavior whenever prompts or tools change.</li>
        </ul>
      </motion.section>

      <motion.section variants={fadeUpItem}>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Cognite mapping</h2>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          Assets/equipment/time series/files/activities map to the CDF core data model; the UI is
          structured like a Flows custom app; the agent mirrors an Atlas AI tool design. See the{" "}
          <span className="font-medium">CDF-ready</span> tab for the full mapping and architecture.
        </p>
      </motion.section>
    </motion.div>
  );
}
