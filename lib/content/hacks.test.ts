import { buildHacks, HACK_COPY } from './hacks'

describe('budget-aware indoor actions', () => {
  it('offers no-cost actions without assuming a purifier and scales DIY advice to budget', () => {
    expect(buildHacks({ budget: 'none', purifierOwned: false, language: 'en' }).map((hack) => hack.id)).not.toContain('purifier')
    expect(buildHacks({ budget: 'none', purifierOwned: false, language: 'en' }).find((hack) => hack.id === 'diy')?.fitsBudget).toBe(false)
    expect(buildHacks({ budget: 'low', purifierOwned: false, language: 'en' }).find((hack) => hack.id === 'diy')?.fitsBudget).toBe(true)
    expect(buildHacks({ budget: 'high', purifierOwned: false, language: 'en' }).map((hack) => hack.id)).toContain('purifier')
  })
  it('provides translated advice for every hack in all three languages', () => {
    for (const language of ['en', 'hi', 'gu'] as const) expect(Object.keys(HACK_COPY[language])).toHaveLength(6)
  })
  it('returns localized actionable copy with every selected hack for the UI', () => {
    const hacks = buildHacks({ budget: 'none', purifierOwned: false, language: 'hi' })
    expect(hacks.find((hack) => hack.id === 'seal')).toMatchObject({ title: 'दरारें बंद करें', body: expect.any(String) })
    expect(hacks.every((hack) => hack.title.length > 0 && hack.body.length > 0)).toBe(true)
  })
})
