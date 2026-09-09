import { cosineSimilarity, type StoredNodeVector } from "@/lib/db/vectors";

export const LINK_THRESHOLD = 0.92;
export const ASK_THRESHOLD = 0.75;
export const PLACE_THRESHOLD = 0.6;

export type SemanticMatch = {
  id: string;
  title: string;
  similarity: number;
};

export type DedupAction = "new" | "link" | "ask";

export function nearestNeighbor(
  values: number[],
  stored: StoredNodeVector[],
  excludeIds: Set<string>,
): SemanticMatch | null {
  let best: SemanticMatch | null = null;
  for (const node of stored) {
    if (excludeIds.has(node.id)) continue;
    const similarity = cosineSimilarity(values, node.values);
    if (!best || similarity > best.similarity) {
      best = { id: node.id, title: node.title, similarity };
    }
  }
  return best;
}

export function actionFromSimilarity(similarity: number | undefined): DedupAction {
  if (similarity == null) return "new";
  if (similarity > LINK_THRESHOLD) return "link";
  if (similarity >= ASK_THRESHOLD) return "ask";
  return "new";
}
