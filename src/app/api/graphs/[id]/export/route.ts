import { jsonError } from "@/lib/api";
import { exportGraph, slugifyGraphName } from "@/lib/graph-io";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const payload = await exportGraph(id);
    if (!payload) {
      return jsonError("Graph not found", 404);
    }

    const filename = `${slugifyGraphName(payload.graph.name)}.json`;
    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/graphs/[id]/export", error);
    return jsonError("Failed to export graph", 500);
  }
}
