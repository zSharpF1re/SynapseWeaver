import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import {
  collectContentMediaUrls,
  deleteBlobsIfUnreferenced,
} from "@/lib/blob-gc";
import { contentSelect, toContentDto } from "@/lib/content-dto";
import { touchGraph } from "@/lib/graphs";
import {
  parseTextBody,
  updateContentSchema,
} from "@/lib/validation/contents";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const parsed = await parseJsonBody(request, updateContentSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const existing = await prisma.content.findUnique({
      where: { id },
      select: {
        ...contentSelect,
        node: { select: { graphId: true } },
      },
    });
    if (!existing) {
      return jsonError("Content not found", 404);
    }

    if (existing.type === "AI_GENERATED") {
      return jsonError("AI_GENERATED content cannot be edited in M1", 400);
    }

    if (parsed.data.fileUrl !== undefined && existing.type !== "DOCUMENT") {
      return jsonError("fileUrl can only be updated on DOCUMENT content", 400);
    }

    if (parsed.data.text !== undefined && existing.type === "TEXT") {
      if (parsed.data.text == null) {
        return jsonError("Text is required", 400);
      }
      const body = parseTextBody(parsed.data.text);
      if (!body.ok) {
        return jsonError(body.error, 400);
      }
    }

    const content = await prisma.content.update({
      where: { id },
      data: {
        ...(parsed.data.text !== undefined ? { text: parsed.data.text } : {}),
        ...(parsed.data.fileUrl !== undefined && existing.type === "DOCUMENT"
          ? { fileUrl: parsed.data.fileUrl }
          : {}),
      },
      select: contentSelect,
    });
    await touchGraph(existing.node.graphId);

    const droppedUrls: string[] = [];
    if (
      parsed.data.fileUrl !== undefined &&
      existing.fileUrl &&
      existing.fileUrl !== parsed.data.fileUrl
    ) {
      droppedUrls.push(existing.fileUrl);
    }
    if (parsed.data.text !== undefined && existing.text !== parsed.data.text) {
      droppedUrls.push(
        ...collectContentMediaUrls([{ fileUrl: null, text: existing.text }]),
      );
    }
    if (droppedUrls.length > 0) {
      await deleteBlobsIfUnreferenced(droppedUrls);
    }

    return jsonOk(toContentDto(content));
  } catch (error) {
    console.error("PATCH /api/contents/[id]", error);
    return jsonError("Failed to update content", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const existing = await prisma.content.findUnique({
      where: { id },
      select: {
        ...contentSelect,
        node: { select: { graphId: true } },
      },
    });
    if (!existing) {
      return jsonError("Content not found", 404);
    }

    const mediaUrls = collectContentMediaUrls([existing]);

    await prisma.edge.updateMany({
      where: { generatedFromContentId: id },
      data: { generatedFromContentId: null },
    });
    await prisma.content.delete({ where: { id } });
    await touchGraph(existing.node.graphId);
    await deleteBlobsIfUnreferenced(mediaUrls);

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("DELETE /api/contents/[id]", error);
    return jsonError("Failed to delete content", 500);
  }
}
