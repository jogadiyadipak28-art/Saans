import {
  ADULT_REST_M3_PER_H,
  CIGARETTE_UG_PER_M3,
  COMMUTE_FACTOR,
  COMMUTE_SPEED_KMH,
  COOKING_CO2E_G_PER_H,
  COOKING_PM25_G_PER_H,
  CO2E_G_PER_KM,
  DIY_FILTER_CADR_M3H,
  FLOOR_OUTDOOR_FACTOR,
  INHALATION_MULTIPLIER,
  MASK_PENETRATION,
  OUTDOOR_LIMIT_PM25,
  PM25_G_PER_KM,
  SEAL_ABOVE_PM25,
  type ActivityLevel,
  type AgeGroup,
  type CommuteMode,
  type CookingFuel,
  type FloorLevel,
  type KitchenVentilation,
  type Members,
  type WindowState,
} from './constants'
import { cookingSource, indoorConcentration } from './indoor'
import { addMetrics, difference, metric, reductionPercent, scaleMetric, type MetricRange } from './range'

export const ACTIVITY_IDS = [
  'sleep',
  'indoor',
  'exercise',
  'school-run',
  'play',
  'commute',
  'cook',
  'ventilate',
] as const
export type ActivityId = (typeof ACTIVITY_IDS)[number]

export type Place = 'indoor' | 'outdoor' | 'commute'

export type HourView = {
  hour: number
  activity: ActivityId
  place: Place
  level: ActivityLevel
  window: WindowState
  masked: boolean
  cooking: boolean
  durationHours: number
  concentration: MetricRange
}

export type DayResult = {
  exposure: MetricRange
  exposureByAge: { age: AgeGroup; count: number; perPerson: MetricRange }[]
  inhaledMicrograms: MetricRange
  twaPm25: MetricRange
  cigaretteEquivalents: MetricRange
  co2eGrams: MetricRange
  pm25Grams: MetricRange
  hours: HourView[]
  howCalculated: string[]
  focusAge: AgeGroup | null
}

type Piece = {
  hour: number
  activity: ActivityId
  place: Place
  level: ActivityLevel
  window: WindowState
  masked: boolean
  cooking: boolean
  duration: number
}

export type EngineInput = {
  members: Members
  hourlyPm25: number[]
  floor: FloorLevel
  windowHabit: WindowState
  commuteMode: CommuteMode
  distanceKm: number
  kitchenVentilation: KitchenVentilation
  cookingFuel: CookingFuel
  purifierCadr: number
  respiratorySensitivity: boolean
  volumeM3?: number
  diyFilter?: boolean
  mask?: boolean
  windowOverride?: WindowState
  commuteModeOverride?: CommuteMode
  /** 1 keeps planned outdoor time. 0 moves that time indoors. */
  outdoorFraction?: number
  variant: 'baseline' | 'optimized'
}

export function outdoorLimit(sensitivity: boolean): number {
  return sensitivity ? OUTDOOR_LIMIT_PM25.sensitive : OUTDOOR_LIMIT_PM25.standard
}

export function windowForHour(pm25: number, habit: WindowState, variant: EngineInput['variant']): WindowState {
  if (variant === 'baseline') return habit
  if (pm25 > SEAL_ABOVE_PM25) return 'sealed'
  if (pm25 > OUTDOOR_LIMIT_PM25.standard) return 'closed'
  return habit === 'open' ? 'open' : 'closed'
}

export function commuteHoursOneWay(mode: CommuteMode, distanceKm: number): number {
  if (mode === 'none' || distanceKm <= 0) return 0
  const speed = COMMUTE_SPEED_KMH[mode]
  if (speed <= 0) return 0
  return Math.min(3, distanceKm / speed)
}

function emptyMembers(): Members {
  return { infant: 0, child: 0, adult: 0, elderly: 0 }
}

function pmAt(hourly: number[], hour: number): number {
  const value = hourly[hour] ?? hourly[hourly.length - 1] ?? 0
  return Math.max(0, value)
}

function cleanestHour(hourly: number[], hours: number[]): number {
  return hours.reduce((best, hour) => (pmAt(hourly, hour) < pmAt(hourly, best) ? hour : best), hours[0] ?? 0)
}

