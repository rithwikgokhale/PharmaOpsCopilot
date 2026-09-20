import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ARTICLE_DOCS, getDoc } from "../docs/manifest";
import { MarkdownDoc } from "../docs/MarkdownDoc";
import { extractHeadings } from "../docs/slug";

const GITHUB_EDIT = "https://github.com/rithwikgokhale/PharmaOpsCopilot/edit/main/docs/engineering/";

export function DocPage() {
  const { slug = "" } = useParams();
  const location = useLocation();
  const doc = getDoc(slug);
  const [navOpen, setNavOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("");

  const headings = useMemo(() => (doc ? extractHeadings(doc.markdown) : []), [doc]);
  const articleIndex = ARTICLE_DOCS.findIndex((d) => d.slug === slug);
  const prev = articleIndex > 0 ? ARTICLE_DOCS[articleIndex - 1] : undefined;
  const next =
    articleIndex >= 0 && articleIndex < ARTICLE_DOCS.length - 1
      ? ARTICLE_DOCS[articleIndex + 1]
      : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
    setNavOpen(false);
  }, [slug]);

  useEffect(() => {
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
    }
  }, [location.hash, slug]);

  useEffect(() => {
    if (!headings.length) return;
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 0.25, 1] }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [slug, headings]);

  if (!doc || doc.isIndex) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Document not found</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">That page is not in the engineering set.</p>
        <Link to="/docs" className="mt-4 inline-block text-accent-700 underline dark:text-accent-300">
          Back to docs index
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,72ch)_14rem] lg:justify-center lg:gap-8">
        <aside className="mb-6 lg:mb-0">
          <button
            type="button"
            className="mb-3 text-sm font-medium text-accent-700 lg:hidden dark:text-accent-300"
            onClick={() => setNavOpen((v) => !v)}
          >
            {navOpen ? "Hide docs" : "All docs"}
          </button>
          <nav
            aria-label="Engineering docs"
            className={`${navOpen ? "block" : "hidden"} lg:sticky lg:top-24 lg:block`}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Engineering
            </p>
            <ul className="space-y-1 text-sm">
              <li>
                <Link to="/docs" className="text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-accent-300">
                  Index
                </Link>
              </li>
              {ARTICLE_DOCS.map((d) => (
                <li key={d.slug}>
                  <Link
                    to={`/docs/${d.slug}`}
                    className={
                      d.slug === slug
                        ? "font-medium text-brand-700 dark:text-accent-300"
                        : "text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-accent-300"
                    }
                  >
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0">
          <MarkdownDoc markdown={doc.markdown} />
          <nav className="mt-12 flex flex-wrap justify-between gap-4 border-t border-slate-200 pt-6 text-sm dark:border-slate-700">
            {prev ? (
              <Link to={`/docs/${prev.slug}`} className="text-accent-700 dark:text-accent-300">
                ← {prev.title}
              </Link>
            ) : (
              <Link to="/docs" className="text-accent-700 dark:text-accent-300">
                ← Docs index
              </Link>
            )}
            {next ? (
              <Link to={`/docs/${next.slug}`} className="ml-auto text-accent-700 dark:text-accent-300">
                {next.title} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            <a
              href={`${GITHUB_EDIT}${doc.filename}`}
              target="_blank"
              rel="noreferrer"
              className="text-accent-700 underline dark:text-accent-300"
            >
              Edit this page on GitHub
            </a>
          </p>
        </article>

        <aside className="hidden xl:block">
          <nav aria-label="On this page" className="sticky top-24 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              On this page
            </p>
            <ul className="space-y-1">
              {headings.map((h) => (
                <li key={h.id} className={h.depth === 3 ? "pl-3" : ""}>
                  <a
                    href={`#${h.id}`}
                    className={
                      activeId === h.id
                        ? "font-medium text-brand-700 dark:text-accent-300"
                        : "text-slate-600 hover:text-brand-700 dark:text-slate-400 dark:hover:text-accent-300"
                    }
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  );
}
