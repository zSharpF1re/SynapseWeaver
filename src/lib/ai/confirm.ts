import { embedNodeTexts } from "@/lib/ai/embeddings";
import {
  ExpandNodeNotFoundError,
  ExpandStaleError,
  assertContentBelongsToNode,
  hashExpandContext,
  loadNodeForExpand,
} from "@/lib/ai/expand";
import { prisma } from "@/lib/db/prisma";
import { setNodeEmbedding } from "@/lib/db/vectors";
import { fuzzyMatchTitle } from "@/lib/dedup/fuzzy";
import type { ConfirmAcceptedInput } from "@/lib/validation/ai-proposals";
import type { ConfirmResponse } from "@/types/graph";

const DEFAULT_WEIGHT = 1;

export class ExpandConfirmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpandConfirmError";
  }
}

export async function confirmExpand(
  nodeId: string,
  input: {
    contentId?: string | null;
    contentHash?: string;
    accepted: ConfirmAcceptedInput[];
  },
): Promise<ConfirmResponse> {
  const node = await loadNodeForExpand(nodeId);
  if (!node) throw new ExpandNodeNotFoundError();
  assertContentBelongsToNode(node, input.contentId);

  const contentHash = hashExpandContext(node);
  if (input.contentHash && input.contentHash !== contentHash) {
    throw new ExpandStaleError();
  }

  const otherNodes = await prisma.node.findMany({
    where: { id: { not: nodeId } },
    select: { id: true, title: true },
  });
  const knownIds = new Set(otherNodes.map((item) => item.id));

  for (const item of input.accepted) {
    if (item.action !== "link") continue;
    const targetId = item.existingNodeId;
    if (!targetId || targetId === nodeId || !knownIds.has(targetId)) {
      throw new ExpandConfirmError(
        "Link proposals need a valid existingNodeId",
      );
    }
  }

  const newItems = input.accepted.filter((item) => item.action === "new");
  const newEmbeddings =
    newItems.length > 0 ? await embedNodeTexts(newItems) : [];
  const embeddingByTitle = new Map(
    newItems.map((item, index) => [item.title, newEmbeddings[index]]),
  );

  const created: ConfirmResponse["created"] = [];
  const linked: ConfirmResponse["linked"] = [];

  await prisma.$transaction(async (tx) => {
    const known = [...otherNodes];

    for (const item of input.accepted) {
      if (item.action === "link") {
        const edge = await createEdgeIfMissing(
          tx,
          nodeId,
          item.existingNodeId as string,
          input.contentId,
        );
        if (edge) linked.push(edge);
        continue;
      }

      const match = fuzzyMatchTitle(item.title, known);
      if (match && match.score === 1) {
        const edge = await createEdgeIfMissing(
          tx,
          nodeId,
          match.id,
          input.contentId,
        );
        if (edge) linked.push(edge);
        continue;
      }

      const createdNode = await tx.node.create({
        data: {
          title: item.title,
          summary: item.summary?.trim() ? item.summary.trim() : null,
        },
        select: { id: true, title: true, summary: true },
      });

      const values = embeddingByTitle.get(item.title);
      if (values) {
        await setNodeEmbedding(tx, createdNode.id, values);
      }

      const edge = await createEdgeIfMissing(
        tx,
        nodeId,
        createdNode.id,
        input.contentId,
      );
      created.push(createdNode);
      if (edge) linked.push(edge);
      known.push({ id: createdNode.id, title: createdNode.title });
      knownIds.add(createdNode.id);
    }
  });

  return { created, linked };
}

async function createEdgeIfMissing(
  tx: Pick<typeof prisma, "edge">,
  sourceNodeId: string,
  targetNodeId: string,
  contentId: string | null | undefined,
) {
  const existing = await tx.edge.findFirst({
    where: { sourceNodeId, targetNodeId },
    select: { id: true, sourceNodeId: true, targetNodeId: true },
  });
  if (existing) return existing;

  return tx.edge.create({
    data: {
      sourceNodeId,
      targetNodeId,
      weight: DEFAULT_WEIGHT,
      generatedFromContentId: contentId ?? null,
    },
    select: { id: true, sourceNodeId: true, targetNodeId: true },
  });
}
