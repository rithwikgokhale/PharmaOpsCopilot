import { motion } from "framer-motion";
import { ArrowDown, ExternalLink, Play } from "lucide-react";
import { Badge } from "../components/Badge";

const GITHUB_URL = "https://github.com/rithwikgokhale/PharmaOpsCopilot";

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-300">
            CDF-ready prototype
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
            PharmaOps Copilot
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Evidence-grounded batch deviation triage for pharma manufacturing — synthetic
            data, guardrailed AI, and an architecture ready for Cognite Data Fusion.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Badge>TypeScript</Badge>
            <Badge>React</Badge>
            <Badge>Node.js</Badge>
            <Badge>OpenAI optional</Badge>
            <Badge>MIT</Badge>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-card hover:bg-brand-700 dark:bg-accent-700"
            >
              <ExternalLink size={18} />
              View on GitHub
            </a>
            <a
              href="#gallery"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-accent-500 dark:border-slate-600 dark:bg-brand-800 dark:text-slate-200"
            >
              <Play size={18} />
              See it in action
            </a>
          </div>
          <a
            href="#problem"
            className="mt-12 inline-flex flex-col items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
          >
            <span>Learn more</span>
            <ArrowDown size={18} className="animate-bounce" aria-hidden />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
