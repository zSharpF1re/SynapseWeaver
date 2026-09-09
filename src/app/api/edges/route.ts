import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import { serializeCanvasEdge, touchGraph } from "@/lib/graphs";
import { createEdgeSchema } from "@/lib/validation/edges";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createEdgeSchema);
  if ("error" in parsed) return parsed.error;

  const { sourceNodeId, targetNodeId } = parsed.data;

  try {
    const [source, target] = await Promise.all([
      prisma.node.findUnique({
        where: { id: sourceNodeId },
        select: { id: true, graphId: true },
      }),
      prisma.node.findUnique({
        where: { id: targetNodeId },
        select: { id: true, graphId: true },
      }),
    ]);

    if (!source || !target) {
      return jsonError("Node not found", 404);
    }
    if (source.graphId !== target.graphId) {
      return jsonError("Nodes must belong to the same graph", 400);
    }

    const existing = await prisma.edge.findFirst({
      where: {
        OR: [
          { sourceNodeId, targetNodeId },
          { sourceNodeId: targetNodeId, targetNodeId: sourceNodeId },
        ],
      },
      select: {
        id: true,
        sourceNodeId: true,
        targetNodeId: true,
        weight: true,
        generatedFromContentId: true,
      },
    });
    if (existing) {
      return jsonOk(serializeCanvasEdge(existing));
    }

    const edge = await prisma.edge.create({
      data: {
        sourceNodeId,
        targetNodeId,
        weight: 1,
        generatedFromContentId: null,
      },
      select: {
        id: true,
        sourceNodeId: true,
        targetNodeId: true,
        weight: true,
        generatedFromContentId: true,
      },
    });
    await touchGraph(source.graphId);

    return jsonOk(serializeCanvasEdge(edge), 201);
  } catch (error) {
    console.error("POST /api/edges", error);
    return jsonError("Failed to create edge", 500);
  }
}
