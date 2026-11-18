import { estimateTokens, fitMemory } from './memory'

describe('token-aware chat memory', () => {
  it('keeps the system and pinned household context and reports a bounded estimate', () => {
    const result = fitMemory({
      system: 'Use only supplied context.',
      pinned: 'place: Surat',
      summary: '',
      turns: [{ role: 'user', content: 'When should I ventilate?' }],
      budget: 120,
    })
    expect(result.messages[0]?.content).toContain('Use only supplied context.')
    expect(result.messages[0]?.content).toContain('Surat')
    expect(result.estimatedTokens).toBeLessThanOrEqual(120)
  })

  it('moves older turns into a rolling summary and retains the newest question', () => {
    const result = fitMemory({
      system: 'Stay grounded.',
      pinned: 'Delhi household',
      summary: 'Earlier: windows were sealed.',
      turns: [
        { role: 'user', content: 'First long history '.repeat(50) },
        { role: 'assistant', content: 'Older response '.repeat(50) },
        { role: 'user', content: 'Most recent question' },
      ],
      budget: 100,
    })
    expect(result.overflow.length).toBeGreaterThan(0)
    expect(result.summary).toContain('Older response')
    expect(result.messages.at(-1)?.content).toContain('Most recent question')
    expect(estimateTokens(result.summary)).toBeLessThanOrEqual(300)
  })

  it('clips one oversized recent turn to the token budget', () => {
    const result = fitMemory({ system: 'Rules.', pinned: 'Surat', summary: '', turns: [{ role: 'user', content: 'Long question '.repeat(100) }], budget: 100 })
    expect(result.messages.at(-1)?.content.length).toBeLessThan(1500)
    expect(result.estimatedTokens).toBeLessThanOrEqual(100)
  })

  it('handles a tiny budget and sparse turn list without adding a summary', () => {
    const result = fitMemory({ system: 'Rules.', pinned: '', summary: 'old context', turns: [undefined as unknown as { role: 'user'; content: string }], budget: 4 })
    expect(result.summary).toBe('')
    expect(result.overflow).toHaveLength(0)
  })
})
