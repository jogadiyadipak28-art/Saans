import { z } from 'zod'
import { buildPlan } from '@/lib/server/features'
import { parseBody } from '@/lib/server/parse'
import { assertRate } from '@/lib/server/rate'
import { householdSchema } from '@/lib/schemas/household'
import { toErrorResponse } from '@/lib/security/http'

const bodySchema = z.object({ household: householdSchema }).strict()

/**
 * Product surface: low-emission daily planner.
 * GenAI: wording only, after the impact engine builds the day. Zod-validated JSON, one repair, then a labeled fallback.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertRate(request, 'llm')
    const body = await parseBody(request, bodySchema)
    return Response.json(await buildPlan(body.household))
  } catch (error) {
    return toErrorResponse(error)
  }
}

export const maxDuration = 30
