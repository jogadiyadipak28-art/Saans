import { householdContext } from './household-context'
import type { Household } from '@/lib/schemas/household'

const profile = {
  locationLabel: 'Surat', latitude: 21, longitude: 72, locationPrecision: 'city',
  floor: 'mid', windowHabit: 'closed', kitchenVentilation: 'none', cookingFuel: 'lpg',
  commuteMode: 'walk', distanceKm: 2, members: { infant: 0, child: 1, adult: 1, elderly: 0 },
  respiratorySensitivity: true, purifierOwned: false, purifierCadr: 0, budget: 'low', language: 'en', shareOptIn: false,
} as Household

describe('household model context consent', () => {
  it('omits profile details unless the profile itself includes an explicit opt-in', () => {
    expect(householdContext()).toBe('No household saved.')
    expect(householdContext(profile)).toBe('No household saved.')
    const shared = householdContext({ ...profile, shareOptIn: true })
    expect(shared).not.toContain('Surat')
    expect(shared).toContain('"sensitivity":true')
    expect(shared).not.toContain('latitude')
    expect(shared).not.toContain('longitude')
  })
})
