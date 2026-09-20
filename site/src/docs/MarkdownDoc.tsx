import { lazy, Suspense, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { Link } from "react-router-dom";
import { CodeBlock } from "../components/CodeBlock";
import { rewriteDocHref } from "./links";

const Mermaid = lazy(() => import("./Mermaid"));

function MarkdownLink({ href, children }: { href?: string; children?: ReactNode }) {
  const rewritten = rewriteDocHref(href ?? "");
  const className = "text-accent-700 underline decoration-accent-700/30 hover:decoration-accent-700 dark:text-accent-300 dark:decoration-accent-300/30";
  if (rewritten.kind === "route") {
    const [path, hash] = rewritten.value.split("#");
    return (
      <Link className={className} to={{ pathname: path, hash: hash ? `#${hash}` : undefined }}>
        {children}
      </Link>
    );
  }
  if (rewritten.kind === "hash") {
    return (
      <a className={className} href={rewritten.value}>
        {children}
      </a>
    );
  }
  return (
    <a className={className} href={rewritten.value} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function MarkdownCode({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const text = String(children ?? "").replace(/\n$/, "");
  const lang = /language-(\w+)/.exec(className ?? "")?.[1];
  if (lang === "mermaid") {
    return (
      <Suspense fallback={<CodeBlock code={text} />}>
        <Mermaid chart={text} />
      </Suspense>
    );
  }
  if (lang) return <CodeBlock code={text} />;
  return (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-slate-800 dark:bg-brand-900 dark:text-slate-200">
      {children}
    </code>
  );
}

export function MarkdownDoc({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug]}
      components={{
        a: MarkdownLink,
        code: MarkdownCode,
        pre: ({ children }) => <div className="my-4">{children}</div>,
        h1: ({ children, id }) => (
          <h1 id={id} className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {children}
          </h1>
        ),
        h2: ({ children, id }) => (
          <h2 id={id} className="mt-10 scroll-mt-20 break-words text-xl font-bold text-slate-900 dark:text-slate-100">
            {children}
          </h2>
        ),
        h3: ({ children, id }) => (
          <h3 id={id} className="mt-6 scroll-mt-20 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mt-4 break-words text-slate-700 dark:text-slate-300">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-slate-700 dark:text-slate-300">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="mt-4 border-l-4 border-amber-400 bg-amber-50 px-4 py-2 text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-200">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-brand-900 dark:text-slate-400">
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="border-b border-slate-200 px-3 py-2 font-semibold dark:border-slate-700">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border-b border-slate-100 px-3 py-2 text-slate-700 dark:border-slate-800 dark:text-slate-300">
            {children}
          </td>
        ),
        hr: () => <hr className="my-8 border-slate-200 dark:border-slate-700" />,
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
