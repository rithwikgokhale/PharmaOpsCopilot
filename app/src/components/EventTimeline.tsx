import { motion } from "framer-motion";
import { MessageSquarePlus } from "lucide-react";
import type { ProcessEvent } from "../types/domain";
import { eventCategoryClass, formatTimeOnly } from "../utils/time";
import { useCopilotBus } from "../context/CopilotContext";
import { useToast } from "../context/ToastContext";
import { staggerContainer, fadeUpItem } from "../utils/motion";

interface Props {
  events: ProcessEvent[];
}

export function EventTimeline({ events }: Props) {
  const { ask } = useCopilotBus();
  const { notify } = useToast();

  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No events for selected filters.
      </p>
    );
  }

  const askAbout = (evt: ProcessEvent) => {
    ask(`What happened around "${evt.title}" at ${formatTimeOnly(evt.timestamp)} (${evt.id})?`);
    notify(`Asked copilot about ${evt.id}`, "info");
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Batch Timeline
      </h3>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="scroll-thin max-h-48 space-y-1.5 overflow-y-auto pr-1"
      >
        {events.map((evt) => (
          <motion.button
            key={evt.id}
            variants={fadeUpItem}
            type="button"
            onClick={() => askAbout(evt)}
            title="Ask copilot about this event"
            className="group flex w-full items-start gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left text-sm transition-all hover:border-accent-400 hover:shadow-card-hover dark:border-slate-700 dark:bg-brand-800 dark:hover:border-accent-500"
          >
            <span className="shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">
              {formatTimeOnly(evt.timestamp)}
            </span>
            <span
              className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${eventCategoryClass(evt.category)}`}
            >
              {evt.category.replace("_", " ")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-800 dark:text-slate-200">{evt.title}</p>
              {evt.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{evt.description}</p>
              )}
            </div>
            <MessageSquarePlus
              size={14}
              className="mt-0.5 shrink-0 text-accent-500 opacity-0 transition-opacity group-hover:opacity-100"
            />
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
