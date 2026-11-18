import { narrate } from './narrate'
import { z } from 'zod'

describe('narrate', () => {
  const common = {
    lang: 'en' as const, simple: false,
    schema: z.object({ summary: z.string() }),
    fallback: { summary: 'fallback' }, context: { value: 1 }, task: 'Explain', maxTokens: 200,
    textOf: (value: { summary: string }) => value.summary,
  }

  it('returns local wording without calling the model when sharing is off', async () => {
    await expect(narrate({ ...common, allowLlm: false })).resolves.toEqual({ data: { summary: 'fallback' }, source: 'fallback', repaired: false })
  })

  it('uses typed fallback when the provider key is absent', async () => {
    const previous = process.env.LLM_API_KEY
    delete process.env.LLM_API_KEY
    await expect(narrate(common)).resolves.toEqual({ data: { summary: 'fallback' }, source: 'fallback', repaired: false })
    if (previous !== undefined) process.env.LLM_API_KEY = previous
  })
})
