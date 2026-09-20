import { useEffect, useId, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { CodeBlock } from "../components/CodeBlock";

/**
 * Client-only mermaid renderer. Failures fall back to the fenced source
 * rather than an empty box. Re-runs when the theme changes.
 */
export function Mermaid({ chart }: { chart: string }) {
  const { theme } = useTheme();
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setSvg(null);

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === "dark" ? "dark" : "default",
          securityLevel: "strict",
        });
        const id = `pharmaops-mmd-${reactId}`;
        const { svg: rendered } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, theme, reactId]);

  if (failed) return <CodeBlock code={chart} />;
  if (!svg) {
    return (
      <div className="my-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-brand-900/40 dark:text-slate-400">
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      className="my-4 overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-brand-800"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default Mermaid;
