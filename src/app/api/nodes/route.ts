import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import { touchGraph } from "@/lib/graphs";
import { createNodeSchema } from "@/lib/validation/nodes";

export async function GET(request: Request) {
  const graphId = new URL(request.url).searchParams.get("graphId");
  if (!graphId) {
    return jsonError("graphId is required", 400);
  }

  try {
    const graph = await prisma.graph.findUnique({
      where: { id: graphId },
      select: { id: true },
    });
    if (!graph) {
      return jsonError("Graph not found", 404);
    }

    const nodes = await prisma.node.findMany({
      where: { graphId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        graphId: true,
        title: true,
        summary: true,
        createdAt: true,
      },
    });

    return jsonOk(
      nodes.map((node) => ({
        ...node,
        createdAt: node.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    console.error("GET /api/nodes", error);
    return jsonError("Failed to list nodes", 500);
  }
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createNodeSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const graph = await prisma.graph.findUnique({
      where: { id: parsed.data.graphId },
      select: { id: true },
    });
    if (!graph) {
      return jsonError("Graph not found", 404);
    }

    const node = await prisma.node.create({
      data: {
        graphId: parsed.data.graphId,
        title: parsed.data.title,
        summary: parsed.data.summary ?? null,
      },
      select: {
        id: true,
        graphId: true,
        title: true,
        summary: true,
        createdAt: true,
      },
    });
    await touchGraph(parsed.data.graphId);

    return jsonOk(
      {
        ...node,
        createdAt: node.createdAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    console.error("POST /api/nodes", error);
    return jsonError("Failed to create node", 500);
  }
}
