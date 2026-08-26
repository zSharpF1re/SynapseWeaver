import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import { createNodeSchema } from "@/lib/validation/nodes";

export async function GET() {
  try {
    const nodes = await prisma.node.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
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
    const node = await prisma.node.create({
      data: {
        title: parsed.data.title,
        summary: parsed.data.summary ?? null,
      },
      select: {
        id: true,
        title: true,
        summary: true,
        createdAt: true,
      },
    });

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
