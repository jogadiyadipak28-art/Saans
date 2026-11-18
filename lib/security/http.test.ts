/** @jest-environment node */
import { HttpError, logServerError, toErrorResponse } from './http'

class HeadersMock {
  private values = new Map<string, string>()
  get(key: string) { return this.values.get(key.toLowerCase()) ?? null }
  set(key: string, value: string) { this.values.set(key.toLowerCase(), value) }
}
class ResponseMock {
  headers: HeadersMock
  constructor(private value: unknown, public status: number, headers?: HeadersMock) { this.headers = headers ?? new HeadersMock() }
  async json() { return this.value }
  static json(value: unknown, init?: { status?: number; headers?: HeadersMock }) { return new ResponseMock(value, init?.status ?? 200, init?.headers) }
}
Object.defineProperty(globalThis, 'Headers', { configurable: true, value: HeadersMock })
Object.defineProperty(globalThis, 'Response', { configurable: true, value: ResponseMock })

describe('API error responses', () => {
  it('returns safe typed errors and retry headers', async () => {
    const response = toErrorResponse(new HttpError(429, 'Slow down', 12))
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('12')
    await expect(response.json()).resolves.toEqual({ error: 'Slow down' })
  })

  it('redacts credentials from server logs and hides unexpected details from clients', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    logServerError('test', new Error('sk-abc123 Bearer secret-token https://x.test/?key=secret'))
    expect(spy.mock.calls[0]?.[0]).not.toContain('abc123')
    expect(spy.mock.calls[0]?.[0]).not.toContain('secret-token')
    const response = toErrorResponse(new Error('internal detail'))
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Something went wrong. Please try again.' })
    spy.mockRestore()
  })
})
