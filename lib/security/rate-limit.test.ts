import { clientKey, resetRateLimits, takeToken } from './rate-limit'

describe('per-instance token bucket', () => {
  beforeEach(resetRateLimits)
  it('limits bursts and refills tokens over time', () => {
    expect(takeToken('user', 1, 1000, 0).ok).toBe(true)
    expect(takeToken('user', 1, 1000, 1)).toEqual({ ok: false, retryAfterSec: 1 })
    expect(takeToken('user', 1, 1000, 1000).ok).toBe(true)
  })
  it('uses a valid forwarded address and safely falls back for an invalid header', () => {
    const request = (value: string) => ({ headers: { get: () => value } }) as unknown as Request
    expect(clientKey(request('203.0.113.5, proxy'))).toBe('203.0.113.5')
    expect(clientKey(request('bad value'))).toBe('local')
  })
})
