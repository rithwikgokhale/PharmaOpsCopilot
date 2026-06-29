import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Section({ id, title, subtitle, children }: Props) {
  return (
    <section id={id} className="scroll-mt-20 py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">{subtitle}</p>
          )}
        </motion.div>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
