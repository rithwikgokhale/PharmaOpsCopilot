/** github-slugger-compatible heading ids (rehype-slug). */
export function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

export function extractHeadings(markdown: string): { depth: 2 | 3; text: string; id: string }[] {
  const headings: { depth: 2 | 3; text: string; id: string }[] = [];
  for (const line of markdown.split("\n")) {
    const m = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!m) continue;
    const depth = m[1].length as 2 | 3;
    const text = m[2].trim();
    headings.push({ depth, text, id: slugify(text) });
  }
  return headings;
}
