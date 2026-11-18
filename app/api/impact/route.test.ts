/** @jest-environment node */
import { POST } from './route'
import { resetRateLimits } from '@/lib/security/rate-limit'

class HeadersMock { private values = new Map<string, string>(); get(key: string) { return this.values.get(key.toLowerCase()) ?? null }; set(key: string, value: string) { this.values.set(key.toLowerCase(), value) } }
class ResponseMock { constructor(private value: unknown, public status: number, public headers = new HeadersMock()) {} async json() { return this.value }; static json(value: unknown, init?: { status?: number; headers?: HeadersMock }) { return new ResponseMock(value, init?.status ?? 200, init?.headers) } }
Object.defineProperty(globalThis, 'Headers', { configurable: true, value: HeadersMock })
Object.defineProperty(globalThis, 'Response', { configurable: true, value: ResponseMock })

const household = {
  locationLabel: 'Surat', latitude: 21.17, longitude: 72.83, locationPrecision: 'preset',
  floor: 'mid', windowHabit: 'closed', kitchenVentilation: 'none', cookingFuel: 'lpg',
  commuteMode: 'metro', distanceKm: 4, members: { infant: 0, child: 0, adult: 2, elderly: 0 },
  respiratorySensitivity: false, purifierOwned: false, purifierCadr: 0, budget: 'low', language: 'en', shareOptIn: false,
}
function request(body: unknown, ip = '198.51.100.81') {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    headers: { get: (name: string) => name === 'content-length' ? String(text.length) : name === 'x-real-ip' ? ip : null },
    text: async () => text,
  } as unknown as Request
}

describe('impact API', () => {
  beforeEach(() => resetRateLimits())

  it('calculates the scenario using the deterministic engine', async () => {
    const response = await POST(request({ household, hourlyPm25: Array(24).fill(100), diyFilter: true }))
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.source).toBe('engine')
    expect(result.comparison.scenario.exposure.central).toBeGreaterThan(0)
  })

  it('rejects malformed, undersized, and unknown request fields', async () => {
    expect((await POST(request('{broken'))).status).toBe(400)
    expect((await POST(request({ household, hourlyPm25: [1, 2] }))).status).toBe(400)
    expect((await POST(request({ household, hourlyPm25: Array(24).fill(100), extra: 'no' }))).status).toBe(400)
  })

  it('enforces rate limits before calculating', async () => {
    const payload = { household, hourlyPm25: Array(24).fill(100) }
    const ip = '198.51.100.82'
    for (let index = 0; index < 30; index += 1) expect((await POST(request(payload, ip))).status).toBe(200)
    const limited = await POST(request(payload, ip))
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toBeTruthy()
  })
})