function baseActivity(hour: number, hasChild: boolean): { activity: ActivityId; place: Place; level: ActivityLevel } {
  if (hour <= 5 || hour >= 22) return { activity: 'sleep', place: 'indoor', level: 'resting' }
  if (hour === 6) return { activity: 'exercise', place: 'outdoor', level: 'exercise' }
  if (hour === 7) {
    return hasChild
      ? { activity: 'school-run', place: 'outdoor', level: 'light' }
      : { activity: 'indoor', place: 'indoor', level: 'light' }
  }
  if (hour === 8 || hour === 18) return { activity: 'commute', place: 'commute', level: 'light' }
  if (hour === 13 || hour === 19) return { activity: 'cook', place: 'indoor', level: 'light' }
  if (hour === 16) {
    return hasChild
      ? { activity: 'play', place: 'outdoor', level: 'light' }
      : { activity: 'indoor', place: 'indoor', level: 'light' }
  }
  return { activity: 'indoor', place: 'indoor', level: 'light' }
}

export function buildPieces(input: EngineInput): Piece[] {
  const hourly = input.hourlyPm25.length >= 24 ? input.hourlyPm25.slice(0, 24) : padHours(input.hourlyPm25)
  const hasChild = input.members.child + input.members.infant > 0
  const limit = outdoorLimit(input.respiratorySensitivity)
  const mode = input.commuteModeOverride ?? input.commuteMode
  const oneWay = commuteHoursOneWay(mode, input.distanceKm)
  const pieces: Piece[] = []

  const commuteHours = new Set(oneWay > 0 ? [8, 18] : [])
  let exerciseHour = 6
  let schoolHour = 7
  let playHour = 16
  let ventilateHour = -1
  if (input.variant === 'optimized') {
    exerciseHour = cleanestHour(hourly, [5, 6, 7].filter((hour) => !commuteHours.has(hour)))
    schoolHour = cleanestHour(hourly, [7, 9].filter((hour) => !commuteHours.has(hour)))
    playHour = cleanestHour(hourly, [15, 16, 17])
    const ventCandidate = cleanestHour(hourly, [10, 11, 12, 14, 15])
    if (pmAt(hourly, ventCandidate) <= OUTDOOR_LIMIT_PM25.standard) ventilateHour = ventCandidate
  }

  for (let hour = 0; hour < 24; hour += 1) {
    const pm = pmAt(hourly, hour) * FLOOR_OUTDOOR_FACTOR[input.floor]
    let plan = baseActivity(hour, hasChild)
    if (input.variant === 'optimized' && !commuteHours.has(hour)) {
      if (hour === exerciseHour) plan = { activity: 'exercise', place: 'outdoor', level: 'exercise' }
      else if (hour === 6) plan = { activity: 'indoor', place: 'indoor', level: 'light' }
      if (hasChild && hour === schoolHour) plan = { activity: 'school-run', place: 'outdoor', level: 'light' }
      else if (hasChild && hour === 7) plan = { activity: 'indoor', place: 'indoor', level: 'light' }
      if (hasChild && hour === playHour) plan = { activity: 'play', place: 'outdoor', level: 'light' }
      else if (hasChild && hour === 16 && playHour !== 16) plan = { activity: 'indoor', place: 'indoor', level: 'light' }
      if (hour === ventilateHour && plan.activity === 'indoor') {
        plan = { activity: 'ventilate', place: 'indoor', level: 'light' }
      }
      if (plan.place === 'outdoor' && pm > limit) {
        plan = {
          activity: plan.activity === 'exercise' ? 'exercise' : 'indoor',
          place: 'indoor',
          level: plan.level,
        }
      }
    }

    const cooking = plan.activity === 'cook'
    let window = cooking ? 'closed' : windowForHour(pm, input.windowHabit, input.variant)
    if (plan.activity === 'ventilate') window = 'open'
    if (input.windowOverride && plan.place === 'indoor') window = input.windowOverride

    const outdoorish = plan.place !== 'indoor'
    const masked =
      input.mask === true ||
      (input.variant === 'optimized' && input.mask !== false && outdoorish && pm > limit)

    if ((hour === 8 || hour === 18) && plan.activity === 'commute') {
      const commuteDuration = Math.min(1, oneWay)
      if (commuteDuration <= 0) {
        pieces.push(piece(hour, { activity: 'indoor', place: 'indoor', level: 'light' }, window, false, false, 1))
      } else {
        pieces.push(piece(hour, plan, window, masked, false, commuteDuration))
        if (commuteDuration < 1) {
          pieces.push(
            piece(
              hour,
              { activity: 'indoor', place: 'indoor', level: 'light' },
              windowForHour(pm, input.windowHabit, input.variant),
              false,
              false,
              1 - commuteDuration,
            ),
          )
        }
      }
      continue
    }

    pieces.push(piece(hour, plan, window, masked && plan.place !== 'indoor', cooking, 1))
  }

  return applyOutdoorFraction(pieces, input.outdoorFraction ?? 1, input.windowOverride ?? input.windowHabit)
}

