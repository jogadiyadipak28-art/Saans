import { TextDecoder, TextEncoder } from 'node:util'
import { ReadableStream } from 'node:stream/web'
import { isLlmConfigured, llmComplete, llmConfig, llmStream, requestSignal } from './client'

const originalFetch = global.fetch
const nativeTimeout = AbortSignal.timeout
const nativeAny = AbortSignal.any
Object.defineProperty(globalThis, 'TextDecoder', { configurable: true, value: TextDecoder })
if (typeof AbortSignal.timeout !== 'function') {
  Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: (ms: number) => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), ms)
    return controller.signal
  } })
}
if (typeof AbortSignal.any !== 'function') {
  Object.defineProperty(AbortSignal, 'any', { configurable: true, value: (signals: AbortSignal[]) => {
    const controller = new AbortController()
    for (const signal of signals) {
      if (signal.aborted) controller.abort(signal.reason)
      else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
    }
    return controller.signal
  } })
}
const enc = new TextEncoder()
function eventStream(lines: string[]) {
  return new ReadableStream<Uint8Array>({ start(controller) { for (const line of lines) controller.enqueue(enc.encode(line)); controller.close() } })
}
function response(payload: unknown, ok = true) {
  return { ok, status: ok ? 200 : 503, json: async () => payload } as Response
}

describe('single LLM adapter', () => {
  beforeEach(() => { process.env.LLM_API_KEY = 'test-key'; delete process.env.LLM_PROVIDER; delete process.env.LLM_MODEL; delete process.env.LLM_BASE_URL })
  afterEach(() => { global.fetch = originalFetch; delete process.env.LLM_API_KEY; delete process.env.LLM_PROVIDER; delete process.env.LLM_MODEL; delete process.env.LLM_BASE_URL })
  afterAll(() => {
    if (nativeTimeout) Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: nativeTimeout })
    else Reflect.deleteProperty(AbortSignal, 'timeout')
    if (nativeAny) Object.defineProperty(AbortSignal, 'any', { configurable: true, value: nativeAny })
    else Reflect.deleteProperty(AbortSignal, 'any')
  })

  it('loads configured defaults and supports a custom OpenAI-compatible base URL', async () => {
    process.env.LLM_BASE_URL = 'https://llm.example/v1/'
    expect(llmConfig()).toMatchObject({ provider: 'openai', model: 'gpt-4o-mini', baseUrl: 'https://llm.example/v1' })
    global.fetch = jest.fn().mockResolvedValue(response({ choices: [{ message: { content: '{"ok":true}' } }] }))
    await expect(llmComplete({ messages: [{ role: 'user', content: 'hello' }], maxTokens: 20 })).resolves.toBe('{"ok":true}')
    expect(global.fetch).toHaveBeenCalledWith('https://llm.example/v1/v1/chat/completions', expect.any(Object))
  })

  it('accepts the documented Groq model and endpoint configuration', () => {
    process.env.LLM_PROVIDER = 'openai'
    process.env.LLM_MODEL = 'openai/gpt-oss-20b'
    process.env.LLM_BASE_URL = 'https://api.groq.com/openai'
    expect(llmConfig()).toMatchObject({
      provider: 'openai',
      model: 'openai/gpt-oss-20b',
      baseUrl: 'https://api.groq.com/openai',
    })
  })

  it('uses Groq GPT-OSS reasoning and completion token settings for JSON output', async () => {
    process.env.LLM_PROVIDER = 'openai'
    process.env.LLM_MODEL = 'openai/gpt-oss-20b'
    process.env.LLM_BASE_URL = 'https://api.groq.com/openai'
    global.fetch = jest.fn().mockResolvedValue(response({ choices: [{ message: { content: '{"ok":true}' } }] }))

    const responseSchema = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false }
    await llmComplete({ messages: [{ role: 'user', content: 'Return JSON.' }], maxTokens: 700, responseSchema })

    const init = (global.fetch as jest.Mock).mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(String(init.body))
    expect(body.max_completion_tokens).toBe(1212)
    expect(body).not.toHaveProperty('max_tokens')
    expect(body.reasoning_effort).toBe('low')
    expect(body.reasoning_format).toBe('hidden')
    expect(body.response_format).toEqual({
      type: 'json_schema',
      json_schema: { name: 'saans_response', strict: true, schema: responseSchema },
    })
  })

  it('maps Anthropic system messages and Google contents for completion', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(response({ content: [{ text: 'A' }, { text: 'B' }] }))
    process.env.LLM_PROVIDER = 'anthropic'
    await expect(llmComplete({ messages: [{ role: 'system', content: 'rule' }, { role: 'user', content: 'hi' }], maxTokens: 10 })).resolves.toBe('AB')
    expect(global.fetch).toHaveBeenLastCalledWith('https://api.anthropic.com/v1/messages', expect.objectContaining({ headers: expect.objectContaining({ 'x-api-key': 'test-key' }) }))
    global.fetch = jest.fn().mockResolvedValue(response({ candidates: [{ content: { parts: [{ text: 'G' }] } }] }))
    process.env.LLM_PROVIDER = 'google'
    await expect(llmComplete({ messages: [{ role: 'assistant', content: 'previous' }, { role: 'user', content: 'hi' }], maxTokens: 10 })).resolves.toBe('G')
    const init = (global.fetch as jest.Mock).mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(String(init.body)).contents[0].role).toBe('model')
  })

  it('streams deltas from each provider and ignores malformed and terminal SSE records', async () => {
    const sse = eventStream(['data: not-json\n', 'data: {"choices":[{"delta":{"content":"a"}}]}\n', 'data: [DONE]\n', 'data: {"choices":[{"delta":{"content":"b"}}]}\n'])
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, body: sse })
    const open = [] as string[]; for await (const chunk of llmStream({ messages: [], maxTokens: 5 })) open.push(chunk)
    expect(open).toEqual(['a', 'b'])

    process.env.LLM_PROVIDER = 'anthropic'
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, body: eventStream(['data: {"delta":{"text":"c"}}\n']) })
    const anthropic = [] as string[]; for await (const chunk of llmStream({ messages: [{ role: 'system', content: 's' }], maxTokens: 5 })) anthropic.push(chunk)
    expect(anthropic).toEqual(['c'])

    process.env.LLM_PROVIDER = 'google'
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, body: eventStream(['data: {"candidates":[{"content":{"parts":[{"text":"d"}]}}]}\n']) })
    const google = [] as string[]; for await (const chunk of llmStream({ messages: [], maxTokens: 5 })) google.push(chunk)
    expect(google).toEqual(['d'])
  })

  it('rejects missing keys, unknown providers, and failed or bodyless requests', async () => {
    delete process.env.LLM_API_KEY
    expect(isLlmConfigured()).toBe(false)
    await expect(llmComplete({ messages: [], maxTokens: 1 })).rejects.toThrow('not configured')
    process.env.LLM_API_KEY = 'key'; process.env.LLM_PROVIDER = 'other'
    await expect(llmComplete({ messages: [], maxTokens: 1 })).rejects.toThrow('not supported')
    process.env.LLM_PROVIDER = 'openai'
    global.fetch = jest.fn().mockResolvedValue(response({}, false))
    await expect(llmComplete({ messages: [], maxTokens: 1 })).rejects.toThrow('503')
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, body: null })
    await expect(llmStream({ messages: [], maxTokens: 1 }).next()).rejects.toThrow('200')
  })

  it('aborts provider requests at the configured timeout', async () => {
    const signal = requestSignal(undefined, 1)
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(signal.aborted).toBe(true)
  })
})
