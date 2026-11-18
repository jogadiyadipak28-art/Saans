import {
  AQI_INDEX_BREAKS,
  CATEGORY_STYLE,
  CPCB_BREAKPOINTS,
  CPCB_CATEGORIES,
  CPCB_POLLUTANT_UNIT,
  type CpcbCategoryId,
  type Pollutant,
} from './constants'

export type AqiSubIndex = {
  pollutant: Pollutant
  concentration: number
  unit: string
  aqi: number
}

export type AqiResult = {
  aqi: number
  category: CpcbCategoryId
  label: string
  icon: string
  color: string
  textColor: string
  dominant: Pollutant | null
  subIndices: AqiSubIndex[]
  howCalculated: string[]
}

export function categoryForIndex(aqi: number): CpcbCategoryId {
  const safe = Math.min(500, Math.max(0, aqi))
  const found = CPCB_CATEGORIES.find((category) => safe <= category.max)
  return found?.id ?? 'severe'
}

/**
 * Linear CPCB sub-index. Concentrations on a breakpoint map to that breakpoint's AQI.
 * Above the last published cap, the index stays at 500.
 */
export function subIndex(pollutant: Pollutant, concentration: number): number {
  if (!Number.isFinite(concentration) || concentration < 0) {
    throw new Error(`Concentration for ${pollutant} must be a non-negative finite number`)
  }
  const concentrations = CPCB_BREAKPOINTS[pollutant]
  const last = concentrations.length - 1
  if (concentration >= (concentrations[last] ?? 0)) return 500

  let band = 0
  for (let index = 0; index < last; index += 1) {
    const high = concentrations[index + 1] ?? 0
    if (concentration <= high) {
      band = index
      break
    }
  }
  const cLow = concentrations[band] ?? 0
  const cHigh = concentrations[band + 1] ?? cLow
  const iLow = AQI_INDEX_BREAKS[band] ?? 0
  const iHigh = AQI_INDEX_BREAKS[band + 1] ?? iLow
  const span = cHigh - cLow
  const raw = span === 0 ? iLow : ((iHigh - iLow) / span) * (concentration - cLow) + iLow
  return Math.min(500, Math.max(0, Math.round(raw)))
}

export function cpcbAqi(readings: Partial<Record<Pollutant, number>>): AqiResult {
  const subIndices: AqiSubIndex[] = []
  for (const pollutant of Object.keys(CPCB_BREAKPOINTS) as Pollutant[]) {
    const concentration = readings[pollutant]
    if (concentration === undefined || Number.isNaN(concentration)) continue
    subIndices.push({
      pollutant,
      concentration,
      unit: CPCB_POLLUTANT_UNIT[pollutant],
      aqi: subIndex(pollutant, concentration),
    })
  }
  const dominant = subIndices.reduce<AqiSubIndex | null>(
    (best, item) => (best === null || item.aqi > best.aqi ? item : best),
    null,
  )
  const aqi = dominant?.aqi ?? 0
  const category = categoryForIndex(aqi)
  const style = CATEGORY_STYLE[category]
  const label = CPCB_CATEGORIES.find((item) => item.id === category)?.label ?? category
  return {
    aqi,
    category,
    label,
    icon: style.icon,
    color: style.bg,
    textColor: style.fg,
    dominant: dominant?.pollutant ?? null,
    subIndices,
    howCalculated: [
      'CPCB sub-index uses the official breakpoint table: I = ((I_hi - I_lo) / (C_hi - C_lo)) × (C - C_lo) + I_lo.',
      'The overall index is the highest sub-index. A category is Good ≤50, Satisfactory ≤100, Moderate ≤200, Poor ≤300, Very Poor ≤400, otherwise Severe.',
      'CO is converted from µg/m³ to mg/m³ before it is compared with the CPCB carbon monoxide breakpoints.',
      'Where a Severe-band upper concentration was published only as "above", the cap that maps to 500 is an approximation, verify.',
    ],
  }
}
