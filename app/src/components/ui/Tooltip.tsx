import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open && content && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 w-max max-w-xs -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-left text-[11px] font-normal leading-snug text-slate-100 shadow-lg dark:bg-slate-700"
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
