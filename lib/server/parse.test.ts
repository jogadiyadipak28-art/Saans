/** @jest-environment node */
import { HttpError } from '@/lib/security/http'
import { parseBody, parseQueryNumber } from './parse'
import { z } from 'zod'
import { TextDecoder, TextEncoder } from 'node:util'
import { ReadableStream } from 'node:stream/web'

Object.defineProperty(globalThis, 'TextDecoder', { configurable: true, value: TextDecoder })

const request = (body: string, contentLength: string | null = null) => ({
  headers: { get: (key: string) => key === 'content-length' ? contentLength : null },
  text: async () => body,
}) as unknown as Request

describe('strict API input parsing', () => {
  it('parses a valid body and rejects invalid JSON and unknown fields', async () => {
    const schema = z.object({ city: z.string() }).strict()
    await expect(parseBody(request('{"city":"Delhi"}'), schema)).resolves.toEqual({ city: 'Delhi' })
    await expect(parseBody(request('not json'), schema)).rejects.toMatchObject({ status: 400 })
    await expect(parseBody(request('{"city":"Delhi","name":"x"}'), schema)).rejects.toBeInstanceOf(HttpError)
  })
  it('rejects oversized bodies and invalid query numbers', async () => {
    await expect(parseBody(request('{"city":"Delhi"}', '100'), z.object({ city: z.string() }), 20)).rejects.toMatchObject({ status: 413 })
    expect(parseQueryNumber('28.6', 'lat')).toBe(28.6)
    expect(() => parseQueryNumber('NaN', 'lat')).toThrow(HttpError)
  })

  it('enforces the streamed size limit and rejects invalid UTF-8', async () => {
    const streamed = (bytes: Uint8Array) => ({
      headers: { get: () => null },
      body: new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes); controller.close() } }),
    }) as unknown as Request
    const schema = z.object({ city: z.string() }).strict()
    await expect(parseBody(streamed(new TextEncoder().encode('{"city":"Delhi"}')), schema, 5)).rejects.toMatchObject({ status: 413 })
    await expect(parseBody(streamed(new Uint8Array([0xc3, 0x28])), schema)).rejects.toMatchObject({ status: 400 })
  })
})
