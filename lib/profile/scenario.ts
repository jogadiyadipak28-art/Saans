import type { EngineInput } from '@/lib/engine/day'
import type { Household, ImpactBody } from '@/lib/schemas/household'

export function toEngineInput(household: Household, hourlyPm25: number[], extras?: Partial<ImpactBody>): EngineInput {
  return {
    members: household.members,
    hourlyPm25: hourlyPm25.slice(0, 24),
    floor: household.floor,
    windowHabit: household.windowHabit,
    commuteMode: household.commuteMode,
    distanceKm: household.distanceKm,
    kitchenVentilation: household.kitchenVentilation,
    cookingFuel: household.cookingFuel,
    purifierCadr: extras?.cadrM3h ?? (household.purifierOwned ? household.purifierCadr : 0),
    respiratorySensitivity: household.respiratorySensitivity,
    diyFilter: extras?.diyFilter ?? false,
    mask: extras?.mask,
    windowOverride: extras?.windowOverride,
    commuteModeOverride: extras?.commuteMode,
    outdoorFraction: extras?.outdoorFraction,
    variant: extras?.variant ?? 'optimized',
  }
}
