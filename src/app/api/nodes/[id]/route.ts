import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import { deleteBlobIfPresent } from "@/lib/blob";
import { contentSelect, toContentDto } from "@/lib/content-dto";
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
          select: contentSelect,
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
      contents: node.contents.map(toContentDto),
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
    const existing = await prisma.node.findUnique({
      where: { id },
      include: { contents: { select: { type: true, fileUrl: true } } },
    });
    if (!existing) {
      return jsonError("Node not found", 404);
    }

    const documentUrls = existing.contents
      .filter((content) => content.type === "DOCUMENT")
      .map((content) => content.fileUrl);

    await prisma.$transaction([
      prisma.edge.deleteMany({
        where: {
          OR: [{ sourceNodeId: id }, { targetNodeId: id }],
        },
      }),
      prisma.content.deleteMany({ where: { nodeId: id } }),
      prisma.node.delete({ where: { id } }),
    ]);

    await Promise.all(documentUrls.map((fileUrl) => deleteBlobIfPresent(fileUrl)));

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("DELETE /api/nodes/[id]", error);
    return jsonError("Failed to delete node", 500);
  }
}