function piece(
  hour: number,
  plan: { activity: ActivityId; place: Place; level: ActivityLevel },
  window: WindowState,
  masked: boolean,
  cooking: boolean,
  duration: number,
): Piece {
  return { hour, ...plan, window, masked, cooking, duration }
}

function applyOutdoorFraction(pieces: Piece[], fraction: number, indoorWindow: WindowState): Piece[] {
  const kept = Math.min(1, Math.max(0, fraction))
  if (kept === 1) return pieces
  const next: Piece[] = []
  for (const item of pieces) {
    if (item.place !== 'outdoor') {
      next.push(item)
      continue
    }
    const outdoorDuration = item.duration * kept
    const indoorDuration = item.duration - outdoorDuration
    if (outdoorDuration > 0.001) next.push({ ...item, duration: outdoorDuration })
    if (indoorDuration > 0.001) {
      next.push({
        ...item,
        place: 'indoor',
        activity: 'indoor',
        window: indoorWindow,
        masked: false,
        cooking: false,
        level: 'light',
        duration: indoorDuration,
      })
    }
  }
  return next
}

function padHours(hourly: number[]): number[] {
  const next = hourly.map((value) => Math.max(0, value))
  while (next.length < 24) next.push(next[next.length - 1] ?? 0)
  return next
}

function concentrationFor(pieceItem: Piece, pm25: number, input: EngineInput): MetricRange {
  const outdoor = Math.max(0, pm25) * FLOOR_OUTDOOR_FACTOR[input.floor]
  const measured = metric(outdoor * 0.85, outdoor, outdoor * 1.15, 'µg/m³', 1)
  if (pieceItem.place === 'outdoor') {
    return pieceItem.masked ? penetrate(measured) : measured
  }
  if (pieceItem.place === 'commute') {
    const factor = COMMUTE_FACTOR[input.commuteModeOverride ?? input.commuteMode]
    const scaled = metric(
      measured.low * factor.low,
      measured.central * factor.central,
      measured.high * factor.high,
      'µg/m³',
      1,
    )
    return pieceItem.masked ? penetrate(scaled) : scaled
  }
  const cadr = Math.max(0, input.purifierCadr) + (input.diyFilter ? DIY_FILTER_CADR_M3H : 0)
  const source = pieceItem.cooking ? cookingSource(input.kitchenVentilation).central : 0
  return indoorConcentration({
    cOut: outdoor,
    window: pieceItem.window,
    cadrM3h: cadr,
    volumeM3: input.volumeM3,
    sourceUgPerH: source,
  })
}

function penetrate(range: MetricRange): MetricRange {
  return metric(
    range.low * MASK_PENETRATION.low,
    range.central * MASK_PENETRATION.central,
    range.high * MASK_PENETRATION.high,
    'µg/m³',
    1,
  )
}

function exposureFor(range: MetricRange, hours: number, age: AgeGroup, level: ActivityLevel): MetricRange {
  if (hours <= 0) return metric(0, 0, 0, 'µg·h/m³', 1)
  const multiplier = INHALATION_MULTIPLIER[age][level]
  return metric(
    range.low * hours * multiplier * 0.9,
    range.central * hours * multiplier,
    range.high * hours * multiplier * 1.1,
    'µg·h/m³',
    1,
  )
}

