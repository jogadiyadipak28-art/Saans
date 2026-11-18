/**
 * Documented constants for the Saans impact engine.
 * Values marked "approximation, verify" are planning defaults, not regulatory limits.
 */

export const AGE_GROUPS = ['infant', 'child', 'adult', 'elderly'] as const
export type AgeGroup = (typeof AGE_GROUPS)[number]

export const ACTIVITY_LEVELS = ['resting', 'light', 'exercise'] as const
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number]

export const WINDOW_STATES = ['open', 'closed', 'sealed'] as const
export type WindowState = (typeof WINDOW_STATES)[number]

export const COMMUTE_MODES = ['walk', 'two-wheeler', 'open-bus', 'car-recirc', 'metro', 'none'] as const
export type CommuteMode = (typeof COMMUTE_MODES)[number]

export const COOKING_FUELS = ['lpg', 'biomass', 'induction', 'png'] as const
export type CookingFuel = (typeof COOKING_FUELS)[number]

export const KITCHEN_VENTILATION = ['none', 'exhaust', 'chimney'] as const
export type KitchenVentilation = (typeof KITCHEN_VENTILATION)[number]

export const FLOORS = ['ground', 'mid', 'high'] as const
export type FloorLevel = (typeof FLOORS)[number]

export const BUDGETS = ['none', 'low', 'medium', 'high'] as const
export type BudgetLevel = (typeof BUDGETS)[number]

export type Members = Record<AgeGroup, number>

/**
 * Inhalation multipliers relative to an adult at rest.
 * Adult resting reference is 0.5 m³/h (about 8 L/min), a common exposure-model default.
 * Other cells are scaled from mean short-term inhalation rates in the US EPA
 * Exposure Factors Handbook, Chapter 6, with light ≈ 2× rest and exercise ≈ 4–5× for adults.
 * approximation, verify. Not a medical dose.
 */
export const INHALATION_MULTIPLIER: Record<AgeGroup, Record<ActivityLevel, number>> = {
  infant: { resting: 0.4, light: 0.7, exercise: 1 },
  child: { resting: 0.8, light: 1.6, exercise: 3.2 },
  adult: { resting: 1, light: 2, exercise: 4.5 },
  elderly: { resting: 0.85, light: 1.5, exercise: 2.4 },
}

/** m³/h. Mass (µg) = exposure index (µg·h/m³) × this reference. */
export const ADULT_REST_M3_PER_H = 0.5

/**
 * Berkeley Earth rule of thumb: about 22 µg/m³ of daily average PM2.5 ≈ one cigarette.
 * https://berkeleyearth.org/air-pollution-and-cigarette-equivalence/
 * approximation, verify. This is not a personal risk calculation.
 */
export const CIGARETTE_UG_PER_M3 = 22

/**
 * ±15% band on a measured outdoor concentration so we do not show false precision.
 * approximation, verify.
 */
export const MEASUREMENT_BAND = { low: 0.85, central: 1, high: 1.15 }

/**
 * Steady-state indoor model:
 * C_in = (P · λ · C_out + S / V) / (λ + k + Q / V)
 * With S = 0 this is the infiltration form in the product spec.
 * Bands are sampled; λ is not assumed monotonic.
 * Air-exchange orders of magnitude follow typical residential ACH (open several per hour,
 * closed below 1, sealed lower). approximation, verify.
 * Deposition k for PM2.5 is the often-cited 0.1–0.4 /h indoor aerosol range. approximation, verify.
 */
export const WINDOW_BANDS: Record<
  WindowState,
  { lambda: Band; penetration: Band }
> = {
  open: { lambda: { low: 2, central: 4, high: 6 }, penetration: { low: 0.85, central: 0.95, high: 1 } },
  closed: {
    lambda: { low: 0.4, central: 0.7, high: 1.2 },
    penetration: { low: 0.55, central: 0.75, high: 0.9 },
  },
  sealed: {
    lambda: { low: 0.1, central: 0.25, high: 0.4 },
    penetration: { low: 0.3, central: 0.5, high: 0.65 },
  },
}

export const DEPOSITION_BAND: Band = { low: 0.1, central: 0.2, high: 0.4 }

