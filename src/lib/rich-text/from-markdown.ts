import { lexer, type Token, type Tokens } from "marked";
import { isBlockedHref } from "./links";
import { isEmptyDoc, parseDocResult } from "./parse";
import type { TipTapDoc, TipTapMark, TipTapNode } from "./types";

const MAX_MARKDOWN_CHARS = 50_000;

export function docFromMarkdown(markdown: string): TipTapDoc | null {
  const source = markdown.trim();
  if (!source || source.length > MAX_MARKDOWN_CHARS) return null;

  const content = blocksToNodes(lexer(source));
  if (content.length === 0) return null;

  const parsed = parseDocResult({ type: "doc", content });
  if (!parsed.ok || isEmptyDoc(parsed.doc)) return null;
  return parsed.doc;
}

function blocksToNodes(tokens: Token[]): TipTapNode[] {
  const nodes: TipTapNode[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const heading = token as Tokens.Heading;
        nodes.push({
          type: "heading",
          attrs: { level: heading.depth <= 2 ? 2 : 3 },
          content: inlineToNodes(heading.tokens),
        });
        break;
      }
      case "paragraph": {
        const paragraph = token as Tokens.Paragraph;
        nodes.push({
          type: "paragraph",
          content: inlineToNodes(paragraph.tokens),
        });
        break;
      }
      case "code": {
        const code = token as Tokens.Code;
        const content: TipTapNode[] = code.text
          ? [{ type: "text", text: code.text }]
          : [];
        nodes.push({
          type: "codeBlock",
          ...(code.lang ? { attrs: { language: code.lang } } : {}),
          content,
        });
        break;
      }
      case "blockquote": {
        const quote = token as Tokens.Blockquote;
        const inner = blocksToNodes(quote.tokens);
        nodes.push({
          type: "blockquote",
          content: inner.length > 0 ? inner : [{ type: "paragraph" }],
        });
        break;
      }
      case "list": {
        const list = token as Tokens.List;
        const items = list.items.map(listItemToNode);
        if (items.length === 0) break;
        nodes.push({
          type: list.ordered ? "orderedList" : "bulletList",
          content: items,
        });
        break;
      }
      case "text": {
        const text = token as Tokens.Text;
        const content = text.tokens
          ? inlineToNodes(text.tokens)
          : text.text
            ? [textNode(text.text, [])]
            : [];
        if (content.length > 0) {
          nodes.push({ type: "paragraph", content });
        }
        break;
      }
      default:
        break;
    }
  }
  return nodes;
}

function listItemToNode(item: Tokens.ListItem): TipTapNode {
  const content: TipTapNode[] = [];
  const inlineBuffer: Token[] = [];

  function flushInline() {
    if (inlineBuffer.length === 0) return;
    const inline = inlineToNodes(inlineBuffer);
    content.push({
      type: "paragraph",
      content: inline.length > 0 ? inline : undefined,
    });
    inlineBuffer.length = 0;
  }

  for (const token of item.tokens) {
    if (
      token.type === "list" ||
      token.type === "blockquote" ||
      token.type === "code" ||
      token.type === "heading"
    ) {
      flushInline();
      content.push(...blocksToNodes([token]));
    } else if (token.type === "paragraph") {
      flushInline();
      content.push({
        type: "paragraph",
        content: inlineToNodes((token as Tokens.Paragraph).tokens),
      });
    } else if (token.type === "space") {
      continue;
    } else {
      inlineBuffer.push(token);
    }
  }
  flushInline();

  if (content.length === 0) {
    const fallback = item.text.trim()
      ? [{ type: "text" as const, text: item.text.trim() }]
      : undefined;
    content.push({ type: "paragraph", content: fallback });
  }

  return { type: "listItem", content };
}

function inlineToNodes(
  tokens: Token[] | undefined,
  marks: TipTapMark[] = [],
): TipTapNode[] {
  if (!tokens || tokens.length === 0) return [];
  const nodes: TipTapNode[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "text": {
        const text = token as Tokens.Text;
        if (text.tokens?.length) {
          nodes.push(...inlineToNodes(text.tokens, marks));
        } else if (text.text) {
          nodes.push(textNode(text.text, marks));
        }
        break;
      }
      case "strong":
        nodes.push(
          ...inlineToNodes((token as Tokens.Strong).tokens, [
            ...marks,
            { type: "bold" },
          ]),
        );
        break;
      case "em":
        nodes.push(
          ...inlineToNodes((token as Tokens.Em).tokens, [
            ...marks,
            { type: "italic" },
          ]),
        );
        break;
      case "codespan":
        nodes.push(
          textNode((token as Tokens.Codespan).text, [
            ...marks,
            { type: "code" },
          ]),
        );
        break;
      case "link": {
        const link = token as Tokens.Link;
        if (!link.href || isBlockedHref(link.href)) {
          nodes.push(...inlineToNodes(link.tokens, marks));
        } else {
          nodes.push(
            ...inlineToNodes(link.tokens, [
              ...marks,
              {
                type: "link",
                attrs: {
                  href: link.href,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  ...(link.title ? { title: link.title } : {}),
                },
              },
            ]),
          );
        }
        break;
      }
      case "br":
        nodes.push({ type: "hardBreak" });
        break;
      case "escape":
        nodes.push(textNode((token as Tokens.Escape).text, marks));
        break;
      case "del":
        nodes.push(...inlineToNodes((token as Tokens.Del).tokens, marks));
        break;
      case "image": {
        const image = token as Tokens.Image;
        if (image.text) nodes.push(textNode(image.text, marks));
        break;
      }
      default: {
        if ("tokens" in token && Array.isArray(token.tokens)) {
          nodes.push(...inlineToNodes(token.tokens, marks));
        } else if (
          "text" in token &&
          typeof token.text === "string" &&
          token.text
        ) {
          nodes.push(textNode(token.text, marks));
        }
        break;
      }
    }
  }

  return nodes;
}

function textNode(text: string, marks: TipTapMark[]): TipTapNode {
  if (!text) return { type: "text", text: "" };
  const node: TipTapNode = { type: "text", text };
  if (marks.length > 0) node.marks = marks;
  return node;
}
