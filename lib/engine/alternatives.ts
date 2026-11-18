import {
  AVOIDED_BURN_PM25_G,
  COMMUTE_MODES,
  COMMUTE_SPEED_KMH,
  COOKING_CO2E_G_PER_H,
  COOKING_EXTRA_MINUTES,
  COOKING_FUELS,
  COOKING_INR_PER_H,
  COOKING_PM25_G_PER_H,
  CO2E_G_PER_KM,
  INR_PER_KM,
  PM25_G_PER_KM,
  type BudgetLevel,
  type CommuteMode,
  type CookingFuel,
} from './constants'
import { metric, type MetricRange } from './range'

export type Swap = {
  id: string
  group: 'transport' | 'cooking' | 'burning'
  from: string
  to: string
  fitsBudget: boolean
  costInrPerDay: MetricRange
  extraMinutesPerDay: MetricRange
  co2eGramsPerDay: MetricRange
  pm25GramsPerDay: MetricRange
  co2eSavedGrams: number
  pm25SavedGrams: number
  note: string
}

const BUDGET_RANK: Record<BudgetLevel, number> = { none: 0, low: 1, medium: 2, high: 3 }

const MODE_BUDGET: Record<CommuteMode, BudgetLevel> = {
  walk: 'none',
  none: 'none',
  'open-bus': 'low',
  metro: 'low',
  'two-wheeler': 'medium',
  'car-recirc': 'high',
}

const FUEL_BUDGET: Record<CookingFuel, BudgetLevel> = {
  biomass: 'none',
  lpg: 'low',
  png: 'medium',
  induction: 'medium',
}

function fits(required: BudgetLevel, budget: BudgetLevel): boolean {
  return BUDGET_RANK[budget] >= BUDGET_RANK[required]
}

function money(central: number): MetricRange {
  return metric(central * 0.8, central, central * 1.2, 'INR/day', 0)
}

export function transportSwaps(mode: CommuteMode, distanceKm: number, budget: BudgetLevel): Swap[] {
  const dailyKm = mode === 'none' ? 0 : Math.max(0, distanceKm) * 2
  const currentCo2 = dailyKm * CO2E_G_PER_KM[mode]
  const currentPm = dailyKm * PM25_G_PER_KM[mode]
  return COMMUTE_MODES.filter((candidate) => candidate !== mode).map((candidate) => {
    const km = candidate === 'none' ? 0 : dailyKm
    const hours = candidate === 'none' || COMMUTE_SPEED_KMH[candidate] === 0 ? 0 : km / COMMUTE_SPEED_KMH[candidate]
    const currentHours =
      mode === 'none' || COMMUTE_SPEED_KMH[mode] === 0 ? 0 : dailyKm / COMMUTE_SPEED_KMH[mode]
    const co2 = km * CO2E_G_PER_KM[candidate]
    const pm = km * PM25_G_PER_KM[candidate]
    const cost = km * INR_PER_KM[candidate]
    return {
      id: `transport-${mode}-to-${candidate}`,
      group: 'transport' as const,
      from: mode,
      to: candidate,
      fitsBudget: fits(MODE_BUDGET[candidate], budget),
      costInrPerDay: money(cost),
      extraMinutesPerDay: metric((hours - currentHours) * 60, (hours - currentHours) * 60, (hours - currentHours) * 60, 'min', 0),
      co2eGramsPerDay: metric(co2, co2, co2, 'g', 0),
      pm25GramsPerDay: metric(pm, pm, pm, 'g', 3),
      co2eSavedGrams: Math.round(currentCo2 - co2),
      pm25SavedGrams: Math.round((currentPm - pm) * 1000) / 1000,
      note: 'Emission factors are approximations per kilometre, not a measured tailpipe test.',
    }
  })
}

export function cookingSwaps(fuel: CookingFuel, hoursPerDay: number, budget: BudgetLevel): Swap[] {
  const hours = Math.max(0, hoursPerDay)
  const currentCo2 = hours * COOKING_CO2E_G_PER_H[fuel]
  const currentPm = hours * COOKING_PM25_G_PER_H[fuel]
  return COOKING_FUELS.filter((candidate) => candidate !== fuel).map((candidate) => {
    const co2 = hours * COOKING_CO2E_G_PER_H[candidate]
    const pm = hours * COOKING_PM25_G_PER_H[candidate]
    const cost = hours * COOKING_INR_PER_H[candidate]
    const extra = COOKING_EXTRA_MINUTES[candidate] - COOKING_EXTRA_MINUTES[fuel]
    return {
      id: `cooking-${fuel}-to-${candidate}`,
      group: 'cooking' as const,
      from: fuel,
      to: candidate,
      fitsBudget: fits(FUEL_BUDGET[candidate], budget),
      costInrPerDay: money(cost),
      extraMinutesPerDay: metric(extra, extra, extra, 'min', 0),
      co2eGramsPerDay: metric(co2, co2, co2, 'g', 0),
      pm25GramsPerDay: metric(pm, pm, pm, 'g', 3),
      co2eSavedGrams: Math.round(currentCo2 - co2),
      pm25SavedGrams: Math.round((currentPm - pm) * 1000) / 1000,
      note: 'Fuel figures are per hour of cooking. Biomass PM varies widely with stove and wood.',
    }
  })
}

export function noBurningSwap(): Swap {
  return {
    id: 'no-open-burning',
    group: 'burning',
    from: 'open-burning',
    to: 'no-burning',
    fitsBudget: true,
    costInrPerDay: metric(0, 0, 0, 'INR/day', 0),
    extraMinutesPerDay: metric(0, 0, 0, 'min', 0),
    co2eGramsPerDay: metric(0, 0, 0, 'g', 0),
    pm25GramsPerDay: metric(AVOIDED_BURN_PM25_G.low, AVOIDED_BURN_PM25_G.central, AVOIDED_BURN_PM25_G.high, 'g', 0),
    co2eSavedGrams: 0,
    pm25SavedGrams: AVOIDED_BURN_PM25_G.central,
    note: 'Skipping one small waste or leaf fire. The PM range is an approximation, verify, not a measured burn.',
  }
}
