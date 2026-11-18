import { engineContext, fallbackNarrative, userPayload } from './explain'
import type { DayComparison } from '@/lib/engine/day'
import type { AqiResult } from '@/lib/engine/aqi'

describe('engine grounded explanation context', () => {
  const comparison = {
    baseline: { exposure: { central: 120 } },
    scenario: { exposure: { central: 80 }, cigaretteEquivalents: { central: 2 }, twaPm25: { central: 44 } },
    exposureChangePercent: { central: 33 },
    co2eSavedGrams: { central: 200 },
    pm25SavedGrams: { central: 3 },
  } as unknown as DayComparison
  const aqi = { aqi: 220, category: 'veryPoor' } as unknown as AqiResult

  it('passes only deterministic engine values to the narrator', () => {
    expect(engineContext(comparison, aqi, 180)).toEqual({
      baselineExposure: 120, planExposure: 80, reductionPercent: 33,
      cigarettes: 2, twa: 44, co2eSaved: 200, pmSaved: 3,
      aqi: 220, pm25: 180, cigaretteDivisor: 22,
    })
  })

  it('localizes fallback wording and names the engine fields used', () => {
    const fallback = fallbackNarrative(comparison, 'en', false)
    expect(fallback.summary).toContain('33')
    expect(fallback.disclaimer).toContain('medical')
    expect(fallback.engineFieldsUsed).toContain('plan.exposure.central')
    expect(fallbackNarrative(comparison, 'hi', true).summary).toBeTruthy()
    expect(fallbackNarrative({ ...comparison, exposureChangePercent: { central: -12 } } as DayComparison, 'gu', false).summary).toBeTruthy()
  })

  it('delimits payload and task notes', () => {
    expect(userPayload({ pm25: 20 }, 'explain')).toContain('<engine_payload>')
    expect(userPayload({}, 'explain')).toContain('<task_notes>')
  })
})
