import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import {
  collectContentMediaUrls,
  deleteBlobsIfUnreferenced,
} from "@/lib/blob-gc";
import { loadCanvasPayload, serializeGraph } from "@/lib/graphs";
import { updateGraphSchema } from "@/lib/validation/graphs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const payload = await loadCanvasPayload(id);
    if (!payload) {
      return jsonError("Graph not found", 404);
    }
    return jsonOk(payload);
  } catch (error) {
    console.error("GET /api/graphs/[id]", error);
    return jsonError("Failed to load graph", 500);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const parsed = await parseJsonBody(request, updateGraphSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const existing = await prisma.graph.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Graph not found", 404);
    }

    const graph = await prisma.graph.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.notes !== undefined
          ? { notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null }
          : {}),
      },
    });

    return jsonOk(serializeGraph(graph));
  } catch (error) {
    console.error("PATCH /api/graphs/[id]", error);
    return jsonError("Failed to update graph", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const graph = await prisma.graph.findUnique({
      where: { id },
      include: {
        nodes: {
          include: {
            contents: { select: { fileUrl: true, text: true } },
          },
        },
      },
    });
    if (!graph) {
      return jsonError("Graph not found", 404);
    }

    const mediaUrls = collectContentMediaUrls(
      graph.nodes.flatMap((node) => node.contents),
    );

    await prisma.graph.delete({ where: { id } });
    await deleteBlobsIfUnreferenced(mediaUrls);

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("DELETE /api/graphs/[id]", error);
    return jsonError("Failed to delete graph", 500);
  }
}
