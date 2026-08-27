import { GeminiOutputError } from "@/lib/ai/errors";
import { generateJson } from "@/lib/ai/gemini";
import {
  RELATED_NODES_SYSTEM_PROMPT,
  buildRelatedNodesUserPrompt,
  type ExpandPromptContext,
} from "@/lib/ai/prompts";
import {
  geminiRelatedOutputSchema,
  relatedNodeJsonSchema,
  type GeminiRelatedNode,
} from "@/lib/validation/ai-proposals";

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max).trim();
}

export async function generateRelatedNodes(
  context: ExpandPromptContext,
): Promise<GeminiRelatedNode[]> {
  const raw = await generateJson({
    system: RELATED_NODES_SYSTEM_PROMPT,
    user: buildRelatedNodesUserPrompt(context),
    responseJsonSchema: relatedNodeJsonSchema as Record<string, unknown>,
  });

  const sanitized = sanitizeRawOutput(raw);
  const parsed = geminiRelatedOutputSchema.safeParse(sanitized);
  if (!parsed.success) {
    throw new GeminiOutputError();
  }
  return parsed.data.nodes;
}

function sanitizeRawOutput(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || !("nodes" in raw)) {
    return raw;
  }
  const nodes = (raw as { nodes: unknown }).nodes;
  if (!Array.isArray(nodes)) return raw;

  return {
    nodes: nodes.slice(0, 5).map((item) => {
      if (typeof item !== "object" || item === null) return item;
      const node = item as Record<string, unknown>;
      return {
        title: typeof node.title === "string" ? clip(node.title, 80) : node.title,
        summary:
          typeof node.summary === "string" ? clip(node.summary, 200) : node.summary,
        relation:
          typeof node.relation === "string" ? clip(node.relation, 40) : node.relation,
      };
    }),
  };
}
