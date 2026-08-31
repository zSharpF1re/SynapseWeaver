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
import {
  ExplainNodeNotFoundError,
  ExplainNotSparseError,
} from "@/lib/ai/explain";

function mapGeminiHttpError(
  error: unknown,
  logLabel: string,
  fallback: string,
) {
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
  return jsonError(fallback, 500);
}

export function mapExpandError(error: unknown, logLabel: string) {
  if (error instanceof ExpandNodeNotFoundError) {
    return jsonError(error.message, 404);
  }
  if (error instanceof ExpandContentError) {
    return jsonError(error.message, 400);
  }
  return mapGeminiHttpError(error, logLabel, "Failed to expand node");
}

export function mapExplainError(error: unknown, logLabel: string) {
  if (error instanceof ExplainNodeNotFoundError) {
    return jsonError(error.message, 404);
  }
  if (error instanceof ExplainNotSparseError) {
    return jsonError(error.message, 400);
  }
  return mapGeminiHttpError(error, logLabel, "Failed to generate note");
}
