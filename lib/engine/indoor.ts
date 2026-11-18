import {
  COOKING_SOURCE_UG_PER_H,
  DEPOSITION_BAND,
  DEFAULT_ROOM_VOLUME_M3,
  MEASUREMENT_BAND,
  WINDOW_BANDS,
  type Band,
  type KitchenVentilation,
  type WindowState,
} from './constants'
import { metric, type MetricRange } from './range'

export type IndoorInput = {
  cOut: number
  window: WindowState
  cadrM3h: number
  volumeM3?: number
  sourceUgPerH?: number
}

/** Spec formula with an optional indoor source. S = 0 reproduces C_in = (P · λ · C_out) / (λ + k + Q / V). */
export function steadyStateConcentration(
  penetration: number,
  lambdaPerHour: number,
  depositionPerHour: number,
  cadrM3h: number,
  volumeM3: number,
  cOut: number,
  sourceUgPerH: number,
): number {
  const volume = volumeM3 > 0 ? volumeM3 : DEFAULT_ROOM_VOLUME_M3
  const removal = lambdaPerHour + depositionPerHour + cadrM3h / volume
  if (removal <= 0) return Math.max(0, cOut)
  const generated = sourceUgPerH / volume
  return Math.max(0, (penetration * lambdaPerHour * cOut + generated) / removal)
}

function sampleBands(window: WindowState): { penetration: number; lambda: number; deposition: number }[] {
  const band = WINDOW_BANDS[window]
  const samples: { penetration: number; lambda: number; deposition: number }[] = []
  for (const penetration of bandValues(band.penetration)) {
    for (const lambda of bandValues(band.lambda)) {
      for (const deposition of bandValues(DEPOSITION_BAND)) {
        samples.push({ penetration, lambda, deposition })
      }
    }
  }
  return samples
}

function bandValues(band: Band): number[] {
  return [band.low, band.central, band.high]
}

export function indoorConcentration(input: IndoorInput): MetricRange {
  const volume = input.volumeM3 ?? DEFAULT_ROOM_VOLUME_M3
  const source = input.sourceUgPerH ?? 0
  const cadr = Math.max(0, input.cadrM3h)
  const cOut = Math.max(0, input.cOut)
  const centralBand = WINDOW_BANDS[input.window]
  const central = steadyStateConcentration(
    centralBand.penetration.central,
    centralBand.lambda.central,
    DEPOSITION_BAND.central,
    cadr,
    volume,
    cOut,
    source,
  )
  let low = central
  let high = central
  for (const scale of [MEASUREMENT_BAND.low, MEASUREMENT_BAND.central, MEASUREMENT_BAND.high]) {
    for (const sample of sampleBands(input.window)) {
      const value = steadyStateConcentration(
        sample.penetration,
        sample.lambda,
        sample.deposition,
        cadr,
        volume,
        cOut * scale,
        source,
      )
      low = Math.min(low, value)
      high = Math.max(high, value)
    }
  }
  return metric(low, central, high, 'µg/m³', 1)
}

export function cookingSource(ventilation: KitchenVentilation): Band {
  return COOKING_SOURCE_UG_PER_H[ventilation]
}
