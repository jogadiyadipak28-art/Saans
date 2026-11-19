/** @jest-environment node */
import { TextDecoder, TextEncoder } from 'node:util'
import { ReadableStream } from 'node:stream/web'
import { POST as planPOST } from './plan/route'
import { POST as indoorPOST } from './indoor/route'
import { POST as alternativesPOST } from './alternatives/route'
import { POST as advisoryPOST } from './advisory/route'
import { GET as airGET } from './air/route'
import { POST as chatPOST } from './chat/route'
import * as features from '@/lib/server/features'
import * as airClient from '@/lib/air/client'
import * as aiClient from '@/lib/ai/client'
import type { AirPayload } from '@/lib/air/client'
import { resetRateLimits } from '@/lib/security/rate-limit'

Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, value: TextEncoder })
Object.defineProperty(globalThis, 'TextDecoder', { configurable: true, value: TextDecoder })
Object.defineProperty(globalThis, 'ReadableStream', { configurable: true, value: ReadableStream })

class HeadersMock {
  private values = new Map<string, string>()
  constructor(init?: HeadersMock | Record<string, string>) {
    if (init instanceof HeadersMock) this.values = new Map(init.values)
    else for (const [key, value] of Object.entries(init ?? {})) this.set(key, value)
  }
  get(key: string) { return this.values.get(key.toLowerCase()) ?? null }
  set(key: string, value: string) { this.values.set(key.toLowerCase(), value) }
}
class ResponseMock {
  headers: HeadersMock
  public status: number
  constructor(private body: unknown, init?: { status?: number; headers?: HeadersMock | Record<string, string> }) { this.status = init?.status ?? 200; this.headers = new HeadersMock(init?.headers) }
  static json(body: unknown, init?: { status?: number; headers?: HeadersMock }) { return new ResponseMock(body, init) }
  async json() { return this.body }
  async text() {
    if (typeof this.body === 'string') return this.body
    if (!this.body || typeof this.body !== 'object' || !('getReader' in this.body)) return JSON.stringify(this.body)
    const reader = (this.body as ReadableStream<Uint8Array>).getReader()
    const decoder = new TextDecoder()
    let value = ''
    while (true) { const next = await reader.read(); if (next.done) break; value += decoder.decode(next.value, { stream: true }) }
    return value + decoder.decode()
  }
}
Object.defineProperty(globalThis, 'Headers', { configurable: true, value: HeadersMock })
Object.defineProperty(globalThis, 'Response', { configurable: true, value: ResponseMock })

const household = {
  locationLabel: 'Delhi NCR', latitude: 28.6, longitude: 77.2, locationPrecision: 'preset',
  floor: 'mid', windowHabit: 'closed', kitchenVentilation: 'none', cookingFuel: 'lpg',
  commuteMode: 'walk', distanceKm: 2, members: { infant: 0, child: 0, adult: 1, elderly: 0 },
  respiratorySensitivity: false, purifierOwned: false, purifierCadr: 0, budget: 'low', language: 'en', shareOptIn: false,
}
const air = {
  snapshot: { latitude: 28.6, longitude: 77.2, timezone: 'Asia/Kolkata', current: { pm25: 100, pm10: 150, no2: null, o3: null, so2: null, coMg: null }, hourly: [], fetchedAt: '2026-11-18T00:00:00Z', source: 'demo', attribution: 'Demo data, not live.' },
  aqi: { aqi: 180, category: 'poor', label: 'Poor', icon: '!', color: '#000', textColor: '#fff', description: '', healthMessage: '' }, banner: 'Demo data, not live', cache: 'demo',
} as unknown as AirPayload
function req(value: unknown, ip: string) {
  const body = typeof value === 'string' ? value : JSON.stringify(value)
  return { headers: { get: (key: string) => key === 'content-length' ? String(body.length) : key === 'x-real-ip' ? ip : null }, text: async () => body, signal: new AbortController().signal } as unknown as Request
}
function getReq(url: string, ip: string) { return { url, headers: { get: (key: string) => key === 'x-real-ip' ? ip : null } } as unknown as Request }

