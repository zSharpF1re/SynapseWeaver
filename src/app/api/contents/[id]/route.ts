import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import { updateContentSchema } from "@/lib/validation/contents";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const parsed = await parseJsonBody(request, updateContentSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Content not found", 404);
    }

    if (existing.type === "AI_GENERATED") {
      return jsonError("AI_GENERATED content cannot be edited in M1", 400);
    }

    if (parsed.data.text !== undefined && existing.type !== "TEXT") {
      if (existing.type === "LINK" || existing.type === "DOCUMENT") {
        // optional caption text allowed
      }
    }

    if (parsed.data.url !== undefined && existing.type !== "LINK") {
      return jsonError("url can only be updated on LINK content", 400);
    }

    if (parsed.data.fileUrl !== undefined && existing.type !== "DOCUMENT") {
      return jsonError("fileUrl can only be updated on DOCUMENT content", 400);
    }

    if (existing.type === "TEXT" && parsed.data.text === undefined) {
      // text updates only; other fields ignored
    }

    const content = await prisma.content.update({
      where: { id },
      data: {
        ...(parsed.data.text !== undefined ? { text: parsed.data.text } : {}),
        ...(parsed.data.url !== undefined && existing.type === "LINK"
          ? { url: parsed.data.url }
          : {}),
        ...(parsed.data.fileUrl !== undefined && existing.type === "DOCUMENT"
          ? { fileUrl: parsed.data.fileUrl }
          : {}),
      },
    });

    return jsonOk({
      id: content.id,
      nodeId: content.nodeId,
      type: content.type,
      text: content.text,
      url: content.url,
      fileUrl: content.fileUrl,
      createdAt: content.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("PATCH /api/contents/[id]", error);
    return jsonError("Failed to update content", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Content not found", 404);
    }

    await prisma.edge.updateMany({
      where: { generatedFromContentId: id },
      data: { generatedFromContentId: null },
    });
    await prisma.content.delete({ where: { id } });

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("DELETE /api/contents/[id]", error);
    return jsonError("Failed to delete content", 500);
  }
}
