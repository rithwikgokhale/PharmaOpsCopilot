const GITHUB_BLOB = "https://github.com/rithwikgokhale/PharmaOpsCopilot/blob/main/";

export function rewriteDocHref(href: string): { kind: "route" | "hash" | "external"; value: string } {
  if (!href) return { kind: "hash", value: "#" };
  if (href.startsWith("#")) return { kind: "hash", value: href };
  if (/^https?:\/\//i.test(href)) return { kind: "external", value: href };

  const localMd = href.match(/^\.\/([^/#]+)\.md(#.*)?$/);
  if (localMd) {
    const slug = localMd[1];
    const hash = localMd[2] ?? "";
    if (slug === "README") return { kind: "route", value: `/docs${hash}` };
    return { kind: "route", value: `/docs/${slug}${hash}` };
  }

  if (href.startsWith("../../")) {
    const repoPath = href.replace(/^\.\.\/\.\.\//, "");
    return { kind: "external", value: `${GITHUB_BLOB}${repoPath}` };
  }

  return { kind: "external", value: href };
}
