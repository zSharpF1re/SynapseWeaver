import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import {
  collectContentMediaUrls,
  deleteBlobsIfUnreferenced,
} from "@/lib/blob-gc";
import { contentSelect, toContentDto } from "@/lib/content-dto";
import { touchGraph } from "@/lib/graphs";
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
      graphId: node.graphId,
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
        graphId: true,
        title: true,
        summary: true,
        createdAt: true,
      },
    });
    await touchGraph(existing.graphId);

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
      include: { contents: { select: { type: true, fileUrl: true, text: true } } },
    });
    if (!existing) {
      return jsonError("Node not found", 404);
    }

    const mediaUrls = collectContentMediaUrls(existing.contents);

    await prisma.node.delete({ where: { id } });
    await touchGraph(existing.graphId);
    await deleteBlobsIfUnreferenced(mediaUrls);

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("DELETE /api/nodes/[id]", error);
    return jsonError("Failed to delete node", 500);
  }
}
