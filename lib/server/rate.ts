import { clientKey, LIMITS, takeToken } from '@/lib/security/rate-limit'
import { HttpError } from '@/lib/security/http'

export function assertRate(request: Request, kind: keyof typeof LIMITS): void {
  const limit = LIMITS[kind]
  const result = takeToken(`${kind}:${clientKey(request)}`, limit.capacity, limit.windowMs)
  if (!result.ok) {
    throw new HttpError(429, 'Too many requests. Please wait and try again.', result.retryAfterSec)
  }
}
