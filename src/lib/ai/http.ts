import { jsonError } from "@/lib/api";
import {
  GeminiConfigError,
  GeminiOutputError,
  GeminiQuotaError,
  GeminiUnavailableError,
} from "@/lib/ai/errors";
import {
  ExpandContentError,
  ExpandNodeNotFoundError,
} from "@/lib/ai/expand";

export function mapExpandError(error: unknown, logLabel: string) {
  if (error instanceof ExpandNodeNotFoundError) {
    return jsonError(error.message, 404);
  }
  if (error instanceof ExpandContentError) {
    return jsonError(error.message, 400);
  }
  if (error instanceof GeminiConfigError) {
    return jsonError(error.message, 503);
  }
  if (error instanceof GeminiQuotaError) {
    return jsonError(error.message, 429);
  }
  if (error instanceof GeminiOutputError) {
    return jsonError(error.message, 422);
  }
  if (error instanceof GeminiUnavailableError) {
    return jsonError(error.message, 503);
  }
  console.error(logLabel, error);
  return jsonError("Failed to expand node", 500);
}
