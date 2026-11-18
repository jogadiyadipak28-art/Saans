import { z } from 'zod'
import { buildIndoor } from '@/lib/server/features'
import { parseBody } from '@/lib/server/parse'
import { assertRate } from '@/lib/server/rate'
import { householdSchema } from '@/lib/schemas/household'
import { toErrorResponse } from '@/lib/security/http'

const bodySchema = z.object({ household: householdSchema }).strict()

/**
 * Product surface: room-level indoor hacks, budget-aware.
 * GenAI: short explanation only. Hack list and concentrations come from the engine and curated notes.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertRate(request, 'llm')
    const body = await parseBody(request, bodySchema)
    return Response.json(await buildIndoor(body.household))
  } catch (error) {
    return toErrorResponse(error)
  }
}

export const maxDuration = 30
