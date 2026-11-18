import { loadAir } from '@/lib/air/client'
import { cpcbAqi } from '@/lib/engine/aqi'
import { assertRate } from '@/lib/server/rate'
import { parseQueryNumber } from '@/lib/server/parse'
import { HttpError, toErrorResponse } from '@/lib/security/http'

export const runtime = 'nodejs'

/**
 * Product surface: Today's Air Brief.
 * GenAI: none. Live CAMS data via Open-Meteo, or a labeled demo snapshot.
 * CPCB category is computed in the deterministic engine.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    assertRate(request, 'air')
    const url = new URL(request.url)
    const keys = [...url.searchParams.keys()]
    if (keys.some((key) => key !== 'lat' && key !== 'lon') || keys.filter((key) => key === 'lat').length !== 1 || keys.filter((key) => key === 'lon').length !== 1) {
      throw new HttpError(400, 'Check the form and try again.')
    }
    const latitude = parseQueryNumber(url.searchParams.get('lat'), 'lat')
    const longitude = parseQueryNumber(url.searchParams.get('lon'), 'lon')
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return Response.json({ error: 'Check the form and try again.' }, { status: 400 })
    }
    const air = await loadAir(latitude, longitude)
    return Response.json({ ...air, method: cpcbAqi.name })
  } catch (error) {
    return toErrorResponse(error)
  }
}
