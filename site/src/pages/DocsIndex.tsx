import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ARTICLE_DOCS, INDEX_DOC } from "../docs/manifest";
import { MarkdownDoc } from "../docs/MarkdownDoc";
import { Card } from "../components/Card";

export function DocsIndex() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.hash]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <aside className="mb-6 lg:mb-0">
          <button
            type="button"
            className="mb-3 text-sm font-medium text-accent-700 lg:hidden dark:text-accent-300"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide docs" : "All docs"}
          </button>
          <nav
            aria-label="Engineering docs"
            className={`${open ? "block" : "hidden"} lg:sticky lg:top-20 lg:block`}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Engineering
            </p>
            <ul className="space-y-1 text-sm">
              <li>
                <Link to="/docs" className="font-medium text-brand-700 dark:text-accent-300">
                  Index
                </Link>
              </li>
              {ARTICLE_DOCS.map((d) => (
                <li key={d.slug}>
                  <Link
                    to={`/docs/${d.slug}`}
                    className="block break-words text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-accent-300"
                  >
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="min-w-0">
          <article className="max-w-[72ch]">
            {INDEX_DOC && <MarkdownDoc markdown={INDEX_DOC.markdown} />}
          </article>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {ARTICLE_DOCS.map((d) => (
              <Card key={d.slug}>
                <Link to={`/docs/${d.slug}`} className="block">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">{d.title}</h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{d.summary}</p>
                  <span className="mt-3 inline-block text-sm font-medium text-accent-700 dark:text-accent-300">
                    Read →
                  </span>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
