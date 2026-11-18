import { PERSONAS, resolvePlace } from './places'

describe('approximate location and demo personas', () => {
  it('resolves known cities case-insensitively and PINs to broad regions', () => {
    expect(resolvePlace(' surat ')?.label).toBe('Surat')
    expect(resolvePlace('110001')?.precision).toBe('pincode')
    expect(resolvePlace('999999')).toBeNull()
    expect(resolvePlace('unknown city')).toBeNull()
  })
  it('keeps demo households opted out of model context sharing', () => {
    for (const persona of Object.values(PERSONAS)) expect(persona.shareOptIn).toBe(false)
  })
})
