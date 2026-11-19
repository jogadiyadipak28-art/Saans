import { z } from 'zod'
import * as client from './client'
import { completeValidated, extractJson, extractJsonStringField } from './repair'

const complete = jest.spyOn(client, 'llmComplete')
const schema = z.object({ answer: z.string().min(1) }).strict()
const fallback = { answer: 'fallback' }

describe('structured model output', () => {
  const originalKey = process.env.LLM_API_KEY
  beforeEach(() => { process.env.LLM_API_KEY = 'test-key'; complete.mockReset() })
  afterAll(() => { if (originalKey === undefined) delete process.env.LLM_API_KEY; else process.env.LLM_API_KEY = originalKey })
  it('extracts fenced JSON and partial streamed string values', () => {
    expect(extractJson('```json\n{"answer":"ok"}\n```')).toEqual({ answer: 'ok' })
    expect(extractJsonStringField('{"answer":"air\\nhelp"}', 'answer')).toBe('air\nhelp')
  })
  it('validates model JSON and repairs a schema mismatch once', async () => {
    complete.mockResolvedValueOnce('{"answer":false}').mockResolvedValueOnce('{"answer":"repaired"}')
    const result = await completeValidated({ schema, system: 'system', user: 'question', maxTokens: 100, fallback })
    expect(result).toEqual({ data: { answer: 'repaired' }, source: 'model', repaired: true })
    expect(complete).toHaveBeenCalledTimes(2)
    expect(complete.mock.calls[0]?.[0].messages[0]?.content).toContain('Return exactly one JSON object that matches this schema')
    expect(complete.mock.calls[0]?.[0].responseSchema).toMatchObject({
      type: 'object',
      properties: { answer: { type: 'string' } },
      required: ['answer'],
      additionalProperties: false,
    })
  })
  it('returns the typed fallback after the repair also fails', async () => {
    complete.mockResolvedValue('{"unexpected":true}')
    const result = await completeValidated({ schema, system: 'system', user: 'question', maxTokens: 100, fallback })
    expect(result.data).toEqual(fallback)
    expect(result.source).toBe('fallback')
    expect(complete).toHaveBeenCalledTimes(2)
  })
  it('uses fallback without contacting a provider when no key is configured', async () => {
    delete process.env.LLM_API_KEY
    const result = await completeValidated({ schema, system: 'system', user: 'question', maxTokens: 100, fallback })
    expect(result.data).toEqual(fallback)
    expect(complete).not.toHaveBeenCalled()
  })
})
