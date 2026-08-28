import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import { serializeGraph } from "@/lib/graphs";
import { createGraphSchema } from "@/lib/validation/graphs";

export async function GET() {
  try {
    const graphs = await prisma.graph.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { nodes: true } } },
    });

    return jsonOk(
      graphs.map((graph) => ({
        ...serializeGraph(graph),
        nodeCount: graph._count.nodes,
      })),
    );
  } catch (error) {
    console.error("GET /api/graphs", error);
    return jsonError("Failed to list graphs", 500);
  }
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createGraphSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const graph = await prisma.graph.create({
      data: {
        name: parsed.data.name,
        notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
      },
    });

    return jsonOk({ ...serializeGraph(graph), nodeCount: 0 }, 201);
  } catch (error) {
    console.error("POST /api/graphs", error);
    return jsonError("Failed to create graph", 500);
  }
}
