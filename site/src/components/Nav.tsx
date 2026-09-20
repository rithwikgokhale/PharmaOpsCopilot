import { AnimatePresence, motion } from "framer-motion";
import { Activity, ExternalLink, Moon, Sun } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";

const LINKS = [
  { hash: "#engineering", label: "Engineering" },
  { hash: "#problem", label: "Problem" },
  { hash: "#value", label: "Value" },
  { hash: "#gallery", label: "Gallery" },
  { hash: "#how-it-works", label: "How it works" },
  { hash: "#agent", label: "Agent" },
  { hash: "#evals", label: "Evals" },
  { hash: "#tech", label: "Stack" },
  { hash: "#cdf", label: "CDF / MCP" },
  { hash: "#field-notes", label: "Field notes" },
  { hash: "#setup", label: "Setup" },
];

const GITHUB_URL = "https://github.com/rithwikgokhale/PharmaOpsCopilot";

export function Nav() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-700/60 dark:bg-brand-900/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white dark:bg-accent-700">
            <Activity size={18} />
          </span>
          <span className="font-semibold">PharmaOps Copilot</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex md:flex-wrap" aria-label="Site">
          <NavLink
            to="/docs"
            className={({ isActive }) =>
              `rounded-md px-2 py-1 text-xs font-semibold ${
                isActive
                  ? "bg-slate-100 text-brand-700 dark:bg-brand-800 dark:text-accent-300"
                  : "text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-accent-300"
              }`
            }
          >
            Docs
          </NavLink>
          {LINKS.map((l) => (
            <Link
              key={l.hash}
              to={{ pathname: "/", hash: l.hash }}
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-accent-300"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <NavLink
            to="/docs"
            className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 md:hidden dark:text-slate-300"
          >
            Docs
          </NavLink>
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
