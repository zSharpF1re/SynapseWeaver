import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    const [nodes, edges] = await Promise.all([
      prisma.node.findMany({
        select: {
          id: true,
          title: true,
          summary: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.edge.findMany({
        select: {
          id: true,
          sourceNodeId: true,
          targetNodeId: true,
          weight: true,
          generatedFromContentId: true,
        },
      }),
    ]);

    return jsonOk({
      nodes: nodes.map((node) => ({
        ...node,
        createdAt: node.createdAt.toISOString(),
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        weight: edge.weight,
        generatedFromContentId: edge.generatedFromContentId,
      })),
    });
  } catch (error) {
    console.error("GET /api/graph", error);
    return jsonError("Failed to load graph", 500);
  }
}
