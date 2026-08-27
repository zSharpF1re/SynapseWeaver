import { embedTexts } from "@/lib/ai/gemini";

export function nodeEmbedText(
  title: string,
  summary: string | null | undefined,
): string {
  const trimmedTitle = title.trim();
  const trimmedSummary = summary?.trim();
  return trimmedSummary ? `${trimmedTitle}. ${trimmedSummary}` : trimmedTitle;
}

export async function embedNodeTexts(
  nodes: Array<{ title: string; summary?: string | null }>,
): Promise<number[][]> {
  return embedTexts(nodes.map((node) => nodeEmbedText(node.title, node.summary)));
}
