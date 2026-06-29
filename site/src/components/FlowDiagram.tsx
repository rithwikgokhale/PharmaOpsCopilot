import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

export interface FlowStep {
  label: string;
  sublabel?: string;
  tone?: "source" | "process" | "model" | "app" | "ai";
}

const TONE_STYLES: Record<NonNullable<FlowStep["tone"]>, string> = {
  source: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
  process: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-200",
  model: "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-700/40 dark:text-brand-100",
  app: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  ai: "border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-200",
};

export function FlowDiagram({ title, steps }: { title?: string; steps: FlowStep[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-brand-800">
      {title && (
        <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      )}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        className="flex flex-col items-stretch"
      >
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col items-center">
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
              }}
              className={`w-full rounded-lg border px-3 py-2 text-center text-sm font-medium shadow-sm ${TONE_STYLES[step.tone ?? "process"]}`}
            >
              {step.label}
              {step.sublabel && (
                <div className="mt-0.5 text-[11px] font-normal opacity-80">{step.sublabel}</div>
              )}
            </motion.div>
            {i < steps.length - 1 && (
              <div className="py-1 text-slate-500 dark:text-slate-400" aria-hidden>
                <ArrowDown size={16} />
              </div>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
