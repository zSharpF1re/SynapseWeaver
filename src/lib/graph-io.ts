import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { contentSelect } from "@/lib/content-dto";
import { serializeGraph } from "@/lib/graphs";
import type { GraphExportInput } from "@/lib/validation/graphs";
import type { ContentDto } from "@/types/graph";

export const GRAPH_EXPORT_FORMAT = "synapseweaver-graph" as const;
export const GRAPH_EXPORT_VERSION = 1 as const;

export type GraphExportFile = {
  format: typeof GRAPH_EXPORT_FORMAT;
  version: typeof GRAPH_EXPORT_VERSION;
  exportedAt: string;
  graph: {
    name: string;
    notes: string | null;
    createdAt: string;
  };
  nodes: Array<{
    id: string;
    title: string;
    summary: string | null;
    createdAt: string;
    contents: Array<{
      id: string;
      type: ContentDto["type"];
      text: string | null;
      fileUrl: string | null;
      createdAt: string;
    }>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    weight: number;
    generatedFromContentId: string | null;
  }>;
};

function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function slugifyGraphName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "graph";
}

export async function exportGraph(
  graphId: string,
): Promise<GraphExportFile | null> {
  const graph = await prisma.graph.findUnique({
    where: { id: graphId },
    include: {
      nodes: {
        orderBy: { createdAt: "asc" },
        include: {
          contents: {
            orderBy: { createdAt: "asc" },
            select: contentSelect,
          },
        },
      },
    },
  });
  if (!graph) return null;

  const edges =
    graph.nodes.length === 0
      ? []
      : await prisma.edge.findMany({
          where: {
            source: { graphId },
            target: { graphId },
          },
          select: {
            id: true,
            sourceNodeId: true,
            targetNodeId: true,
            weight: true,
            generatedFromContentId: true,
          },
        });

  return {
    format: GRAPH_EXPORT_FORMAT,
    version: GRAPH_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    graph: {
      name: graph.name,
      notes: graph.notes,
      createdAt: graph.createdAt.toISOString(),
    },
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      title: node.title,
      summary: node.summary,
      createdAt: node.createdAt.toISOString(),
      contents: node.contents.map((content) => ({
        id: content.id,
        type: content.type,
        text: content.text,
        fileUrl: content.fileUrl,
        createdAt: content.createdAt.toISOString(),
      })),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      weight: edge.weight,
      generatedFromContentId: edge.generatedFromContentId,
    })),
  };
}

export async function importGraph(input: GraphExportInput) {
  const now = new Date();
  const nodeIdMap = new Map<string, string>();
  const contentIdMap = new Map<string, string>();

  for (const node of input.nodes) {
    nodeIdMap.set(node.id, randomUUID());
    for (const content of node.contents) {
      contentIdMap.set(content.id, randomUUID());
    }
  }

  const graph = await prisma.$transaction(async (tx) => {
    const created = await tx.graph.create({
      data: {
        name: input.graph.name,
        notes: input.graph.notes?.trim() ? input.graph.notes.trim() : null,
      },
    });

    for (const node of input.nodes) {
      const nodeId = nodeIdMap.get(node.id);
      if (!nodeId) throw new Error("Missing remapped node id");
      await tx.node.create({
        data: {
          id: nodeId,
          graphId: created.id,
          title: node.title,
          summary: node.summary?.trim() ? node.summary.trim() : null,
          createdAt: parseDate(node.createdAt, now),
        },
      });

      for (const content of node.contents) {
        const contentId = contentIdMap.get(content.id);
        if (!contentId) throw new Error("Missing remapped content id");
        await tx.content.create({
          data: {
            id: contentId,
            nodeId,
            type: content.type,
            text: content.text ?? null,
            fileUrl:
              content.type === "DOCUMENT" ? (content.fileUrl ?? null) : null,
            createdAt: parseDate(content.createdAt, now),
          },
        });
      }
    }

    for (const edge of input.edges) {
      const sourceNodeId = nodeIdMap.get(edge.source);
      const targetNodeId = nodeIdMap.get(edge.target);
      if (!sourceNodeId || !targetNodeId) continue;
      const generatedFromContentId = edge.generatedFromContentId
        ? (contentIdMap.get(edge.generatedFromContentId) ?? null)
        : null;
      await tx.edge.create({
        data: {
          sourceNodeId,
          targetNodeId,
          weight: edge.weight ?? 1,
          generatedFromContentId,
          createdAt: parseDate(edge.createdAt, now),
        },
      });
    }

    return created;
  });

  return serializeGraph(graph);
}