describe('serverless API route integration', () => {
  beforeEach(() => { resetRateLimits(); jest.spyOn(console, 'error').mockImplementation(() => undefined) })
  afterEach(() => jest.restoreAllMocks())

  it.each([
    ['plan', planPOST, 'buildPlan'],
    ['indoor', indoorPOST, 'buildIndoor'],
    ['alternatives', alternativesPOST, 'buildAlternatives'],
  ] as const)('%s validates input and returns the feature result', async (path, handler, method) => {
    jest.spyOn(features, method).mockResolvedValue({ result: path } as never)
    const response = await handler(req({ household }, `198.51.100.${path === 'plan' ? 11 : path === 'indoor' ? 12 : 13}`))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ result: path })
    const invalid = await handler(req({ household: { ...household, unknown: true } }, '198.51.100.14'))
    expect(invalid.status).toBe(400)
  })

  it('validates and returns a school advisory', async () => {
    jest.spyOn(features, 'buildAdvisory').mockResolvedValue({ advisory: true } as never)
    const response = await advisoryPOST(req({ household, audience: 'school' }, '198.51.100.15'))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ advisory: true })
    expect((await advisoryPOST(req({ household, audience: 'unknown' }, '198.51.100.16'))).status).toBe(400)
  })

  it('validates approximate air coordinates and returns the computed AQI result', async () => {
    jest.spyOn(airClient, 'loadAir').mockResolvedValue(air)
    const response = await airGET(getReq('https://saans.test/api/air?lat=28.6&lon=77.2', '198.51.100.17'))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ aqi: { aqi: 180 }, method: 'cpcbAqi' })
    expect((await airGET(getReq('https://saans.test/api/air?lat=91&lon=77', '198.51.100.18'))).status).toBe(400)
    expect((await airGET(getReq('https://saans.test/api/air?lat=28&lat=29&lon=77', '198.51.100.19'))).status).toBe(400)
  })

  it('returns a streamed, guardrailed chat response for severe symptoms', async () => {
    const response = await chatPOST(req({ message: 'I have chest pain and cannot breathe', language: 'en', turns: [] }, '198.51.100.20'))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/event-stream')
    const text = await response.text()
    expect(text).toContain('"type":"done"')
    expect(text).toContain('guardrail')
    expect(text).toContain('medical')
  })

  it('redacts identifiers and returns a labeled answer when chat generation fails', async () => {
    const originalKey = process.env.LLM_API_KEY
    process.env.LLM_API_KEY = 'test-key'
    const stream = jest.spyOn(aiClient, 'llmStream').mockImplementation(async function* () {
      throw new Error('provider timeout')
    })
    try {
      const response = await chatPOST(req({
        message: 'My email is a.person@example.com. Give an air tip.',
        language: 'en',
        turns: [{ role: 'user', content: 'My name is Asha Patel.' }],
      }, '198.51.100.21'))
      const text = await response.text()
      expect(JSON.stringify(stream.mock.calls[0]?.[0])).not.toContain('a.person@example.com')
      expect(JSON.stringify(stream.mock.calls[0]?.[0])).not.toContain('Asha Patel')
      expect(text).toContain('"narrativeSource":"fallback"')
      expect(text).toContain('AI wording could not load')
      expect(text).not.toContain('"type":"error"')
    } finally {
      if (originalKey === undefined) delete process.env.LLM_API_KEY
      else process.env.LLM_API_KEY = originalKey
    }
  })

  it('repairs malformed streamed chat JSON before returning the answer', async () => {
    const originalKey = process.env.LLM_API_KEY
    process.env.LLM_API_KEY = 'test-key'
    const stream = jest.spyOn(aiClient, 'llmStream').mockImplementation(async function* () { yield '{"answer":false}' })
    const completion = jest.spyOn(aiClient, 'llmComplete').mockResolvedValue(JSON.stringify({
      answer: 'Close windows when outdoor air is dirty.',
      citations: [],
      engineFieldsUsed: [],
      disclaimer: 'General information only.',
      refused: false,
    }))
    try {
      const response = await chatPOST(req({ message: 'How can I reduce indoor air?', language: 'en', turns: [] }, '198.51.100.22'))
      const text = await response.text()
      expect(stream).toHaveBeenCalledTimes(1)
      expect(completion).toHaveBeenCalledTimes(1)
      expect(text).toContain('"narrativeSource":"model"')
      expect(text).toContain('Close windows when outdoor air is dirty.')
      expect(text).not.toContain('"type":"error"')
    } finally {
      if (originalKey === undefined) delete process.env.LLM_API_KEY
      else process.env.LLM_API_KEY = originalKey
    }
  })
})
