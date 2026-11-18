export type LlmMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type LlmConfig = {
  provider: string
  apiKey: string
  model: string
  baseUrl: string
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
  google: 'gemini-2.5-flash',
}

export function llmConfig(): LlmConfig {
  const provider = process.env.LLM_PROVIDER?.trim() || 'openai'
  return {
    provider,
    apiKey: process.env.LLM_API_KEY?.trim() ?? '',
    model: process.env.LLM_MODEL?.trim() || DEFAULT_MODELS[provider] || 'gpt-4o-mini',
    baseUrl: process.env.LLM_BASE_URL?.trim().replace(/\/$/, '') ?? '',
  }
}

export function isLlmConfigured(): boolean {
  return llmConfig().apiKey.length > 0
}

type CompleteArgs = {
  messages: LlmMessage[]
  maxTokens: number
  signal?: AbortSignal
  json?: boolean
}

export function requestSignal(signal?: AbortSignal, timeoutMs = 12_000): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

export async function llmComplete(args: CompleteArgs): Promise<string> {
  const config = llmConfig()
  if (!config.apiKey) throw new Error('LLM API key is not configured')
  if (config.provider === 'anthropic') return completeAnthropic(config, args)
  if (config.provider === 'google') return completeGoogle(config, args)
  if (config.provider === 'openai') return completeOpenAI(config, args, false)
  throw new Error('LLM provider is not supported')
}

export async function* llmStream(args: CompleteArgs): AsyncGenerator<string> {
  const config = llmConfig()
  if (!config.apiKey) throw new Error('LLM API key is not configured')
  if (config.provider === 'anthropic') {
    yield* streamAnthropic(config, args)
    return
  }
  if (config.provider === 'google') {
    yield* streamGoogle(config, args)
    return
  }
  if (config.provider === 'openai') {
    yield* streamOpenAI(config, args)
    return
  }
  throw new Error('LLM provider is not supported')
}

function openAiUrl(config: LlmConfig): string {
  return `${config.baseUrl || 'https://api.openai.com'}/v1/chat/completions`
}

async function completeOpenAI(config: LlmConfig, args: CompleteArgs, stream: boolean): Promise<string> {
  const response = await fetch(openAiUrl(config), {
    method: 'POST',
    signal: requestSignal(args.signal),
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: args.messages,
      max_tokens: args.maxTokens,
      temperature: 0.2,
      stream,
      ...(args.json === false ? {} : { response_format: { type: 'json_object' } }),
    }),
  })
  if (!response.ok) throw new Error(`LLM status ${response.status}`)
  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] }
  return payload.choices?.[0]?.message?.content ?? ''
}

async function* streamOpenAI(config: LlmConfig, args: CompleteArgs): AsyncGenerator<string> {
  const response = await fetch(openAiUrl(config), {
    method: 'POST',
    signal: requestSignal(args.signal),
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: args.messages,
      max_tokens: args.maxTokens,
      temperature: 0.2,
      stream: true,
      ...(args.json === false ? {} : { response_format: { type: 'json_object' } }),
    }),
  })
  if (!response.ok || !response.body) throw new Error(`LLM status ${response.status}`)
  yield* readSse(response.body, (json) => {
    const delta = (json as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content
    return delta ?? ''
  })
}

async function completeAnthropic(config: LlmConfig, args: CompleteArgs): Promise<string> {
  const system = args.messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n')
  const messages = args.messages.filter((message) => message.role !== 'system')
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: requestSignal(args.signal),
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: args.maxTokens,
      temperature: 0.2,
      system,
      messages,
    }),
  })
  if (!response.ok) throw new Error(`LLM status ${response.status}`)
  const payload = (await response.json()) as { content?: { text?: string }[] }
  return payload.content?.map((block) => block.text ?? '').join('') ?? ''
}

async function* streamAnthropic(config: LlmConfig, args: CompleteArgs): AsyncGenerator<string> {
  const system = args.messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n')
  const messages = args.messages.filter((message) => message.role !== 'system')
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: requestSignal(args.signal),
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: config.model, max_tokens: args.maxTokens, temperature: 0.2, system, messages, stream: true }),
  })
  if (!response.ok || !response.body) throw new Error(`LLM status ${response.status}`)
  yield* readSse(response.body, (json) => {
    const delta = json as { delta?: { text?: string } }
    return delta.delta?.text ?? ''
  })
}

async function completeGoogle(config: LlmConfig, args: CompleteArgs): Promise<string> {
  const response = await fetch(googleUrl(config, false), {
    method: 'POST',
    signal: requestSignal(args.signal),
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(googleBody(args)),
  })
  if (!response.ok) throw new Error(`LLM status ${response.status}`)
  const payload = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
}

async function* streamGoogle(config: LlmConfig, args: CompleteArgs): AsyncGenerator<string> {
  const response = await fetch(googleUrl(config, true), {
    method: 'POST',
    signal: requestSignal(args.signal),
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(googleBody(args)),
  })
  if (!response.ok || !response.body) throw new Error(`LLM status ${response.status}`)
  yield* readSse(response.body, (json) => {
    const payload = json as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
  })
}

function googleUrl(config: LlmConfig, stream: boolean): string {
  const method = stream ? 'streamGenerateContent' : 'generateContent'
  const suffix = stream ? '&alt=sse' : ''
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:${method}?key=${encodeURIComponent(config.apiKey)}${suffix}`
}

function googleBody(args: CompleteArgs): unknown {
  const system = args.messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n')
  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: args.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
    generationConfig: {
      maxOutputTokens: args.maxTokens,
      temperature: 0.2,
      ...(args.json === false ? {} : { responseMimeType: 'application/json' }),
    },
  }
}

async function* readSse(body: ReadableStream<Uint8Array>, pick: (json: unknown) => string): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        const text = pick(JSON.parse(data) as unknown)
        if (text) yield text
      } catch {
        continue
      }
    }
  }
}
