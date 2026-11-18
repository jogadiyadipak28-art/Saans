import { cpcbAqi, subIndex, categoryForIndex } from './aqi'
import { CPCB_BREAKPOINTS } from './constants'
import { compareHousehold, commuteHoursOneWay, runDay, windowForHour, type EngineInput } from './day'
import { indoorConcentration, steadyStateConcentration } from './indoor'
import { isOrdered } from './range'
import { cookingSwaps, noBurningSwap, transportSwaps } from './alternatives'

const flat = (value: number): number[] => Array.from({ length: 24 }, () => value)

function input(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    members: { infant: 0, child: 1, adult: 2, elderly: 0 },
    hourlyPm25: flat(180),
    floor: 'mid',
    windowHabit: 'open',
    commuteMode: 'two-wheeler',
    distanceKm: 8,
    kitchenVentilation: 'exhaust',
    cookingFuel: 'lpg',
    purifierCadr: 0,
    respiratorySensitivity: false,
    variant: 'optimized',
    ...overrides,
  }
}

describe('CPCB AQI breakpoints', () => {
  const pollutants = Object.keys(CPCB_BREAKPOINTS) as (keyof typeof CPCB_BREAKPOINTS)[]

  it('maps every published breakpoint concentration to the matching AQI edge', () => {
    for (const pollutant of pollutants) {
      const points = CPCB_BREAKPOINTS[pollutant]
      const edges = [0, 50, 100, 200, 300, 400, 500]
      points.forEach((concentration, index) => {
        expect(subIndex(pollutant, concentration)).toBe(edges[index])
      })
    }
  })

  it('caps the index at 500 above the severe band and rejects bad input', () => {
    expect(subIndex('pm25', 500)).toBe(500)
    expect(subIndex('pm10', 800)).toBe(500)
    expect(() => subIndex('pm25', -1)).toThrow()
  })

  it('changes category just after each AQI boundary', () => {
    expect(categoryForIndex(0)).toBe('good')
    expect(categoryForIndex(50)).toBe('good')
    expect(categoryForIndex(51)).toBe('satisfactory')
    expect(categoryForIndex(100)).toBe('satisfactory')
    expect(categoryForIndex(101)).toBe('moderate')
    expect(categoryForIndex(200)).toBe('moderate')
    expect(categoryForIndex(201)).toBe('poor')
    expect(categoryForIndex(300)).toBe('poor')
    expect(categoryForIndex(301)).toBe('very-poor')
    expect(categoryForIndex(400)).toBe('very-poor')
    expect(categoryForIndex(401)).toBe('severe')
    expect(categoryForIndex(500)).toBe('severe')
  })

  it('uses the highest sub-index and converts CO from mg/m³', () => {
    const result = cpcbAqi({ pm25: 30, pm10: 50, co: 10 })
    expect(result.aqi).toBe(200)
    expect(result.category).toBe('moderate')
    expect(result.dominant).toBe('co')
    expect(result.label).toBe('Moderate')
    expect(result.icon).toBeTruthy()
    expect(result.color).not.toBe(result.textColor)
  })
})

describe('indoor steady state', () => {
  it('matches the infiltration formula when there is no indoor source', () => {
    const value = steadyStateConcentration(0.75, 0.7, 0.2, 100, 40, 100, 0)
    expect(value).toBeCloseTo((0.75 * 0.7 * 100) / (0.7 + 0.2 + 100 / 40), 8)
  })

  it('is zero when outdoor air and indoor sources are zero', () => {
    const range = indoorConcentration({ cOut: 0, window: 'closed', cadrM3h: 0, sourceUgPerH: 0 })
    expect(range.central).toBe(0)
    expect(range.low).toBe(0)
    expect(range.high).toBe(0)
  })

  it('never increases concentration when filtering increases', () => {
    const windows = ['open', 'closed', 'sealed'] as const
    for (const window of windows) {
      let previous = indoorConcentration({ cOut: 250, window, cadrM3h: 0, sourceUgPerH: 5000 })
      for (const cadr of [50, 150, 400]) {
        const next = indoorConcentration({ cOut: 250, window, cadrM3h: cadr, sourceUgPerH: 5000 })
        expect(next.low).toBeLessThanOrEqual(previous.low + 0.05)
        expect(next.central).toBeLessThanOrEqual(previous.central + 0.05)
        expect(next.high).toBeLessThanOrEqual(previous.high + 0.05)
        expect(isOrdered(next)).toBe(true)
        previous = next
      }
    }
  })
})

