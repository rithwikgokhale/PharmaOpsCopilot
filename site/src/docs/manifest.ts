import { slugify } from "./slug";

const rawModules = import.meta.glob("../../../docs/engineering/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export interface DocEntry {
  slug: string;
  filename: string;
  title: string;
  summary: string;
  markdown: string;
  isIndex: boolean;
}

function parseDoc(path: string, markdown: string): DocEntry {
  const filename = path.split("/").pop() ?? path;
  const slug = filename.replace(/\.md$/, "");
  const lines = markdown.split("\n");
  const titleLine = lines.find((l) => l.startsWith("# "));
  const title = titleLine ? titleLine.slice(2).trim() : slug;
  let summary = "";
  let pastTitle = false;
  for (const line of lines) {
    if (!pastTitle) {
      if (line.startsWith("# ")) pastTitle = true;
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#") || trimmed.startsWith("```") || trimmed.startsWith("|")) break;
    summary = trimmed
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1");
    break;
  }
  return {
    slug,
    filename,
    title,
    summary,
    markdown,
    isIndex: slug === "README",
  };
}

const parsed = Object.entries(rawModules).map(([path, markdown]) => parseDoc(path, markdown));

parsed.sort((a, b) => {
  if (a.isIndex) return -1;
  if (b.isIndex) return 1;
  return a.filename.localeCompare(b.filename);
});

export const ALL_DOCS: DocEntry[] = parsed;
export const INDEX_DOC = ALL_DOCS.find((d) => d.isIndex);
export const ARTICLE_DOCS = ALL_DOCS.filter((d) => !d.isIndex);

export function getDoc(slug: string): DocEntry | undefined {
  return ALL_DOCS.find((d) => d.slug === slug);
}

export { slugify };
