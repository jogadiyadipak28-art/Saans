import { z } from 'zod'
import { HttpError } from '@/lib/security/http'

export async function parseBody<T>(request: Request, schema: z.ZodType<T>, maxBytes = 48_000): Promise<T> {
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new HttpError(413, 'Request is too large.')
  }
  const text = await readBodyWithinLimit(request, maxBytes)
  let json: unknown
  try {
    json = JSON.parse(text) as unknown
  } catch {
    throw new HttpError(400, 'Check the form and try again.')
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    console.error('[saans] validation', parsed.error.issues.map((issue) => issue.path.join('.')).join(','))
    throw new HttpError(400, 'Check the form and try again.')
  }
  return parsed.data
}

async function readBodyWithinLimit(request: Request, maxBytes: number): Promise<string> {
  if (!request.body) return request.text()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        throw new HttpError(413, 'Request is too large.')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  catch { throw new HttpError(400, 'Check the form and try again.') }
}

export function parseQueryNumber(value: string | null, label: string): number {
  const parsed = z.number().finite().safeParse(value === null ? Number.NaN : Number(value))
  if (!parsed.success) throw new HttpError(400, 'Check the form and try again.')
  void label
  return parsed.data
}
