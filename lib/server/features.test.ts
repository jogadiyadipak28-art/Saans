import { buildAdvisory, buildAlternatives, buildIndoor, buildPlan } from './features'
import * as airClient from '@/lib/air/client'
import type { AirPayload } from '@/lib/air/client'
import { retrieve } from '@/lib/rag/retrieve'
import type { Household } from '@/lib/schemas/household'


const household: Household = {
  locationLabel: 'Delhi NCR', latitude: 28.6, longitude: 77.2, locationPrecision: 'preset',
  floor: 'mid', windowHabit: 'closed', kitchenVentilation: 'exhaust', cookingFuel: 'lpg',
  commuteMode: 'walk', distanceKm: 2, members: { infant: 0, child: 1, adult: 2, elderly: 0 },
  respiratorySensitivity: false, purifierOwned: false, purifierCadr: 0, budget: 'low', language: 'en', shareOptIn: false,
}
const payload = {
  snapshot: {
    latitude: 28.6, longitude: 77.2, timezone: 'Asia/Kolkata',
    current: { pm25: 160, pm10: 220, no2: 20, o3: 18, so2: 5, coMg: 0.4 },
    hourly: Array.from({ length: 48 }, (_, index) => ({ time: new Date(Date.now() + index * 3_600_000).toISOString(), pm25: 160 - index, pm10: 220 - index })),
    fetchedAt: new Date().toISOString(), source: 'demo' as const, attribution: 'Demo data, not live.',
  },
  aqi: { aqi: 300, category: 'veryPoor', label: 'Very Poor', icon: '!', color: '#000', textColor: '#fff', description: 'x', healthMessage: 'x' },
  banner: 'Demo data, not live', cache: 'demo' as const,
} as unknown as AirPayload

describe('feature composition', () => {
  beforeEach(() => { jest.spyOn(airClient, 'loadAir').mockResolvedValue(payload); delete process.env.LLM_API_KEY })

  it('builds a household plan from live engine values with a demo air marker', async () => {
    const result = await buildPlan(household)
    expect(result.bannerAir).toBe('Demo data, not live')
    expect(result.comparison.scenario.exposure.central).toBeGreaterThan(0)
    expect(result.narrative.engineFieldsUsed.length).toBeGreaterThan(0)
    expect(result.citations.length).toBeGreaterThan(0)
    expect(result.narrativeSource).toBe('fallback')
  })

  it('builds indoor comparisons and curated budget-aware hacks', async () => {
    const result = await buildIndoor(household)
    expect(result.indoorSealed.central).toBeLessThan(result.indoorNow.central)
    expect(result.hacks.length).toBeGreaterThan(0)
    expect(result.bannerWording).toContain('AI')
    expect(result.bannerWording).toContain('AI personalization is off')
    expect(result.bannerWording).toContain('Turn on the sharing option above')
  })

  it('explains a live wording fallback separately when the household opted in', async () => {
    const result = await buildIndoor({ ...household, shareOptIn: true })
    expect(result.bannerWording).toContain('AI wording could not load')
    expect(result.bannerWording).toContain('ask the site owner to check the AI provider setup')
  })

  it('includes transport, cooking and no-burning alternatives', async () => {
    const result = await buildAlternatives(household)
    expect(new Set(result.swaps.map((swap) => swap.group))).toEqual(new Set(['transport', 'cooking', 'burning']))
    expect(result.citations.length).toBeGreaterThan(0)
  })

  it.each(['school', 'housing-society'] as const)('builds localized %s advisory from engine values and citations', async (audience) => {
    const result = await buildAdvisory(household, audience)
    expect(result.advisory.title).toContain('Delhi NCR')
    expect(result.aqi.aqi).toBe(300)
    expect(result.citations.length).toBeGreaterThan(0)
    expect(retrieve(audience, 4).length).toBeGreaterThan(0)
  })
})
