import { contentPlainText } from "@/lib/rich-text";

export const SPARSE_TEXT_MAX_CHARS = 280;

export function isSparseTextContents(
  contents: Array<{ type: string; text: string | null }>,
): boolean {
  const total = contents
    .filter((content) => content.type === "TEXT" || content.type === "AI_GENERATED")
    .reduce((sum, content) => sum + contentPlainText(content.text).length, 0);
  return total <= SPARSE_TEXT_MAX_CHARS;
}
