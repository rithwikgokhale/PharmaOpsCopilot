import { AnimatePresence, motion } from "framer-motion";
import { Activity, ExternalLink, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
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

const hashLinkClass =
  "whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-accent-300";

const mobileLinkClass =
  "rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-brand-800";

function docsLinkClass(isActive: boolean) {
  return `whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${
    isActive
      ? "bg-slate-100 text-brand-700 dark:bg-brand-800 dark:text-accent-300"
      : "text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-accent-300"
  }`;
}

export function Nav() {
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-700/60 dark:bg-brand-900/90">
      <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-slate-900 dark:text-slate-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white dark:bg-accent-700">
            <Activity size={18} />
          </span>
          <span className="font-semibold">PharmaOps Copilot</span>
        </Link>

        <nav
          className="hidden min-w-0 flex-1 items-center justify-end gap-0.5 overflow-x-auto 2xl:flex"
          aria-label="Site"
        >
          <NavLink to="/docs" className={({ isActive }) => docsLinkClass(isActive)}>
            Docs
          </NavLink>
          {LINKS.map((l) => (
            <Link key={l.hash} to={{ pathname: "/", hash: l.hash }} className={hashLinkClass}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 2xl:ml-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 2xl:hidden dark:border-slate-600 dark:bg-brand-800 dark:text-slate-300"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
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

      {open && (
        <nav
          className="border-t border-slate-200 bg-white/95 2xl:hidden dark:border-slate-700 dark:bg-brand-900/95"
          aria-label="Site"
        >
          <div className="mx-auto flex max-w-[90rem] flex-col gap-0.5 px-4 py-3">
            <NavLink
              to="/docs"
              className={({ isActive }) =>
                `${mobileLinkClass} ${isActive ? "bg-slate-100 font-semibold dark:bg-brand-800" : ""}`
              }
            >
              Docs
            </NavLink>
            {LINKS.map((l) => (
              <Link key={l.hash} to={{ pathname: "/", hash: l.hash }} className={mobileLinkClass}>
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
