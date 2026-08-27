import { parseDoc } from "./parse";
import { toPlainText } from "./plain";

export function contentPlainText(text: string | null | undefined): string {
  if (!text) return "";
  const doc = parseDoc(text);
  return doc ? toPlainText(doc) : text;
}
