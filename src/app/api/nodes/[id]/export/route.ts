import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db/prisma";
import { pdfFilenameFromTitle } from "@/lib/export/filename";
import { renderNodePdf } from "@/lib/export/node-pdf";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const node = await prisma.node.findUnique({
      where: { id },
      include: {
        contents: {
          orderBy: { createdAt: "asc" },
          select: { type: true, text: true },
        },
      },
    });

    if (!node) {
      return jsonError("Node not found", 404);
    }

    const pdf = await renderNodePdf({
      title: node.title,
      contents: node.contents,
    });
    const filename = pdfFilenameFromTitle(node.title);

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdf.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/nodes/[id]/export", error);
    return jsonError("Failed to export node", 500);
  }
}