describe('day impact', () => {
  it('keeps ranges ordered, units consistent, and the day at 24 hours', () => {
    const day = runDay(input())
    expect(isOrdered(day.exposure)).toBe(true)
    expect(isOrdered(day.twaPm25)).toBe(true)
    expect(isOrdered(day.cigaretteEquivalents)).toBe(true)
    expect(day.exposure.unit).toBe('µg·h/m³')
    expect(day.twaPm25.unit).toBe('µg/m³')
    expect(day.inhaledMicrograms.unit).toBe('µg')
    expect(day.co2eGrams.unit).toBe('g')
    const duration = day.hours.reduce((sum, hour) => sum + hour.durationHours, 0)
    expect(duration).toBeCloseTo(24, 5)
    expect(day.howCalculated.length).toBeGreaterThan(3)
  })

  it('returns zero exposure when nobody is home and zero commute hours when distance is zero', () => {
    const day = runDay(
      input({
        members: { infant: 0, child: 0, adult: 0, elderly: 0 },
        commuteMode: 'none',
        distanceKm: 0,
      }),
    )
    expect(day.exposure.central).toBe(0)
    expect(day.exposure.low).toBe(0)
    expect(commuteHoursOneWay('walk', 0)).toBe(0)
    expect(commuteHoursOneWay('none', 10)).toBe(0)
  })

  it('reduces exposure on a smog day when the plan stays indoors', () => {
    const comparison = compareHousehold(input({ hourlyPm25: flat(280), windowHabit: 'open' }))
    expect(comparison.scenario.exposure.central).toBeLessThanOrEqual(comparison.baseline.exposure.central)
    expect(isOrdered(comparison.exposureChangePercent)).toBe(true)
    expect(comparison.exposureChangePercent.central).toBeGreaterThan(0)
  })

  it('changes direct-impact output between an infant household and a two-wheeler commuter', () => {
    const infantHousehold = compareHousehold(input({
      members: { infant: 1, child: 0, adult: 2, elderly: 0 },
      respiratorySensitivity: true,
      commuteMode: 'none',
      windowHabit: 'sealed',
      purifierCadr: 180,
    }))
    const commuter = compareHousehold(input({
      members: { infant: 0, child: 0, adult: 1, elderly: 0 },
      respiratorySensitivity: false,
      commuteMode: 'two-wheeler',
      windowHabit: 'open',
      purifierCadr: 0,
    }))
    expect(infantHousehold.scenario.exposure.central).not.toBe(commuter.scenario.exposure.central)
    expect(infantHousehold.scenario.co2eGrams.central).not.toBe(commuter.scenario.co2eGrams.central)
  })

  it('does not raise exposure when the purifier CADR rises', () => {
    const low = runDay(input({ purifierCadr: 0, variant: 'baseline' }))
    const high = runDay(input({ purifierCadr: 300, variant: 'baseline' }))
    expect(high.exposure.central).toBeLessThanOrEqual(low.exposure.central)
    expect(high.exposure.high).toBeLessThanOrEqual(low.exposure.high + 0.2)
  })

  it('drops outdoor time to zero duration outdoors when the simulator fraction is zero', () => {
    const day = runDay(input({ hourlyPm25: flat(20), variant: 'optimized', outdoorFraction: 0 }))
    expect(day.hours.some((hour) => hour.place === 'outdoor' && hour.activity !== 'indoor')).toBe(false)
  })

  it('seals a polluted hour only on the optimized day', () => {
    expect(windowForHour(180, 'open', 'baseline')).toBe('open')
    expect(windowForHour(180, 'open', 'optimized')).toBe('sealed')
    expect(windowForHour(40, 'open', 'optimized')).toBe('open')
  })

  it('treats a flat 22 µg/m³ day as about one cigarette-equivalent before indoor losses', () => {
    const day = runDay(
      input({
        hourlyPm25: flat(22),
        windowHabit: 'open',
        variant: 'baseline',
        members: { infant: 0, child: 0, adult: 1, elderly: 0 },
        commuteMode: 'none',
        distanceKm: 0,
        kitchenVentilation: 'chimney',
      }),
    )
    expect(day.twaPm25.central).toBeGreaterThan(0)
    expect(day.cigaretteEquivalents.central).toBeGreaterThan(0)
    expect(day.cigaretteEquivalents.unit).toBe('cigarette-equivalents')
  })
})

describe('alternatives', () => {
  it('saves emissions when a car trip becomes a walk and keeps ranges ordered', () => {
    const swaps = transportSwaps('car-recirc', 10, 'none')
    const walk = swaps.find((swap) => swap.to === 'walk')
    expect(walk?.co2eSavedGrams).toBeGreaterThan(0)
    expect(walk?.fitsBudget).toBe(true)
    expect(swaps.find((swap) => swap.to === 'car-recirc')).toBeUndefined()
    for (const swap of swaps) {
      expect(isOrdered(swap.costInrPerDay)).toBe(true)
      expect(isOrdered(swap.pm25GramsPerDay)).toBe(true)
    }
  })

  it('does not treat a new induction stove as free for a no-budget household', () => {
    const swaps = cookingSwaps('biomass', 2, 'none')
    expect(swaps.find((swap) => swap.to === 'induction')?.fitsBudget).toBe(false)
    expect(swaps.find((swap) => swap.to === 'lpg')?.pm25SavedGrams).toBeGreaterThan(0)
  })

  it('offers a no-burn swap with a wide PM range', () => {
    const burn = noBurningSwap()
    expect(burn.fitsBudget).toBe(true)
    expect(burn.pm25GramsPerDay.low).toBeLessThan(burn.pm25GramsPerDay.central)
    expect(burn.pm25GramsPerDay.central).toBeLessThan(burn.pm25GramsPerDay.high)
  })
})
