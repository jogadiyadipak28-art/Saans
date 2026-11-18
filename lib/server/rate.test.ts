/** @jest-environment node */
import { assertRate } from './rate'
import { HttpError } from '@/lib/security/http'
import { resetRateLimits } from '@/lib/security/rate-limit'

describe('API rate policy', () => {
  beforeEach(() => resetRateLimits())
  it('allows configured requests and throws a retryable 429 when exhausted', () => {
    const request = { headers: { get: (name: string) => name === 'x-real-ip' ? '198.51.100.44' : null } } as unknown as Request
    for (let index = 0; index < 8; index += 1) assertRate(request, 'llm')
    try { assertRate(request, 'llm'); throw new Error('expected throttling') }
    catch (error) { expect(error).toBeInstanceOf(HttpError); expect(error).toMatchObject({ status: 429, retryAfterSec: expect.any(Number) }) }
  })
})
