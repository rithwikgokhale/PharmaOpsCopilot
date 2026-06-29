import { motion } from "framer-motion";
import { ClipboardList, FileText, Wrench } from "lucide-react";
import type { Document, OperatorNote, WorkOrder } from "../types/domain";
import { formatTimestamp } from "../utils/time";
import { staggerContainer, fadeUpItem } from "../utils/motion";

interface Props {
  workOrders: WorkOrder[];
  notes: OperatorNote[];
  documents: Document[];
}

const PRIORITY_STYLES: Record<string, string> = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-slate-500 dark:text-slate-400",
};

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {icon}
      {title}
    </h3>
  );
}

export function EvidencePanel({ workOrders, notes, documents }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <section>
        <SectionHeader icon={<Wrench size={13} />} title="Work Orders" />
        <motion.ul variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
          {workOrders.map((wo) => (
            <motion.li
              variants={fadeUpItem}
              key={wo.id}
              className="rounded-lg border border-slate-200 bg-white p-2 text-sm transition-shadow hover:shadow-card-hover dark:border-slate-700 dark:bg-brand-800"
            >
              <span className="font-mono text-xs text-accent-700 dark:text-accent-300">{wo.id}</span>
              <p className="font-medium text-slate-800 dark:text-slate-200">{wo.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {wo.status} · <span className={PRIORITY_STYLES[wo.priority]}>{wo.priority}</span>
              </p>
            </motion.li>
          ))}
        </motion.ul>
      </section>
      <section>
        <SectionHeader icon={<ClipboardList size={13} />} title="Operator Notes" />
        <motion.ul variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
          {notes.map((n) => (
            <motion.li
              variants={fadeUpItem}
              key={n.id}
              className="rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-brand-800"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatTimestamp(n.timestamp)} — {n.author}
              </p>
              <p className="mt-1 text-slate-700 dark:text-slate-300">{n.content}</p>
            </motion.li>
          ))}
        </motion.ul>
      </section>
      <section>
        <SectionHeader icon={<FileText size={13} />} title="Documents / SOPs" />
        <motion.ul variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
          {documents.map((d) => (
            <motion.li
              variants={fadeUpItem}
              key={d.id}
              className="rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-brand-800"
            >
              <p className="font-medium text-slate-800 dark:text-slate-200">{d.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {d.documentType} · {d.sections.length} sections
              </p>
            </motion.li>
          ))}
        </motion.ul>
      </section>
    </div>
  );
}
