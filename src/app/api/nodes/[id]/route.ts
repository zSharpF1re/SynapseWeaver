import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import { updateNodeSchema } from "@/lib/validation/nodes";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const node = await prisma.node.findUnique({
      where: { id },
      include: {
        contents: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!node) {
      return jsonError("Node not found", 404);
    }

    return jsonOk({
      id: node.id,
      title: node.title,
      summary: node.summary,
      createdAt: node.createdAt.toISOString(),
      contents: node.contents.map((content) => ({
        id: content.id,
        nodeId: content.nodeId,
        type: content.type,
        text: content.text,
        url: content.url,
        fileUrl: content.fileUrl,
        createdAt: content.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/nodes/[id]", error);
    return jsonError("Failed to load node", 500);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const parsed = await parseJsonBody(request, updateNodeSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const existing = await prisma.node.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Node not found", 404);
    }

    const node = await prisma.node.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined
          ? { title: parsed.data.title }
          : {}),
        ...(parsed.data.summary !== undefined
          ? { summary: parsed.data.summary }
          : {}),
      },
      select: {
        id: true,
        title: true,
        summary: true,
        createdAt: true,
      },
    });

    return jsonOk({
      ...node,
      createdAt: node.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("PATCH /api/nodes/[id]", error);
    return jsonError("Failed to update node", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const existing = await prisma.node.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Node not found", 404);
    }

    await prisma.$transaction([
      prisma.edge.deleteMany({
        where: {
          OR: [{ sourceNodeId: id }, { targetNodeId: id }],
        },
      }),
      prisma.content.deleteMany({ where: { nodeId: id } }),
      prisma.node.delete({ where: { id } }),
    ]);

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("DELETE /api/nodes/[id]", error);
    return jsonError("Failed to delete node", 500);
  }
}
