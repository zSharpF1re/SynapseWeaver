import { jsonError, jsonOk } from "@/lib/api";
import { runExplain } from "@/lib/ai/explain";
import { mapExplainError } from "@/lib/ai/http";
import { checkRateLimit, getRequestIp } from "@/lib/ai/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  if (!checkRateLimit(`explain:${getRequestIp(request)}`)) {
    return jsonError(
      "Too many Write with AI requests. Wait a bit to stay within the free tier.",
      429,
    );
  }

  try {
    const result = await runExplain(id);
    return jsonOk(result);
  } catch (error) {
    return mapExplainError(error, "POST /api/nodes/[id]/explain");
  }
}
