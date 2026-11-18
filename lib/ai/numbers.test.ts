import { auditText, collectNumbers, unknownNumbers } from './numbers'

describe('LLM number audit', () => {
  it('collects values and allowed hourly references recursively', () => {
    const allowed = collectNumbers({ level: 35.5, text: 'range 20-50' })
    expect(allowed.has('35.5')).toBe(true)
    expect(unknownNumbers('PM is 35.5 at 9 o’clock', allowed)).toEqual(['9'])
  })
  it('flags an unsupported metric in generated prose', () => {
    expect(auditText('PM fell by 500 percent.', { percent: 12 })).toContain('500')
    expect(auditText('No numbers here.', {})).toBeNull()
  })
  it('does not allow chat to invent numeric claims when it has no engine payload', () => {
    expect(auditText('Stay inside for 2 hours.', {}, false)).toContain('2')
    expect(auditText('Stay inside during PM2.5 peaks.', {}, false)).toBeNull()
    expect(auditText('PM2.5 is 35 µg/m³.', {}, false)).toContain('35')
  })
})
