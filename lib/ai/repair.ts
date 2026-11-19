import { z } from 'zod'
import { llmComplete } from './client'
import { repairPrompt } from './prompts'

const providerSchemaUnsupportedKeys = new Set([
  '$schema', 'maxLength', 'minLength', 'maxItems', 'minItems',
  'maximum', 'minimum', 'exclusiveMaximum', 'exclusiveMinimum', 'pattern', 'format',
])

function providerSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(providerSchema)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !providerSchemaUnsupportedKeys.has(key)).map(([key, item]) => [key, providerSchema(item)]),
  )
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced?.[1] ?? text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('No JSON object')
  return JSON.parse(raw.slice(start, end + 1)) as unknown
}

export function extractJsonStringField(buffer: string, field: string): string | null {
  const key = `"${field}"`
  const keyAt = buffer.indexOf(key)
  if (keyAt < 0) return null
  let index = buffer.indexOf(':', keyAt + key.length)
  if (index < 0) return null
  index += 1
  while (index < buffer.length && /\s/.test(buffer[index] ?? '')) index += 1
  if (buffer[index] !== '"') return null
  index += 1
  let out = ''
  while (index < buffer.length) {
    const char = buffer[index]
    if (char === '\\') {
      const next = buffer[index + 1]
      if (!next) return out
      const map: Record<string, string> = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\' }
      out += map[next] ?? next
      index += 2
      continue
    }
    if (char === '"') return out
    out += char ?? ''
    index += 1
  }
  return out
}

export async function completeValidated<T>(options: {
  schema: z.ZodType<T>
  system: string
  user: string
  maxTokens: number
  fallback: T
  audit?: (value: T) => string | null
  signal?: AbortSignal
}): Promise<{ data: T; source: 'model' | 'fallback'; repaired: boolean }> {
  if (!process.env.LLM_API_KEY) return { data: options.fallback, source: 'fallback', repaired: false }
  const responseSchema = providerSchema(z.toJSONSchema(options.schema)) as Record<string, unknown>
  const system = `${options.system}\nReturn exactly one JSON object that matches this schema. Include every required field, with no extra fields: ${JSON.stringify(responseSchema)}`
  let repaired = false
  let extra = ''
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await llmComplete({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: extra ? `${options.user}\n\n${extra}` : options.user },
        ],
        maxTokens: options.maxTokens,
        signal: options.signal,
        responseSchema,
      })
      const parsed = options.schema.safeParse(extractJson(text))
      if (!parsed.success) {
        extra = repairPrompt(parsed.error.issues.map((issue) => issue.message).join('; '))
        repaired = true
        continue
      }
      const auditError = options.audit?.(parsed.data)
      if (auditError) {
        extra = repairPrompt(auditError)
        repaired = true
        continue
      }
      return { data: parsed.data, source: 'model', repaired }
    } catch (error) {
      extra = repairPrompt(error instanceof Error ? error.message : 'invalid')
      repaired = true
    }
  }
  return { data: options.fallback, source: 'fallback', repaired }
}
