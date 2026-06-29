import { AnimatePresence, motion } from "framer-motion";
import { Activity, ExternalLink, Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

const LINKS = [
  { href: "#problem", label: "Problem" },
  { href: "#gallery", label: "Gallery" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#agent", label: "Agent" },
  { href: "#evals", label: "Evals" },
  { href: "#tech", label: "Stack" },
  { href: "#cdf", label: "CDF-ready" },
  { href: "#setup", label: "Setup" },
];

const GITHUB_URL = "https://github.com/rithwikgokhale/PharmaOpsCopilot";

export function Nav() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-700/60 dark:bg-brand-900/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <a href="#" className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white dark:bg-accent-700">
            <Activity size={18} />
          </span>
          <span className="font-semibold">PharmaOps Copilot</span>
        </a>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Page sections">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-accent-300"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-brand-800 dark:text-slate-300"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </motion.span>
            </AnimatePresence>
          </button>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-accent-700"
          >
            <ExternalLink size={16} />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
