import { PROMPT_VERSION, repairPrompt, systemPrompt } from './prompts'

describe('responsible AI prompts', () => {
  it('versions the prompt and constrains generated numbers and advice', () => {
    const prompt = systemPrompt('Gujarati', true)
    expect(prompt).toContain(PROMPT_VERSION)
    expect(prompt).toContain('Do not invent measurements')
    expect(prompt).toContain('grade 6')
    expect(prompt).toContain('not medical advice')
  })
  it('bounds schema errors included in the repair instruction', () => {
    expect(repairPrompt('x'.repeat(800))).toHaveLength(repairPrompt('').length + 500)
  })
})
