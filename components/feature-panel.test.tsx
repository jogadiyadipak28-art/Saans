import { render, screen } from '@testing-library/react'
import { FeaturePanel } from './feature-panel'
import { Providers } from './providers'
import { saveProfile } from '@/lib/profile/storage'
import type { Household } from '@/lib/schemas/household'

const profile: Household = {
  locationLabel: 'Delhi', latitude: 28.61, longitude: 77.21, locationPrecision: 'city',
  floor: 'mid', windowHabit: 'closed', kitchenVentilation: 'none', cookingFuel: 'lpg',
  commuteMode: 'walk', distanceKm: 2, members: { infant: 1, child: 0, adult: 2, elderly: 0 },
  respiratorySensitivity: true, purifierOwned: false, purifierCadr: 0, budget: 'low', language: 'en', shareOptIn: false,
}

describe('indoor feature presentation', () => {
  const originalFetch = global.fetch
  beforeEach(() => {
    window.localStorage.clear()
    saveProfile(profile)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hacks: [{ id: 'seal', title: 'Seal the gaps', body: 'Tape the largest window gaps.', fitsBudget: true }],
      }),
    }) as unknown as typeof fetch
  })
  afterEach(() => { global.fetch = originalFetch })

  it('renders the actionable localized hack title and body returned by the API', async () => {
    render(<Providers><FeaturePanel kind="indoor" /></Providers>)
    expect(await screen.findByText('Seal the gaps')).toBeInTheDocument()
    expect(screen.getByText('Tape the largest window gaps.')).toBeInTheDocument()
    expect(screen.queryByText('Air Source')).not.toBeInTheDocument()
  })

  it('turns planner output into tailored, clear daily steps and impact ranges', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        aqi: { aqi: 160, category: 'poor' },
        narrative: { summary: 'Keep the day flexible.', impactExplanation: 'The modeled plan lowers exposure.' },
        comparison: {
          exposureChangePercent: { low: 3, central: 5, high: 7, unit: '%' },
          co2eSavedGrams: { low: 10, central: 20, high: 30, unit: 'g' },
          pm25SavedGrams: { low: 1, central: 2, high: 3, unit: 'g' },
        },
      }),
    }) as unknown as typeof fetch
    render(<Providers><FeaturePanel kind="plan" /></Providers>)
    expect(await screen.findByText('Your plan for today')).toBeInTheDocument()
    expect(screen.getByText(/Move outdoor exercise and optional errands/)).toBeInTheDocument()
    expect(screen.getByText(/Your household includes someone who may be more affected/)).toBeInTheDocument()
    expect(screen.getByText('Estimated impact of the plan')).toBeInTheDocument()
    expect(screen.getByText(/A negative exposure reduction means some modeled cases increase exposure/)).toBeInTheDocument()
    expect(screen.queryByText('narrativeSource')).not.toBeInTheDocument()
  })

  it('presents alternatives as practical options with engine estimates', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        narrative: { summary: 'Compare these options before changing routines.' },
        swaps: [{
          id: 'transport-two-wheeler-to-metro', group: 'transport', from: 'two-wheeler', to: 'metro', fitsBudget: true,
          co2eSavedGrams: 26, pm25SavedGrams: 0.2, extraMinutesPerDay: { low: 4, central: 6, high: 8, unit: 'min' },
          costInrPerDay: { low: 0, central: 10, high: 20, unit: 'INR/day' },
          co2eGramsPerDay: { low: 1, central: 2, high: 3, unit: 'g' }, pm25GramsPerDay: { low: 0, central: 0, high: 0, unit: 'g' }, note: 'Approximate commute factors.',
        }],
      }),
    }) as unknown as typeof fetch
    render(<Providers><FeaturePanel kind="alternatives" /></Providers>)
    expect(await screen.findByText('Getting around')).toBeInTheDocument()
    expect(screen.getByText('From a two-wheeler to the metro')).toBeInTheDocument()
    expect(screen.getByText('+26 g/day')).toBeInTheDocument()
    expect(screen.queryByText('co2eSavedGrams')).not.toBeInTheDocument()
  })
})