export function runDay(input: EngineInput): DayResult {
  const hourly = input.hourlyPm25.length >= 24 ? input.hourlyPm25.slice(0, 24) : padHours(input.hourlyPm25)
  const members = { ...emptyMembers(), ...input.members }
  const pieces = buildPieces(input)
  const ages = (Object.keys(members) as AgeGroup[]).filter((age) => members[age] > 0)
  const perAge = new Map<AgeGroup, MetricRange[]>()
  for (const age of ages) perAge.set(age, [])

  const hourMap = new Map<number, { pieces: Piece[]; concentrations: MetricRange[] }>()
  let twaLow = 0
  let twaCentral = 0
  let twaHigh = 0

  for (const item of pieces) {
    const concentration = concentrationFor(item, pmAt(hourly, item.hour), input)
    twaLow += concentration.low * item.duration
    twaCentral += concentration.central * item.duration
    twaHigh += concentration.high * item.duration
    const bucket = hourMap.get(item.hour) ?? { pieces: [], concentrations: [] }
    bucket.pieces.push(item)
    bucket.concentrations.push(concentration)
    hourMap.set(item.hour, bucket)
    for (const age of ages) {
      perAge.get(age)?.push(exposureFor(concentration, item.duration, age, item.level))
    }
  }

  const exposureByAge = ages.map((age) => ({
    age,
    count: members[age],
    perPerson: addMetrics(perAge.get(age) ?? [], 'µg·h/m³', 1),
  }))
  const exposure = addMetrics(
    exposureByAge.flatMap((item) => Array.from({ length: item.count }, () => item.perPerson)),
    'µg·h/m³',
    1,
  )
  const focusAge = pickFocus(members, exposureByAge, input.respiratorySensitivity)
  const twa = metric(twaLow / 24, twaCentral / 24, twaHigh / 24, 'µg/m³', 1)
  const cigarettes = metric(
    twa.low / CIGARETTE_UG_PER_M3,
    twa.central / CIGARETTE_UG_PER_M3,
    twa.high / CIGARETTE_UG_PER_M3,
    'cigarette-equivalents',
    2,
  )
  const mode = input.commuteModeOverride ?? input.commuteMode
  const dailyKm = mode === 'none' ? 0 : Math.max(0, input.distanceKm) * 2
  const cookingHours = pieces.filter((item) => item.cooking).reduce((sum, item) => sum + item.duration, 0)
  const travelCo2 = metric(dailyKm * CO2E_G_PER_KM[mode], dailyKm * CO2E_G_PER_KM[mode], dailyKm * CO2E_G_PER_KM[mode], 'g', 0)
  const cookCo2 = metric(
    cookingHours * COOKING_CO2E_G_PER_H[input.cookingFuel],
    cookingHours * COOKING_CO2E_G_PER_H[input.cookingFuel],
    cookingHours * COOKING_CO2E_G_PER_H[input.cookingFuel],
    'g',
    0,
  )
  const travelPm = dailyKm * PM25_G_PER_KM[mode]
  const cookPm = cookingHours * COOKING_PM25_G_PER_H[input.cookingFuel]
  const hours = [...hourMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, bucket]) => toHourView(hour, bucket.pieces, bucket.concentrations))

  return {
    exposure,
    exposureByAge,
    inhaledMicrograms: scaleMetric(exposure, ADULT_REST_M3_PER_H, 0, 'µg'),
    twaPm25: twa,
    cigaretteEquivalents: cigarettes,
    co2eGrams: addMetrics([travelCo2, cookCo2], 'g', 0),
    pm25Grams: metric(travelPm + cookPm, travelPm + cookPm, travelPm + cookPm, 'g', 3),
    hours,
    focusAge,
    howCalculated: [
      'C_in = (P · λ · C_out + S / V) / (λ + k + Q / V). S is 0 except during cooking hours.',
      `Central window constants follow the ${input.windowHabit} band. Deposition k central is 0.2/h. Room volume defaults to 40 m³.`,
      'Ranges sample penetration, air exchange, deposition, and ±15% on the outdoor measurement. Low ≤ central ≤ high.',
      'Exposure index = Σ concentration × hours × inhalation multiplier, summed across people. Multipliers are relative to an adult at rest (0.5 m³/h).',
      'Inhaled micrograms = exposure index × 0.5 m³/h.',
      `Time-weighted PM2.5 divides Σ(concentration × hours) by 24. Cigarette-equivalents divide that average by ${CIGARETTE_UG_PER_M3} (Berkeley Earth rule of thumb, approximation).`,
      `Floor factor for ${input.floor} is ${FLOOR_OUTDOOR_FACTOR[input.floor]} (approximation, verify).`,
      `Travel emissions use ${mode} at ${CO2E_G_PER_KM[mode]} g CO2e/km and ${PM25_G_PER_KM[mode]} g PM2.5/km × ${dailyKm} km. Cooking uses ${input.cookingFuel}. approximation, verify.`,
      input.variant === 'optimized'
        ? `Optimized day keeps outdoor time only when floor-adjusted PM2.5 is at or below ${outdoorLimit(input.respiratorySensitivity)} µg/m³, and seals the home above ${SEAL_ABOVE_PM25}.`
        : 'Baseline day keeps the household window habit, commute, and outdoor routine even when outdoor air is poor.',
    ],
  }
}

