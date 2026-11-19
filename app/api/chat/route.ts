import { z } from 'zod'
import { llmStream } from '@/lib/ai/client'
import { guardMessage } from '@/lib/ai/guardrails'
import { fitMemory } from '@/lib/ai/memory'
import { householdContext } from '@/lib/ai/household-context'
import { auditText } from '@/lib/ai/numbers'
import { systemPrompt } from '@/lib/ai/prompts'
import { extractJson, completeValidated } from '@/lib/ai/repair'
import { retrieve } from '@/lib/rag/retrieve'
import { parseBody } from '@/lib/server/parse'
import { assertRate } from '@/lib/server/rate'
import { householdSchema } from '@/lib/schemas/household'
import { delimit, sanitizeCitation, stripControl } from '@/lib/security/sanitize'
import { redactPersonalIdentifiers } from '@/lib/security/pii'
import { toErrorResponse } from '@/lib/security/http'
import { translate } from '@/lib/i18n'

const chatSchema = z
  .object({
    message: z.string().trim().min(1).max(1000),
    language: z.enum(['en', 'hi', 'gu']),
    simple: z.boolean().optional(),
    summary: z.string().max(2000).optional(),
    turns: z
      .array(
        z
          .object({
            role: z.enum(['user', 'assistant']),
            content: z.string().max(2000),
          })
          .strict(),
      )
      .max(20),
    household: householdSchema.optional(),
  })
  .strict()

const answerSchema = z
  .object({
    answer: z.string().min(1).max(2000),
    citations: z
      .array(
        z
          .object({
            id: z.string().max(80),
            title: z.string().max(160),
            source: z.string().max(200),
          })
          .strict(),
      )
      .max(6),
    engineFieldsUsed: z.array(z.string().max(80)).max(12),
    disclaimer: z.string().min(1).max(300),
    refused: z.boolean(),
  })
  .strict()

function sse(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
}

/**
 * Product surface: Ask Saans, streaming grounded chat.
 * GenAI: JSON answers validated with Zod. One repair, then a labeled fallback. Memory is token-budgeted.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertRate(request, 'llm')
    const body = await parseBody(request, chatSchema)
    const message = redactPersonalIdentifiers(stripControl(body.message, 1000))
    const decision = guardMessage(message, body.language)
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) => controller.enqueue(sse(payload))
        try {
          if (decision.action !== 'allow') {
            send({
              type: 'done',
              answer: decision.message,
              citations: [],
              bannerWording: translate(body.language, 'banner.safeAnswer'),
              narrativeSource: 'guardrail',
              summary: body.summary ?? '',
            })
            controller.close()
            return
          }
          const docs = retrieve(message, 4)
          // Enforce sharing on the server as clients can forge requests.
          const pinned = householdContext(body.household)
          const fitted = fitMemory({
            system: systemPrompt(body.language, Boolean(body.simple)),
            pinned,
            summary: redactPersonalIdentifiers(body.summary ?? ''),
            turns: [...body.turns.map((turn) => ({ ...turn, content: redactPersonalIdentifiers(turn.content) })), { role: 'user', content: message }],
          })
          const docBlock = docs
            .map((doc) => `id: ${doc.id}\ntitle: ${doc.title}\nsource: ${doc.source}\nbody: ${doc.body}`)
            .join('\n\n')
          const user = `${delimit('retrieved_docs', docBlock)}\n${delimit('question', message)}\nReply with one JSON object containing answer (string), citations (array), engineFieldsUsed (array of strings), disclaimer (string), and refused (boolean). Each citation must contain only id, title, and source, copied exactly from one retrieved document above. Do not invent citation details; use an empty citations array when no retrieved document supports the answer.`
          let raw = ''
          let modelFailed = false
          if (process.env.LLM_API_KEY) {
            try {
              for await (const chunk of llmStream({
                messages: [...fitted.messages, { role: 'user', content: user }],
                maxTokens: 700,
                signal: request.signal,
              })) {
                raw += chunk
              }
            } catch (error) {
              if (request.signal.aborted) throw error
              modelFailed = true
            }
          }
          let parsed = modelFailed
            ? { success: true as const, data: fallbackAnswer(body.language) }
            : answerSchema.safeParse(safeJson(raw))
          let source: 'model' | 'fallback' = modelFailed ? 'fallback' : 'model'
          if (!modelFailed && (!parsed.success || auditText(parsed.data.answer, { docs: docs.map((doc) => doc.title) }, false))) {
            const repaired = await completeValidated({
              schema: answerSchema,
              system: systemPrompt(body.language, Boolean(body.simple)),
              user,
              maxTokens: 700,
              fallback: fallbackAnswer(body.language),
              audit: (value) => auditText(value.answer, { docs: docs.map((doc) => doc.title) }, false),
              signal: request.signal,
            })
            parsed = { success: true, data: repaired.data }
            source = repaired.source
          }
          const known = new Set(docs.map((doc) => doc.id))
          const citations = (
            parsed.success
              ? parsed.data.citations.filter((item) => known.has(item.id))
              : []
          ).map((item) => {
            const doc = docs.find((entry) => entry.id === item.id)
            return sanitizeCitation({ id: item.id, title: item.title, source: item.source, url: doc?.url ?? null })
          })
          const answer = parsed.success ? parsed.data.answer : fallbackAnswer(body.language).answer
          for (const chunk of answer.match(/[\s\S]{1,48}/g) ?? []) send({ type: 'delta', text: chunk })
          send({
            type: 'done',
            answer,
            citations: citations.length ? citations : docs.slice(0, 2).map((doc) => sanitizeCitation(doc)),
            bannerWording: source === 'fallback' || !process.env.LLM_API_KEY ? translate(body.language, 'banner.wordingDemo') : null,
            narrativeSource: process.env.LLM_API_KEY ? source : 'fallback',
            summary: fitted.summary,
          })
          controller.close()
        } catch (error) {
          const cause = error instanceof Error && error.cause instanceof Error
            ? ` (${error.cause.name}: ${error.cause.message})`
            : ''
          const detail = error instanceof Error ? `${error.name}: ${error.message}${cause}` : 'Unknown error'
          console.error('[saans] chat stream failed:', detail)
          send({ type: 'error', message: 'Something went wrong. Please try again.' })
          controller.close()
        }
      },
    })
    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export const maxDuration = 30

function safeJson(raw: string): unknown {
  try {
    return extractJson(raw)
  } catch {
    return null
  }
}

function fallbackAnswer(language: 'en' | 'hi' | 'gu') {
  const answer =
    language === 'hi'
      ? 'यह सामान्य जानकारी है, चिकित्सा सलाह नहीं। घर की हवा के लिए खिड़कियाँ बंद रखें जब बाहर PM ज्यादा हो, और खाना बनाते समय जो पंखा हो उसे चलाएँ।'
      : language === 'gu'
        ? 'આ સામાન્ય માહિતી છે, તબીબી સલાહ નથી. બહાર PM વધારે હોય ત્યારે બારીઓ બંધ રાખો, અને રસોઈ વખતે જે પંખો હોય તે ચલાવો.'
        : 'This is general information, not medical advice. Keep windows shut when outdoor PM is high, and run the fan you already have while cooking.'
  return {
    answer,
    citations: [],
    engineFieldsUsed: [],
    disclaimer: 'This is general information about air and daily habits, not medical advice.',
    refused: false,
  }
}
