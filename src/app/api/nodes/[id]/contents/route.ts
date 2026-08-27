import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import { contentSelect, toContentDto } from "@/lib/content-dto";
import { createContentSchema } from "@/lib/validation/contents";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id: nodeId } = await params;
  const parsed = await parseJsonBody(request, createContentSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const node = await prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) {
      return jsonError("Node not found", 404);
    }

    const data = parsed.data;
    const content = await prisma.content.create({
      data: {
        nodeId,
        type: data.type,
        text: data.text ?? null,
        fileUrl: data.type === "DOCUMENT" ? data.fileUrl : null,
      },
      select: contentSelect,
    });

    return jsonOk(toContentDto(content), 201);
  } catch (error) {
    console.error("POST /api/nodes/[id]/contents", error);
    return jsonError("Failed to create content", 500);
  }
}
