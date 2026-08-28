import { ZodError } from "zod";
import { fromZodError, jsonError, jsonOk } from "@/lib/api";
import { importGraph } from "@/lib/graph-io";
import {
  MAX_IMPORT_BYTES,
  graphExportSchema,
} from "@/lib/validation/graphs";

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_IMPORT_BYTES) {
    return jsonError("Import file is too large", 413);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (raw.length > MAX_IMPORT_BYTES) {
    return jsonError("Import file is too large", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  try {
    const parsed = graphExportSchema.parse(body);
    const graph = await importGraph(parsed);
    return jsonOk(graph, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return fromZodError(error);
    }
    console.error("POST /api/graphs/import", error);
    return jsonError("Failed to import graph", 500);
  }
}
