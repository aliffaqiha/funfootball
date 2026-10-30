type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

/** Per-process fallback limiter. Deployments should also enforce limits at the trusted edge. */
export function rateLimit(request: Request, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  // Only trust these headers when the app is behind a proxy that overwrites them.
  const client = request.headers.get("x-real-ip")?.trim() || forwarded || "unknown";
  const bucketKey = `${key}:${client}`;
  const previous = buckets.get(bucketKey);
  const elapsed = previous ? Math.max(0, now - previous.updatedAt) : windowMs;
  const tokens = Math.min(limit, (previous?.tokens ?? limit) + (elapsed * limit) / windowMs);

  if (buckets.size >= MAX_BUCKETS && !buckets.has(bucketKey)) {
    for (const [entry, bucket] of buckets) {
      if (now - bucket.updatedAt >= windowMs) buckets.delete(entry);
      if (buckets.size < MAX_BUCKETS) break;
    }
    if (buckets.size >= MAX_BUCKETS) return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
  }

  if (tokens < 1) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil(((1 - tokens) * windowMs) / (limit * 1000))) };
  }
  buckets.set(bucketKey, { tokens: tokens - 1, updatedAt: now });
  return { allowed: true, retryAfter: 0 };
}

export function rateLimitResponse(retryAfter: number) {
  return Response.json(
    { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
    { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
  );
}
