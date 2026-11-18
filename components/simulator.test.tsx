import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { axe } from 'jest-axe'
import { Simulator } from './simulator'
import { Providers } from './providers'
import { saveProfile } from '@/lib/profile/storage'
import type { Household } from '@/lib/schemas/household'

const profile: Household = {
  locationLabel: 'Surat', latitude: 21.17, longitude: 72.83, locationPrecision: 'preset',
  floor: 'mid', windowHabit: 'closed', kitchenVentilation: 'none', cookingFuel: 'lpg',
  commuteMode: 'metro', distanceKm: 4, members: { infant: 0, child: 0, adult: 2, elderly: 0 },
  respiratorySensitivity: false, purifierOwned: false, purifierCadr: 0, budget: 'low', language: 'en', shareOptIn: false,
}
const snapshot = {
  latitude: profile.latitude, longitude: profile.longitude, timezone: 'Asia/Kolkata',
  current: { pm25: 120, pm10: 160, no2: null, o3: null, so2: null, coMg: null },
  hourly: Array.from({ length: 48 }, (_, index) => ({ time: new Date(Date.now() + index * 3_600_000).toISOString(), pm25: 120, pm10: 160 })),
  fetchedAt: new Date().toISOString(), source: 'demo' as const, attribution: 'Demo data, not live.',
}

describe('impact simulator', () => {
  const originalFetch = global.fetch
  beforeEach(() => {
    window.localStorage.clear(); saveProfile(profile)
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ snapshot, banner: 'Demo data, not live' }) }) as unknown as typeof fetch
  })
  afterEach(() => { global.fetch = originalFetch })

  it('recalculates locally when the outdoor-time slider changes and passes axe', async () => {
    const { container } = render(<Providers><Simulator /></Providers>)
    const slider = await screen.findByRole('slider', { name: 'Share of outdoor time to keep' })
    await waitFor(() => expect(screen.queryByText(/Loading air data/)).not.toBeInTheDocument())
    const originalResult = container.textContent
    fireEvent.change(slider, { target: { value: '20' } })
    await waitFor(() => expect(container.textContent).not.toBe(originalResult))
    expect(screen.getByText('Demo data, not live')).toBeInTheDocument()
    expect(await axe(container)).toMatchObject({ violations: [] })
  })
})
