import { compareHousehold } from '@/lib/engine/day'
import { parseBody } from '@/lib/server/parse'
import { assertRate } from '@/lib/server/rate'
import { impactBodySchema } from '@/lib/schemas/household'
import { toEngineInput } from '@/lib/profile/scenario'
import { toErrorResponse } from '@/lib/security/http'

/**
 * Product surface: server check for the impact simulator.
 * GenAI: none. Same pure engine the browser imports while a slider moves.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertRate(request, 'air')
    const body = await parseBody(request, impactBodySchema)
    const comparison = compareHousehold(toEngineInput(body.household, body.hourlyPm25, body))
    return Response.json({ comparison, source: 'engine' })
  } catch (error) {
    return toErrorResponse(error)
  }
}
