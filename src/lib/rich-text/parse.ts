import { z } from "zod";
import { isBlockedHref } from "./links";
import { hasImage, toPlainText } from "./plain";
import type { TipTapDoc, TipTapMark, TipTapNode } from "./types";

export const MAX_DOC_CHARS = 200_000;
const MAX_DEPTH = 40;

const ALLOWED_TYPES = new Set([
  "doc",
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "image",
  "text",
  "hardBreak",
]);

const markSchema: z.ZodType<TipTapMark> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }),
  z.object({ type: z.literal("italic") }),
  z.object({ type: z.literal("code") }),
  z.object({
    type: z.literal("link"),
    attrs: z.object({
      href: z.string().min(1),
      target: z.string().optional().nullable(),
      rel: z.string().optional().nullable(),
      class: z.string().optional().nullable(),
      title: z.string().optional().nullable(),
    }),
  }),
]);

const nodeSchema: z.ZodType<TipTapNode> = z.lazy(() =>
  z.object({
    type: z.string().min(1),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(nodeSchema).optional(),
    text: z.string().optional(),
    marks: z.array(markSchema).optional(),
  }),
);

export type ParseDocResult =
  | { ok: true; doc: TipTapDoc }
  | { ok: false; error: string };

export function parseDoc(input: unknown): TipTapDoc | null {
  const result = parseDocResult(input);
  return result.ok ? result.doc : null;
}

export function coerceDoc(input: string | null | undefined): TipTapDoc {
  if (!input) return EMPTY_DOC;
  return parseDoc(input) ?? docFromPlain(input);
}

export function parseDocResult(input: unknown): ParseDocResult {
  let value = input;
  if (typeof input === "string") {
    if (input.length > MAX_DOC_CHARS) {
      return { ok: false, error: "Document is too large" };
    }
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      return { ok: false, error: "Invalid document JSON" };
    }
  }

  const parsed = nodeSchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, error: "Invalid document" };
  }
  if (parsed.data.type !== "doc") {
    return { ok: false, error: "Document must be a doc node" };
  }

  const structureError = validateStructure(parsed.data, 0);
  if (structureError) {
    return { ok: false, error: structureError };
  }

  return { ok: true, doc: parsed.data as TipTapDoc };
}

export function isEmptyDoc(doc: TipTapNode): boolean {
  return !toPlainText(doc) && !hasImage(doc);
}

export function stringifyDoc(doc: TipTapDoc): string {
  return JSON.stringify(doc);
}

export const EMPTY_DOC: TipTapDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function docFromPlain(
  text: string,
  links?: Array<{ href: string; label: string }>,
): TipTapDoc {
  const content: TipTapNode[] = [];
  const trimmed = text.trim();
  if (trimmed) {
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: trimmed }],
    });
  }
  for (const link of links ?? []) {
    content.push({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: link.label,
          marks: [{ type: "link", attrs: { href: link.href } }],
        },
      ],
    });
  }
  if (content.length === 0) return EMPTY_DOC;
  return { type: "doc", content };
}

function validateStructure(node: TipTapNode, depth: number): string | null {
  if (depth > MAX_DEPTH) return "Document is too nested";
  if (!ALLOWED_TYPES.has(node.type)) {
    return `Unsupported node type: ${node.type}`;
  }

  if (node.type === "text") {
    if (typeof node.text !== "string") return "Text node is missing text";
    for (const mark of node.marks ?? []) {
      if (mark.type === "link" && isBlockedHref(mark.attrs.href)) {
        return "Link href is not allowed";
      }
    }
  }

  if (node.type === "heading") {
    const level = node.attrs?.level;
    if (level !== 2 && level !== 3) {
      return "Heading level must be 2 or 3";
    }
  }

  if (node.type === "image") {
    const src = node.attrs?.src;
    if (typeof src !== "string" || !src.trim()) {
      return "Image is missing src";
    }
    if (isBlockedHref(src)) {
      return "Image src is not allowed";
    }
  }

  for (const child of node.content ?? []) {
    const error = validateStructure(child, depth + 1);
    if (error) return error;
  }
  return null;
}
