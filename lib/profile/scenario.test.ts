import { PERSONAS } from './places'
import { toEngineInput } from './scenario'

describe('household to engine mapping', () => {
  it('uses saved assumptions and applies simulator overrides', () => {
    const input = toEngineInput(PERSONAS.delhi, Array.from({ length: 30 }, (_, index) => index), { mask: true, windowOverride: 'sealed', diyFilter: true, outdoorFraction: 0.5 })
    expect(input.hourlyPm25).toHaveLength(24)
    expect(input.members.infant).toBe(1)
    expect(input.mask).toBe(true)
    expect(input.windowOverride).toBe('sealed')
    expect(input.diyFilter).toBe(true)
    expect(input.outdoorFraction).toBe(0.5)
  })
})
