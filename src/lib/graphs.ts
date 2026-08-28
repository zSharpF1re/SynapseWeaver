import { prisma } from "@/lib/db/prisma";
import type { GraphEdge, GraphMeta, GraphNode, GraphPayload } from "@/types/graph";

export function serializeGraph(graph: {
  id: string;
  name: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): GraphMeta {
  return {
    id: graph.id,
    name: graph.name,
    notes: graph.notes,
    createdAt: graph.createdAt.toISOString(),
    updatedAt: graph.updatedAt.toISOString(),
  };
}

export function serializeCanvasNode(node: {
  id: string;
  title: string;
  summary: string | null;
  createdAt: Date;
}): GraphNode {
  return {
    id: node.id,
    title: node.title,
    summary: node.summary,
    createdAt: node.createdAt.toISOString(),
  };
}

export function serializeCanvasEdge(edge: {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  weight: number;
  generatedFromContentId: string | null;
}): GraphEdge {
  return {
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    weight: edge.weight,
    generatedFromContentId: edge.generatedFromContentId,
  };
}

export async function touchGraph(graphId: string) {
  await prisma.graph.update({
    where: { id: graphId },
    data: { updatedAt: new Date() },
  });
}

export async function loadCanvasPayload(
  graphId: string,
): Promise<GraphPayload | null> {
  const graph = await prisma.graph.findUnique({
    where: { id: graphId },
    include: {
      nodes: {
        select: {
          id: true,
          title: true,
          summary: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!graph) return null;

  const edges = await prisma.edge.findMany({
    where: { source: { graphId }, target: { graphId } },
    select: {
      id: true,
      sourceNodeId: true,
      targetNodeId: true,
      weight: true,
      generatedFromContentId: true,
    },
  });

  return {
    graph: serializeGraph(graph),
    nodes: graph.nodes.map(serializeCanvasNode),
    edges: edges.map(serializeCanvasEdge),
  };
}
