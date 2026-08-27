import { jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import { confirmExpand, ExpandConfirmError } from "@/lib/ai/confirm";
import { ExpandStaleError } from "@/lib/ai/expand";
import { mapExpandError } from "@/lib/ai/http";
import { confirmRequestSchema } from "@/lib/validation/ai-proposals";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const parsed = await parseJsonBody(request, confirmRequestSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const result = await confirmExpand(id, parsed.data);
    return jsonOk(result);
  } catch (error) {
    if (error instanceof ExpandStaleError) {
      return jsonError(error.message, 409);
    }
    if (error instanceof ExpandConfirmError) {
      return jsonError(error.message, 400);
    }
    return mapExpandError(error, "POST /api/nodes/[id]/expand/confirm");
  }
}
