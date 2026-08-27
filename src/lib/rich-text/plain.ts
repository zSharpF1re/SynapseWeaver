import type { TipTapNode } from "./types";

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "listItem",
]);

export function toPlainText(node: TipTapNode | null | undefined): string {
  if (!node) return "";
  return walk(node).trim();
}

export function hasImage(node: TipTapNode): boolean {
  if (node.type === "image") return true;
  return (node.content ?? []).some(hasImage);
}

function walk(node: TipTapNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "image") return "";

  const inner = (node.content ?? []).map(walk);
  if (BLOCK_TYPES.has(node.type)) {
    return inner.join("");
  }
  return inner.filter(Boolean).join("\n");
}
