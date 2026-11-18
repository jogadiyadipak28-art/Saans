import { z } from 'zod'
import { buildAlternatives } from '@/lib/server/features'
import { parseBody } from '@/lib/server/parse'
import { assertRate } from '@/lib/server/rate'
import { householdSchema } from '@/lib/schemas/household'
import { toErrorResponse } from '@/lib/security/http'

const bodySchema = z.object({ household: householdSchema }).strict()

/**
 * Product surface: transport, cooking-fuel, and no-burn swaps.
 * GenAI: introduction only. Cost, time, and emissions are engine rows.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertRate(request, 'llm')
    const body = await parseBody(request, bodySchema)
    return Response.json(await buildAlternatives(body.household))
  } catch (error) {
    return toErrorResponse(error)
  }
}

export const maxDuration = 30
