import { GoogleGenAI } from "@google/genai";
import {
  GeminiConfigError,
  GeminiOutputError,
  GeminiQuotaError,
  GeminiUnavailableError,
} from "@/lib/ai/errors";

export const GENERATE_MODEL = "gemini-3.6-flash";
export const EMBED_MODEL = "gemini-embedding-001";
export const EMBED_DIMENSIONS = 768;
export const GEMINI_TIMEOUT_MS = 20_000;

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiConfigError();
  }
  if (!client) {
    client = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: GEMINI_TIMEOUT_MS },
    });
  }
  return client;
}

export function isGeminiQuotaError(error: unknown): boolean {
  const status = getErrorStatus(error);
  const message = error instanceof Error ? error.message : String(error);
  return (
    status === 429 ||
    /resource.?exhausted|quota|rate.?limit/i.test(message)
  );
}

export function mapGeminiError(error: unknown): never {
  if (
    error instanceof GeminiConfigError ||
    error instanceof GeminiQuotaError ||
    error instanceof GeminiOutputError ||
    error instanceof GeminiUnavailableError
  ) {
    throw error;
  }
  if (isGeminiQuotaError(error)) {
    throw new GeminiQuotaError();
  }
  const status = getErrorStatus(error);
  if (status === 401 || status === 403) {
    throw new GeminiConfigError("Gemini rejected the API key.");
  }
  console.error("Gemini request failed", error);
  throw new GeminiUnavailableError();
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }
  if (
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
  ) {
    return (error as { statusCode: number }).statusCode;
  }
  return undefined;
}

export async function generateJson(prompt: {
  system: string;
  user: string;
  responseJsonSchema: Record<string, unknown>;
}): Promise<unknown> {
  const ai = getGeminiClient();
  try {
    const response = await ai.models.generateContent({
      model: GENERATE_MODEL,
      contents: prompt.user,
      config: {
        systemInstruction: prompt.system,
        temperature: 0.5,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseJsonSchema: prompt.responseJsonSchema,
        abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        thinkingConfig: { thinkingLevel: "MINIMAL" },
      },
    });
    const text = response.text?.trim();
    if (!text) {
      throw new GeminiOutputError();
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new GeminiOutputError();
    }
  } catch (error) {
    mapGeminiError(error);
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const ai = getGeminiClient();
  try {
    const response = await ai.models.embedContent({
      model: EMBED_MODEL,
      contents: texts,
      config: {
        outputDimensionality: EMBED_DIMENSIONS,
        abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      },
    });
    const embeddings = response.embeddings ?? [];
    if (embeddings.length !== texts.length) {
      throw new GeminiUnavailableError("Gemini returned the wrong number of embeddings.");
    }
    return embeddings.map((item, index) => {
      const values = item.values;
      if (!values || values.length !== EMBED_DIMENSIONS) {
        throw new GeminiUnavailableError(
          `Embedding ${index} is not ${EMBED_DIMENSIONS}-dimensional.`,
        );
      }
      return values;
    });
  } catch (error) {
    mapGeminiError(error);
  }
}