/** Typical bedroom, about 3.5 m × 4 m × 2.9 m. approximation, verify. */
export const DEFAULT_ROOM_VOLUME_M3 = 40

/**
 * Indoor PM2.5 source strength while cooking, µg/h, after the ventilation the household already has.
 * approximation, verify. Not a lab emission factor.
 */
export const COOKING_SOURCE_UG_PER_H: Record<KitchenVentilation, Band> = {
  none: { low: 8000, central: 20000, high: 40000 },
  exhaust: { low: 4000, central: 10000, high: 20000 },
  chimney: { low: 2000, central: 5000, high: 12000 },
}

/**
 * Single box-fan plus a high-MERV filter, not a full multi-filter Corsi-Rosenthal cube.
 * 180 m³/h central. approximation, verify.
 */
export const DIY_FILTER_CADR_M3H = 180

/**
 * Fraction of outdoor PM2.5 still inhaled with a well-fitted respirator.
 * Central 0.25 means about a 75% reduction. approximation, verify. Not a fit test.
 */
export const MASK_PENETRATION: Band = { low: 0.1, central: 0.25, high: 0.5 }

/**
 * Outdoor concentration multiplier by floor, relative to a mid-floor reading.
 * Ground is closer to traffic; high floors are slightly lower. approximation, verify.
 */
export const FLOOR_OUTDOOR_FACTOR: Record<FloorLevel, number> = {
  ground: 1.08,
  mid: 1,
  high: 0.92,
}

/**
 * In-traffic concentration relative to the neighbourhood outdoor monitor.
 * Two-wheelers and open buses sit in the exhaust plume; recirculating cars and metros are lower.
 * approximation, verify.
 */
export const COMMUTE_FACTOR: Record<CommuteMode, Band> = {
  walk: { low: 1, central: 1.15, high: 1.4 },
  'two-wheeler': { low: 1.3, central: 1.7, high: 2.2 },
  'open-bus': { low: 1.1, central: 1.4, high: 1.8 },
  'car-recirc': { low: 0.35, central: 0.55, high: 0.8 },
  metro: { low: 0.45, central: 0.7, high: 0.95 },
  none: { low: 0, central: 0, high: 0 },
}

/** km/h used only to turn a distance into hours. approximation, verify. */
export const COMMUTE_SPEED_KMH: Record<CommuteMode, number> = {
  walk: 4.5,
  'two-wheeler': 25,
  'open-bus': 18,
  'car-recirc': 22,
  metro: 32,
  none: 0,
}

/**
 * Tailpipe-plus-fuel CO2e, grams per km (per passenger for bus and metro).
 * Scooter: about 2 L/100 km petrol × ~2.3 kg CO2/L. Car: a small petrol car.
 * Bus, metro, and the electric share of induction use rough India grid / occupancy figures.
 * approximation, verify. Not an official inventory factor.
 */
export const CO2E_G_PER_KM: Record<CommuteMode, number> = {
  walk: 0,
  'two-wheeler': 48,
  'open-bus': 68,
  'car-recirc': 150,
  metro: 35,
  none: 0,
}

/** Exhaust or upstream PM2.5, grams per km. approximation, verify. */
export const PM25_G_PER_KM: Record<CommuteMode, number> = {
  walk: 0,
  'two-wheeler': 0.02,
  'open-bus': 0.015,
  'car-recirc': 0.01,
  metro: 0.004,
  none: 0,
}

/** Rupees per km, central fare or fuel. ±20% is applied when a range is shown. approximation, verify. */
export const INR_PER_KM: Record<CommuteMode, number> = {
  walk: 0,
  'two-wheeler': 2.2,
  'open-bus': 1.2,
  'car-recirc': 8,
  metro: 1.5,
  none: 0,
}

/**
 * Cooking-fuel emissions per hour of stove use.
 * LPG: ~0.15 kg/h × ~3 kg CO2/kg. Induction: ~0.7 kWh × ~0.7 kg CO2e/kWh India grid.
 * Biomass PM is the dominant household source and is highly variable.
 * approximation, verify.
 */
