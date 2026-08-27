import type { CollectedLink, TipTapMark, TipTapNode } from "./types";

export function isBlockedHref(href: string): boolean {
  const lower = href.trim().toLowerCase();
  return lower.startsWith("javascript:") || lower.startsWith("data:text/html");
}

export function collectLinks(doc: TipTapNode | null | undefined): CollectedLink[] {
  if (!doc) return [];

  const seen = new Set<string>();
  const links: CollectedLink[] = [];

  function walk(node: TipTapNode) {
    if (node.type === "text" && node.text && node.marks) {
      for (const mark of node.marks) {
        const href = linkHref(mark);
        if (!href || seen.has(href)) continue;
        seen.add(href);
        links.push({
          href,
          label: node.text.trim() || href,
        });
      }
    }
    for (const child of node.content ?? []) walk(child);
  }

  walk(doc);
  return links;
}

function linkHref(mark: TipTapMark): string | null {
  if (mark.type !== "link") return null;
  const href = mark.attrs.href?.trim();
  return href ? href : null;
}
