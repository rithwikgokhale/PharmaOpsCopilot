const GITHUB_URL = "https://github.com/rithwikgokhale/PharmaOpsCopilot";
const PAGES_URL = "https://rithwikgokhale.github.io/PharmaOpsCopilot/";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white/60 py-10 dark:border-slate-700 dark:bg-brand-900/60">
      <div className="mx-auto max-w-5xl px-4 text-center text-sm text-slate-600 dark:text-slate-400">
        <p className="font-medium text-amber-800 dark:text-amber-300">
          Synthetic data only — not a validated GxP application. Human review required for QA/release
          decisions.
        </p>
        <p className="mt-4">
          <a href={GITHUB_URL} className="text-accent-700 underline dark:text-accent-300">
            GitHub repository
          </a>
          {" · "}
          <a href={PAGES_URL} className="text-accent-700 underline dark:text-accent-300">
            Project docs (this site)
          </a>
          {" · "}
          MIT License © 2026 Rithwik Gokhale
        </p>
      </div>
    </footer>
  );
}
