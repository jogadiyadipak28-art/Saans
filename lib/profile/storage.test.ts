import { PERSONAS } from './places'
import { clearSaansData, readChat, readPledges, readPrefs, readProfile, saveChat, savePledges, savePrefs, saveProfile, DEFAULT_PREFS } from './storage'

describe('browser-only data storage', () => {
  beforeEach(() => window.localStorage.clear())
  it('round-trips validated preferences and household profile', () => {
    savePrefs({ ...DEFAULT_PREFS, language: 'gu', largeText: true })
    saveProfile(PERSONAS.surat)
    expect(readPrefs().language).toBe('gu')
    expect(readProfile()?.locationLabel).toBe('Surat')
  })
  it('rejects malformed local records and clears all Saans keys', () => {
    window.localStorage.setItem('saans.profile.v1', '{"streetAddress":"secret"}')
    window.localStorage.setItem('saans.prefs.v1', '{"language":"fr"}')
    expect(readProfile()).toBeNull()
    expect(readPrefs()).toEqual(DEFAULT_PREFS)
    savePledges([{ id: 'one', text: 'No waste burning', topic: 'burning', at: new Date().toISOString() }])
    saveChat({ summary: '', turns: [{ role: 'user', content: 'When to ventilate?' }] })
    expect(readPledges()).toHaveLength(1)
    expect(readChat().turns).toHaveLength(1)
    clearSaansData()
    expect(readPledges()).toEqual([])
    expect(readChat().turns).toEqual([])
  })
})