export const COOKING_CO2E_G_PER_H: Record<CookingFuel, number> = {
  lpg: 450,
  png: 400,
  induction: 500,
  biomass: 900,
}

export const COOKING_PM25_G_PER_H: Record<CookingFuel, number> = {
  lpg: 0.02,
  png: 0.015,
  induction: 0.001,
  biomass: 0.8,
}

export const COOKING_INR_PER_H: Record<CookingFuel, number> = {
  lpg: 12,
  png: 8,
  induction: 6,
  biomass: 0,
}

/** Extra minutes a day to gather or tend biomass. approximation, verify. */
export const COOKING_EXTRA_MINUTES: Record<CookingFuel, number> = {
  lpg: 0,
  png: 0,
  induction: 0,
  biomass: 40,
}

/**
 * PM2.5 released by skipping one small waste or leaf fire.
 * Wide on purpose. approximation, verify.
 */
export const AVOIDED_BURN_PM25_G: Band = { low: 10, central: 25, high: 50 }

/** PM2.5 µg/m³ at or below this: outdoor time is kept in the optimized day. Sensitivity uses the stricter value. */
export const OUTDOOR_LIMIT_PM25 = { standard: 60, sensitive: 30 }

/** Above this, the optimized day treats the home as sealed rather than merely closed. */
export const SEAL_ABOVE_PM25 = 120

export type Band = { low: number; central: number; high: number }

/**
 * CPCB National Air Quality Index breakpoint table (Central Pollution Control Board, 2014).
 * Sub-index I = ((I_hi - I_lo) / (C_hi - C_lo)) × (C - C_lo) + I_lo.
 * Shared edges (30, 60, …) belong to the lower band so the boundary AQI matches the published category edge.
 * The top concentration of the Severe band is the value that maps to AQI 500.
 * Where the 2014 summary table only says "above X", the cap concentration is marked approximation, verify.
 */
export const AQI_INDEX_BREAKS = [0, 50, 100, 200, 300, 400, 500] as const

export type Pollutant = 'pm25' | 'pm10' | 'no2' | 'so2' | 'o3' | 'co'

export const CPCB_BREAKPOINTS: Record<Pollutant, readonly number[]> = {
  pm25: [0, 30, 60, 90, 120, 250, 380],
  pm10: [0, 50, 100, 250, 350, 430, 510],
  no2: [0, 40, 80, 180, 280, 400, 800],
  so2: [0, 40, 80, 380, 800, 1600, 2400],
  o3: [0, 50, 100, 168, 208, 748, 1000],
  co: [0, 1, 2, 10, 17, 34, 46],
}

export const CPCB_POLLUTANT_UNIT: Record<Pollutant, string> = {
  pm25: 'µg/m³',
  pm10: 'µg/m³',
  no2: 'µg/m³',
  so2: 'µg/m³',
  o3: 'µg/m³',
  co: 'mg/m³',
}

export const CPCB_CATEGORIES = [
  { id: 'good', max: 50, label: 'Good' },
  { id: 'satisfactory', max: 100, label: 'Satisfactory' },
  { id: 'moderate', max: 200, label: 'Moderate' },
  { id: 'poor', max: 300, label: 'Poor' },
  { id: 'very-poor', max: 400, label: 'Very Poor' },
  { id: 'severe', max: 500, label: 'Severe' },
] as const

export type CpcbCategoryId = (typeof CPCB_CATEGORIES)[number]['id']

/** Background and foreground pairs chosen for white or near-white text on a dark chip (contrast ≥ 4.5:1). */
export const CATEGORY_STYLE: Record<CpcbCategoryId, { bg: string; fg: string; icon: string }> = {
  good: { bg: '#0c6b3e', fg: '#ffffff', icon: 'clear' },
  satisfactory: { bg: '#2f6f12', fg: '#ffffff', icon: 'leaf' },
  moderate: { bg: '#6b5300', fg: '#ffffff', icon: 'cloud' },
  poor: { bg: '#8a3d00', fg: '#ffffff', icon: 'mask' },
  'very-poor': { bg: '#8d1c1c', fg: '#ffffff', icon: 'alert' },
  severe: { bg: '#5c1020', fg: '#ffffff', icon: 'severe' },
}
