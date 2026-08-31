import { prisma } from "@/lib/db/prisma";

export const MAX_NEIGHBORS = 15;

export type ImmediateNeighbor = {
  id: string;
  title: string;
  summary: string | null;
};

export async function loadImmediateNeighbors(
  nodeId: string,
): Promise<ImmediateNeighbor[]> {
  const edges = await prisma.edge.findMany({
    where: {
      OR: [{ sourceNodeId: nodeId }, { targetNodeId: nodeId }],
    },
    select: {
      source: { select: { id: true, title: true, summary: true } },
      target: { select: { id: true, title: true, summary: true } },
    },
  });

  const neighbors = new Map<string, ImmediateNeighbor>();
  for (const edge of edges) {
    if (edge.source.id !== nodeId) {
      neighbors.set(edge.source.id, {
        id: edge.source.id,
        title: edge.source.title,
        summary: edge.source.summary,
      });
    }
    if (edge.target.id !== nodeId) {
      neighbors.set(edge.target.id, {
        id: edge.target.id,
        title: edge.target.title,
        summary: edge.target.summary,
      });
    }
  }
  return [...neighbors.values()].slice(0, MAX_NEIGHBORS);
}
