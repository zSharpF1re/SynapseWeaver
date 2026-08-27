const WINDOW_MS = 60 * 60 * 1000;
const MAX_HITS = 8;

type Bucket = number[];

const hits = new Map<string, Bucket>();

export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "local";
}

export function checkRateLimit(
  key: string,
  max = MAX_HITS,
  windowMs = WINDOW_MS,
): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= max) {
    hits.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  hits.set(key, timestamps);
  return true;
}