function toHourView(hour: number, pieces: Piece[], concentrations: MetricRange[]): HourView {
  const primary = pieces.reduce((best, item) => (item.duration > best.duration ? item : best), pieces[0]!)
  const special = pieces.find((item) => item.activity !== 'indoor' && item.activity !== 'sleep') ?? primary
  const duration = pieces.reduce((sum, item) => sum + item.duration, 0)
  const concentration = metric(
    weighted(pieces, concentrations, 'low'),
    weighted(pieces, concentrations, 'central'),
    weighted(pieces, concentrations, 'high'),
    'µg/m³',
    1,
  )
  return {
    hour,
    activity: special.activity,
    place: special.place,
    level: special.level,
    window: special.window,
    masked: special.masked,
    cooking: pieces.some((item) => item.cooking),
    durationHours: Math.round(duration * 100) / 100,
    concentration,
  }
}

function weighted(pieces: Piece[], concentrations: MetricRange[], key: 'low' | 'central' | 'high'): number {
  const total = pieces.reduce((sum, item) => sum + item.duration, 0)
  if (total <= 0) return 0
  return pieces.reduce((sum, item, index) => sum + item.duration * (concentrations[index]?.[key] ?? 0), 0) / total
}

function pickFocus(
  members: Members,
  exposureByAge: { age: AgeGroup; perPerson: MetricRange }[],
  sensitivity: boolean,
): AgeGroup | null {
  if (members.infant > 0) return 'infant'
  if (sensitivity && members.elderly > 0) return 'elderly'
  const ranked = [...exposureByAge].sort((a, b) => b.perPerson.central - a.perPerson.central)
  return ranked[0]?.age ?? null
}

export type DayComparison = {
  baseline: DayResult
  scenario: DayResult
  exposureChangePercent: MetricRange
  co2eSavedGrams: MetricRange
  pm25SavedGrams: MetricRange
}

export function compareHousehold(
  input: Omit<EngineInput, 'variant'> & { variant?: EngineInput['variant'] },
): DayComparison {
  const baseline = runDay({ ...input, variant: 'baseline', diyFilter: false, mask: false, windowOverride: undefined, outdoorFraction: 1, commuteModeOverride: undefined })
  const scenario = runDay({ ...input, variant: input.variant ?? 'optimized' })
  return {
    baseline,
    scenario,
    exposureChangePercent: reductionPercent(baseline.exposure, scenario.exposure),
    co2eSavedGrams: difference(baseline.co2eGrams, scenario.co2eGrams, 'g', 0),
    pm25SavedGrams: difference(baseline.pm25Grams, scenario.pm25Grams, 'g', 3),
  }
}
