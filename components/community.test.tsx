import { fireEvent, render, screen } from '@testing-library/react'
import { Community } from './community'
import { Providers } from './providers'
import { saveProfile } from '@/lib/profile/storage'
import type { Household } from '@/lib/schemas/household'

const profile: Household = {
  locationLabel: 'Surat', latitude: 21.17, longitude: 72.83, locationPrecision: 'city',
  floor: 'mid', windowHabit: 'closed', kitchenVentilation: 'exhaust', cookingFuel: 'lpg',
  commuteMode: 'metro', distanceKm: 4, members: { infant: 0, child: 0, adult: 2, elderly: 0 },
  respiratorySensitivity: false, purifierOwned: false, purifierCadr: 0, budget: 'low', language: 'en', shareOptIn: false,
}

describe('community advisory presentation', () => {
  const originalFetch = global.fetch
  beforeEach(() => {
    window.localStorage.clear()
    saveProfile(profile)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        bannerAir: null,
        bannerWording: 'Demo wording, not a live model',
        airSource: 'live',
        advisory: {
          title: 'School air plan for Surat',
          paragraphs: ['Check the local reading before outdoor activities.'],
          actions: ['Move sports indoors during higher readings.', 'Tell families when outdoor plans change.'],
          disclaimer: 'General information only.',
        },
      }),
    }) as unknown as typeof fetch
  })
  afterEach(() => { global.fetch = originalFetch })

  it('shows the advisory as a titled draft with separate actions and status', async () => {
    render(<Providers><Community /></Providers>)
    fireEvent.click(screen.getByRole('button', { name: /school/i }))
    expect(await screen.findByRole('heading', { name: 'School air plan for Surat' })).toBeInTheDocument()
    expect(screen.getByText('Check the local reading before outdoor activities.')).toBeInTheDocument()
    expect(screen.getByText('Move sports indoors during higher readings.')).toBeInTheDocument()
    expect(await screen.findByText('Tell families when outdoor plans change.')).toBeInTheDocument()
    expect(await screen.findByText('Demo wording, not a live model')).toBeInTheDocument()
    expect(screen.queryByText('airSource')).not.toBeInTheDocument()
    expect(screen.getByText('Draft ready. Please review it before sharing.')).toBeInTheDocument()
  })
})
