import { GeminiOutputError } from "@/lib/ai/errors";
import { loadNodeForExpand } from "@/lib/ai/expand";
import { generateMarkdown } from "@/lib/ai/gemini";
import { loadImmediateNeighbors } from "@/lib/ai/neighbors";
import {
  EXPLAIN_SYSTEM_PROMPT,
  buildExplainUserPrompt,
} from "@/lib/ai/prompts";
import { isSparseTextContents } from "@/lib/ai/sparse";
import { docFromMarkdown, stringifyDoc } from "@/lib/rich-text";
import type { ExplainResponse } from "@/types/graph";

export class ExplainNodeNotFoundError extends Error {
  constructor() {
    super("Node not found");
    this.name = "ExplainNodeNotFoundError";
  }
}

export class ExplainNotSparseError extends Error {
  constructor() {
    super("This node already has enough text. Write with AI is for empty or short notes.");
    this.name = "ExplainNotSparseError";
  }
}

export async function runExplain(nodeId: string): Promise<ExplainResponse> {
  const node = await loadNodeForExpand(nodeId);
  if (!node) throw new ExplainNodeNotFoundError();
  if (!isSparseTextContents(node.contents)) {
    throw new ExplainNotSparseError();
  }

  const neighbors = await loadImmediateNeighbors(nodeId);
  const markdown = await generateMarkdown({
    system: EXPLAIN_SYSTEM_PROMPT,
    user: buildExplainUserPrompt({
      title: node.title,
      summary: node.summary,
      contents: node.contents,
      neighbors,
    }),
  });

  const doc = docFromMarkdown(markdown);
  if (!doc) throw new GeminiOutputError();
  return { text: stringifyDoc(doc) };
}
