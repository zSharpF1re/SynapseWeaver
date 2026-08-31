import { createHash } from "node:crypto";
import { embedTexts } from "@/lib/ai/gemini";
import { nodeEmbedText } from "@/lib/ai/embeddings";
import { getExpandCache, setExpandCache } from "@/lib/ai/expand-cache";
import { generateRelatedNodes } from "@/lib/ai/generate-related";
import { loadImmediateNeighbors } from "@/lib/ai/neighbors";
import { prisma } from "@/lib/db/prisma";
import {
  listNodesMissingEmbeddings,
  listStoredVectors,
  setNodeEmbeddings,
} from "@/lib/db/vectors";
import { fuzzyMatchTitle } from "@/lib/dedup/fuzzy";
import {
  actionFromSimilarity,
  nearestNeighbor,
} from "@/lib/dedup/semantic";
import type { ExpandProposal, ExpandResponse } from "@/types/graph";

export class ExpandNodeNotFoundError extends Error {
  constructor() {
    super("Node not found");
    this.name = "ExpandNodeNotFoundError";
  }
}

export class ExpandContentError extends Error {
  constructor(message = "contentId does not belong to this node") {
    super(message);
    this.name = "ExpandContentError";
  }
}

export class ExpandStaleError extends Error {
  constructor() {
    super("Node content changed. Expand again.");
    this.name = "ExpandStaleError";
  }
}

type NodeWithContents = {
  id: string;
  graphId: string;
  title: string;
  summary: string | null;
  contents: Array<{
    id: string;
    type: string;
    text: string | null;
    fileUrl: string | null;
  }>;
};

export function hashExpandContext(node: NodeWithContents): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        title: node.title,
        summary: node.summary,
        contents: node.contents.map((content) => ({
          id: content.id,
          type: content.type,
          text: content.text,
          fileUrl: content.fileUrl,
        })),
      }),
    )
    .digest("hex");
}

export async function loadNodeForExpand(nodeId: string) {
  return prisma.node.findUnique({
    where: { id: nodeId },
    select: {
      id: true,
      graphId: true,
      title: true,
      summary: true,
      contents: {
        orderBy: { createdAt: "asc" as const },
        select: {
          id: true,
          nodeId: true,
          type: true,
          text: true,
          fileUrl: true,
          createdAt: true,
        },
      },
    },
  });
}

export function assertContentBelongsToNode(
  node: NodeWithContents,
  contentId: string | null | undefined,
) {
  if (!contentId) return;
  if (!node.contents.some((content) => content.id === contentId)) {
    throw new ExpandContentError();
  }
}

export async function runExpand(
  nodeId: string,
  contentId?: string | null,
): Promise<ExpandResponse> {
  const node = await loadNodeForExpand(nodeId);
  if (!node) throw new ExpandNodeNotFoundError();
  assertContentBelongsToNode(node, contentId);

  const contentHash = hashExpandContext(node);
  const cached = getExpandCache(nodeId, contentHash);
  if (cached) {
    return { proposals: cached, contentHash, cached: true };
  }

  const neighborTitles = (await loadImmediateNeighbors(nodeId)).map(
    (neighbor) => neighbor.title,
  );
  const candidates = await generateRelatedNodes({
    title: node.title,
    summary: node.summary,
    contents: node.contents,
    neighborTitles,
  });

  const missing = await listNodesMissingEmbeddings(node.graphId);
  const embedInputs = [
    ...missing.map((item) => nodeEmbedText(item.title, item.summary)),
    ...candidates.map((item) => nodeEmbedText(item.title, item.summary)),
  ];
  const embeddings = await embedTexts(embedInputs);
  const missingEmbeddings = embeddings.slice(0, missing.length);
  const candidateEmbeddings = embeddings.slice(missing.length);

  if (missing.length > 0) {
    await setNodeEmbeddings(
      missing.map((item, index) => ({
        id: item.id,
        values: missingEmbeddings[index],
      })),
    );
  }

  const stored = await listStoredVectors(node.graphId);
  const otherNodes = await prisma.node.findMany({
    where: { id: { not: nodeId }, graphId: node.graphId },
    select: { id: true, title: true },
  });

  const proposals = candidates.map((candidate, index) =>
    classifyProposal(
      candidate,
      candidateEmbeddings[index],
      otherNodes,
      stored,
      nodeId,
    ),
  );

  setExpandCache(nodeId, contentHash, proposals);
  return { proposals, contentHash, cached: false };
}

function classifyProposal(
  candidate: { title: string; summary: string; relation: string },
  embedding: number[],
  otherNodes: Array<{ id: string; title: string }>,
  stored: Awaited<ReturnType<typeof listStoredVectors>>,
  sourceNodeId: string,
): ExpandProposal {
  const fuzzy = fuzzyMatchTitle(candidate.title, otherNodes);
  if (fuzzy) {
    return {
      ...candidate,
      action: "link",
      existingNodeId: fuzzy.id,
      similarity: fuzzy.score,
      matchTitle: fuzzy.title,
    };
  }

  const semantic = nearestNeighbor(
    embedding,
    stored,
    new Set([sourceNodeId]),
  );
  const action = actionFromSimilarity(semantic?.similarity);
  return {
    ...candidate,
    action,
    existingNodeId: action === "new" ? undefined : semantic?.id,
    similarity: semantic?.similarity,
    matchTitle: action === "new" ? undefined : semantic?.title,
  };
}
