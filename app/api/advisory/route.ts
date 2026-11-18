import { z } from 'zod'
import { buildAdvisory } from '@/lib/server/features'
import { parseBody } from '@/lib/server/parse'
import { assertRate } from '@/lib/server/rate'
import { householdSchema } from '@/lib/schemas/household'
import { toErrorResponse } from '@/lib/security/http'

const bodySchema = z
  .object({
    household: householdSchema,
    audience: z.enum(['school', 'housing-society']),
  })
  .strict()

/**
 * Product surface: one-page school or housing-society advisory.
 * GenAI: prose around engine figures and cited notes. No profile is stored.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertRate(request, 'llm')
    const body = await parseBody(request, bodySchema)
    return Response.json(await buildAdvisory(body.household, body.audience))
  } catch (error) {
    return toErrorResponse(error)
  }
}

export const maxDuration = 30
