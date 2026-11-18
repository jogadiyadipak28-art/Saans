import { z } from 'zod'
import { auditText } from '@/lib/ai/numbers'
import { systemPrompt } from '@/lib/ai/prompts'
import { completeValidated } from '@/lib/ai/repair'
import type { Lang } from '@/lib/i18n'

export async function narrate<T>(options: {
  lang: Lang
  simple: boolean
  schema: z.ZodType<T>
  fallback: T
  context: unknown
  task: string
  maxTokens: number
  textOf: (value: T) => string
  allowLlm?: boolean
  signal?: AbortSignal
}): Promise<{ data: T; source: 'model' | 'fallback'; repaired: boolean }> {
  if (options.allowLlm === false) return { data: options.fallback, source: 'fallback', repaired: false }
  return completeValidated({
    schema: options.schema,
    system: systemPrompt(options.lang, options.simple),
    user: options.task,
    maxTokens: options.maxTokens,
    fallback: options.fallback,
    signal: options.signal,
    audit: (value) => auditText(options.textOf(value), options.context),
  })
}
