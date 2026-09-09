import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import { placeNewNode } from "@/lib/ai/place";
import {
  checkRateLimit,
  getRequestIp,
  PLACE_MAX_HITS,
} from "@/lib/ai/rate-limit";
import { touchGraph } from "@/lib/graphs";
import { createNodeSchema } from "@/lib/validation/nodes";
import type { NodePlacement } from "@/types/graph";

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

    // Explicit parent wins over auto-place: skip placeNewNode when sourceNodeId is set.
    if (parsed.data.sourceNodeId) {
      const source = await prisma.node.findUnique({
        where: { id: parsed.data.sourceNodeId },
        select: { id: true, graphId: true },
      });
      if (!source) {
        return jsonError("Source node not found", 404);
      }
      if (source.graphId !== parsed.data.graphId) {
        return jsonError("Source node does not belong to this graph", 400);
      }

      const created = await prisma.$transaction(async (tx) => {
        const node = await tx.node.create({
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
        await tx.edge.create({
          data: {
            sourceNodeId: source.id,
            targetNodeId: node.id,
            weight: 1,
            generatedFromContentId: null,
          },
        });
        return node;
      });
      await touchGraph(parsed.data.graphId);

      return jsonOk(
        {
          ...created,
          createdAt: created.createdAt.toISOString(),
        },
        201,
      );
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

    const payload = {
      ...node,
      createdAt: node.createdAt.toISOString(),
    };

    if (!parsed.data.place) {
      return jsonOk(payload, 201);
    }

    let placement: NodePlacement;
    if (!checkRateLimit(`place:${getRequestIp(request)}`, PLACE_MAX_HITS)) {
      placement = { status: "skipped" };
    } else {
      placement = await placeNewNode(node);
    }

    return jsonOk({ ...payload, placement }, 201);
  } catch (error) {
    console.error("POST /api/nodes", error);
    return jsonError("Failed to create node", 500);
  }
}
