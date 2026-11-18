import { PERSONAS } from '@/lib/profile/places'
import { householdSchema } from './household'

describe('household request validation', () => {
  it('accepts a valid household and rejects unknown fields', () => {
    const household = PERSONAS.delhi
    expect(householdSchema.safeParse(household).success).toBe(true)
    expect(householdSchema.safeParse({ ...household, streetAddress: '123 Main Street' }).success).toBe(false)
  })
  it('rejects empty households and inconsistent purifier data', () => {
    expect(householdSchema.safeParse({ ...PERSONAS.surat, members: { infant: 0, child: 0, adult: 0, elderly: 0 } }).success).toBe(false)
    expect(householdSchema.safeParse({ ...PERSONAS.surat, purifierCadr: 100 }).success).toBe(false)
  })
})
