import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    details === undefined ? { error: message } : { error: message, details },
    { status },
  );
}

export function fromZodError(error: ZodError) {
  return jsonError("Validation failed", 400, error.flatten());
}

export async function parseJsonBody<T>(
  request: Request,
  schema: { parse: (data: unknown) => T },
): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: jsonError("Invalid JSON body", 400) };
  }

  try {
    return { data: schema.parse(body) };
  } catch (err) {
    if (err instanceof ZodError) {
      return { error: fromZodError(err) };
    }
    return { error: jsonError("Validation failed", 400) };
  }
}
