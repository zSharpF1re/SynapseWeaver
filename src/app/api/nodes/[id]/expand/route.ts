import { jsonError, jsonOk, parseJsonBody } from "@/lib/api";
import { runExpand } from "@/lib/ai/expand";
import { mapExpandError } from "@/lib/ai/http";
import { checkRateLimit, getRequestIp } from "@/lib/ai/rate-limit";
import { expandRequestSchema } from "@/lib/validation/ai-proposals";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  if (!checkRateLimit(`expand:${getRequestIp(request)}`)) {
    return jsonError(
      "Too many expand requests. Wait a bit to stay within the free tier.",
      429,
    );
  }

  const parsed = await parseJsonBody(request, expandRequestSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const result = await runExpand(id, parsed.data.contentId);
    return jsonOk(result);
  } catch (error) {
    return mapExpandError(error, "POST /api/nodes/[id]/expand");
  }
}
