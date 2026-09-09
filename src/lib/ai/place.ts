import { embedTexts } from "@/lib/ai/gemini";
import { nodeEmbedText } from "@/lib/ai/embeddings";
import { prisma } from "@/lib/db/prisma";
import {
  listNodesMissingEmbeddings,
  listStoredVectors,
  setNodeEmbeddings,
} from "@/lib/db/vectors";
import { fuzzyMatchTitle } from "@/lib/dedup/fuzzy";
import { nearestNeighbor, PLACE_THRESHOLD } from "@/lib/dedup/semantic";
import type { NodePlacement } from "@/types/graph";

export async function placeNewNode(node: {
  id: string;
  graphId: string;
  title: string;
  summary: string | null;
}): Promise<NodePlacement> {
  try {
    return await runPlace(node);
  } catch (error) {
    console.error("placeNewNode", error);
    return { status: "skipped" };
  }
}

async function runPlace(node: {
  id: string;
  graphId: string;
  title: string;
  summary: string | null;
}): Promise<NodePlacement> {
  const otherNodes = await prisma.node.findMany({
    where: { id: { not: node.id }, graphId: node.graphId },
    select: { id: true, title: true },
  });

  const fuzzy = fuzzyMatchTitle(node.title, otherNodes);
  let linked: NodePlacement | null = null;
  if (fuzzy) {
    const edge = await createPlacementEdge(fuzzy.id, node.id, fuzzy.score);
    linked = {
      status: "linked",
      neighborId: fuzzy.id,
      neighborTitle: fuzzy.title,
      similarity: fuzzy.score,
      edgeId: edge.id,
    };
  }

  try {
    const missing = await listNodesMissingEmbeddings(node.graphId);
    if (missing.length > 0) {
      const embeddings = await embedTexts(
        missing.map((item) => nodeEmbedText(item.title, item.summary)),
      );
      await setNodeEmbeddings(
        missing.map((item, index) => ({
          id: item.id,
          values: embeddings[index],
        })),
      );
    }
  } catch (error) {
    console.error("placeNewNode embed", error);
    return linked ?? { status: "skipped" };
  }

  if (linked) return linked;

  const stored = await listStoredVectors(node.graphId);
  const self = stored.find((item) => item.id === node.id);
  if (!self) {
    return { status: "skipped" };
  }

  const semantic = nearestNeighbor(self.values, stored, new Set([node.id]));
  if (semantic && semantic.similarity >= PLACE_THRESHOLD) {
    const edge = await createPlacementEdge(
      semantic.id,
      node.id,
      semantic.similarity,
    );
    return {
      status: "linked",
      neighborId: semantic.id,
      neighborTitle: semantic.title,
      similarity: semantic.similarity,
      edgeId: edge.id,
    };
  }

  return { status: "orphan" };
}

async function createPlacementEdge(
  sourceNodeId: string,
  targetNodeId: string,
  weight: number,
) {
  const existing = await prisma.edge.findFirst({
    where: { sourceNodeId, targetNodeId },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.edge.create({
    data: {
      sourceNodeId,
      targetNodeId,
      weight,
      generatedFromContentId: null,
    },
    select: { id: true },
  });
}
