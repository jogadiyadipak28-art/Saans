type Bucket = { tokens: number; updated: number }

const buckets = new Map<string, Bucket>()

/**
 * Per-isolate token bucket. On Vercel each serverless instance has its own map,
 * so this is demo-grade. Production should use a shared store such as Upstash Redis.
 */
export function takeToken(
  key: string,
  capacity: number,
  windowMs: number,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  if (buckets.size > 10_000) {
    for (const [bucketKey, value] of buckets) if (now - value.updated > windowMs * 2) buckets.delete(bucketKey)
  }
  const refillPerMs = capacity / windowMs
  const existing = buckets.get(key)
  const bucket = existing ?? { tokens: capacity, updated: now }
  const elapsed = Math.max(0, now - bucket.updated)
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerMs)
  bucket.updated = now
  buckets.set(key, bucket)
  if (bucket.tokens < 1) {
    const retryAfterSec = Math.max(1, Math.ceil((1 - bucket.tokens) / refillPerMs / 1000))
    return { ok: false, retryAfterSec }
  }
  bucket.tokens -= 1
  return { ok: true }
}

export function resetRateLimits(): void {
  buckets.clear()
}

export function clientKey(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim() ?? ''
  if (/^[0-9a-fA-F:.]{3,64}$/.test(realIp)) return realIp
  if (process.env.NODE_ENV === 'production') return 'unknown-client'
  const forwarded = request.headers.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim() ?? ''
  if (/^[0-9a-fA-F:.]{3,64}$/.test(first)) return first
  return 'local'
}

export const LIMITS = {
  llm: { capacity: 8, windowMs: 60_000 },
  air: { capacity: 30, windowMs: 60_000 },
} as const
