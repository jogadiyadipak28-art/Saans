import { z } from 'zod'
import { cpcbAqi, type AqiResult } from '@/lib/engine/aqi'

const point = z.number().nullable()

const openMeteoSchema = z
  .object({
    latitude: z.number(),
    longitude: z.number(),
    timezone: z.string().optional(),
    current: z
      .object({
        time: z.string(),
        pm2_5: point.optional(),
        pm10: point.optional(),
        nitrogen_dioxide: point.optional(),
        ozone: point.optional(),
        sulphur_dioxide: point.optional(),
        carbon_monoxide: point.optional(),
      })
      .optional(),
    hourly: z
      .object({
        time: z.array(z.string()),
        pm2_5: z.array(point),
        pm10: z.array(point),
      })
      .optional(),
  })
  .passthrough()

export type AirHour = { time: string; pm25: number; pm10: number }

export type AirSnapshot = {
  latitude: number
  longitude: number
  timezone: string
  current: { pm25: number; pm10: number; no2: number | null; o3: number | null; so2: number | null; coMg: number | null }
  hourly: AirHour[]
  fetchedAt: string
  source: 'live' | 'demo'
  attribution: string
}

export type AirPayload = {
  snapshot: AirSnapshot
  aqi: AqiResult
  banner: string | null
  cache: 'hit' | 'miss' | 'demo'
}

const ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality'
const TTL_MS = 12 * 60 * 1000

type CacheEntry = { expires: number; value: AirSnapshot }
const memory = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<AirSnapshot>>()

export function roundCoord(value: number): number {
  return Math.round(value * 100) / 100
}

export function airQualityUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide',
    hourly: 'pm2_5,pm10',
    timezone: 'auto',
    forecast_days: '3',
    past_days: '1',
    domains: 'cams_global',
  })
  return `${ENDPOINT}?${params.toString()}`
}

export function resetAirCache(): void {
  memory.clear()
  inflight.clear()
}

function numberOr(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function demoSnapshot(latitude: number, longitude: number): AirSnapshot {
  const pm25 = latitude > 27 ? 280 : latitude > 24 ? 180 : 96
  const pm10 = Math.round(pm25 * 1.6)
  const start = Date.now()
  const hourly = Array.from({ length: 48 }, (_, index) => ({
    time: new Date(start + index * 3600_000).toISOString(),
    pm25: Math.max(20, pm25 - (index % 12) * 8),
    pm10: Math.max(30, pm10 - (index % 12) * 10),
  }))
  return {
    latitude,
    longitude,
    timezone: 'Asia/Kolkata',
    current: { pm25, pm10, no2: 40, o3: 30, so2: 12, coMg: 1.2 },
    hourly,
    fetchedAt: new Date(start).toISOString(),
    source: 'demo',
    attribution: 'Demo data, not live. Shape follows CAMS via Open-Meteo.',
  }
}

function parseLive(payload: unknown): AirSnapshot {
  const parsed = openMeteoSchema.safeParse(payload)
  if (!parsed.success || parsed.data.current?.pm2_5 == null || !parsed.data.hourly) {
    throw new Error('Air response failed validation')
  }
  const hourly = parsed.data.hourly.time.flatMap((time, index) => {
    const pm25 = parsed.data.hourly?.pm2_5[index]
    const pm10 = parsed.data.hourly?.pm10[index]
    if (typeof pm25 !== 'number' || typeof pm10 !== 'number') return []
    return [{ time, pm25, pm10 }]
  })
  if (hourly.length < 24) throw new Error('Air response did not include a full day')
  const current = parsed.data.current
  return {
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    timezone: parsed.data.timezone ?? 'Asia/Kolkata',
    current: {
      pm25: numberOr(current.pm2_5, hourly[0]?.pm25 ?? 0),
      pm10: numberOr(current.pm10, hourly[0]?.pm10 ?? 0),
      no2: current.nitrogen_dioxide ?? null,
      o3: current.ozone ?? null,
      so2: current.sulphur_dioxide ?? null,
      coMg: current.carbon_monoxide == null ? null : current.carbon_monoxide / 1000,
    },
    hourly,
    fetchedAt: new Date().toISOString(),
    source: 'live',
    attribution: 'CAMS global air-quality forecast via Open-Meteo. India is outside the Europe domain, so domains=cams_global.',
  }
}

async function fetchLive(latitude: number, longitude: number, fetchImpl: typeof fetch, timeoutMs: number): Promise<AirSnapshot> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const init = { headers: { accept: 'application/json' }, signal: controller.signal, next: { revalidate: 720 } } as RequestInit & { next?: { revalidate: number } }
    const response = await fetchImpl(airQualityUrl(latitude, longitude), init)
    if (!response.ok) throw new Error(`Air status ${response.status}`)
    return parseLive(await response.json())
  } finally {
    clearTimeout(timeout)
  }
}

export function next24Pm25(snapshot: AirSnapshot, now = Date.now()): number[] {
  const upcoming = snapshot.hourly.filter((hour) => Date.parse(hour.time) >= now - 3600_000)
  const source = upcoming.length >= 24 ? upcoming : snapshot.hourly
  const values = source.slice(0, 24).map((hour) => hour.pm25)
  while (values.length < 24) values.push(values[values.length - 1] ?? snapshot.current.pm25)
  return values
}

export function withAqi(snapshot: AirSnapshot, cache: AirPayload['cache']): AirPayload {
  const aqi = cpcbAqi({
    pm25: snapshot.current.pm25,
    pm10: snapshot.current.pm10,
    ...(snapshot.current.no2 == null ? {} : { no2: snapshot.current.no2 }),
    ...(snapshot.current.o3 == null ? {} : { o3: snapshot.current.o3 }),
    ...(snapshot.current.so2 == null ? {} : { so2: snapshot.current.so2 }),
    ...(snapshot.current.coMg == null ? {} : { co: snapshot.current.coMg }),
  })
  return {
    snapshot,
    aqi,
    banner: snapshot.source === 'demo' ? 'Demo data, not live' : null,
    cache,
  }
}

export async function loadAir(
  latitude: number,
  longitude: number,
  deps?: { fetch?: typeof fetch; now?: number; timeoutMs?: number },
): Promise<AirPayload> {
  const key = `${roundCoord(latitude)}:${roundCoord(longitude)}`
  const now = deps?.now ?? Date.now()
  const cached = memory.get(key)
  if (cached && cached.expires > now) return withAqi(cached.value, 'hit')
  try {
    const pending = inflight.get(key)
    const fetchImpl = deps?.fetch ?? fetch
    const promise = pending ?? fetchLive(roundCoord(latitude), roundCoord(longitude), fetchImpl, deps?.timeoutMs ?? 8_000)
    if (!pending) inflight.set(key, promise)
    const snapshot = await promise
    memory.set(key, { expires: now + TTL_MS, value: snapshot })
    return withAqi(snapshot, 'miss')
  } catch (error) {
    console.error('[saans] air fallback')
    void error
    return withAqi(demoSnapshot(latitude, longitude), 'demo')
  } finally {
    inflight.delete(key)
  }
}
