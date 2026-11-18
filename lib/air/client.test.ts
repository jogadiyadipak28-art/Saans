import { airQualityUrl, loadAir, next24Pm25, resetAirCache } from './client'

function payload() {
  const times = Array.from({ length: 24 }, (_, i) => `2026-11-18T${String(i).padStart(2, '0')}:00`)
  return { latitude: 28.61, longitude: 77.21, timezone: 'Asia/Kolkata', current: { time: times[0], pm2_5: 38, pm10: 60 }, hourly: { time: times, pm2_5: times.map((_, i) => i + 10), pm10: times.map((_, i) => i + 20) } }
}

describe('server air client', () => {
  beforeEach(resetAirCache)
  it('requests the global CAMS domain and validates live forecast data', async () => {
    const url = new URL(airQualityUrl(28.61, 77.21))
    expect(url.searchParams.get('domains')).toBe('cams_global')
    expect(url.searchParams.get('current')).toContain('pm2_5')
    const fetcher = jest.fn(async () => ({ ok: true, json: async () => payload() }) as Response)
    const result = await loadAir(28.611, 77.211, { fetch: fetcher })
    expect(result.snapshot.source).toBe('live')
    expect(result.snapshot.current.pm25).toBe(38)
    expect(result.cache).toBe('miss')
    expect(next24Pm25(result.snapshot, 0)).toHaveLength(24)
  })
  it('caches rounded coordinates, then clearly labels a failed feed as demo', async () => {
    const fetcher = jest.fn(async () => ({ ok: true, json: async () => payload() }) as Response)
    await loadAir(28.611, 77.211, { fetch: fetcher })
    const cached = await loadAir(28.614, 77.214, { fetch: fetcher })
    expect(cached.cache).toBe('hit')
    expect(fetcher).toHaveBeenCalledTimes(1)
    resetAirCache()
    const demo = await loadAir(28, 77, { fetch: async () => ({ ok: false, json: async () => null }) as Response })
    expect(demo.snapshot.source).toBe('demo')
    expect(demo.banner).toBe('Demo data, not live')
  })
  it('aborts a stalled air provider request and returns labeled demo data', async () => {
    const fetcher = jest.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    }))
    const demo = await loadAir(28, 77, { fetch: fetcher, timeoutMs: 5 })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(demo.snapshot.source).toBe('demo')
    expect(demo.banner).toBe('Demo data, not live')
  })
})
