import type { Household } from '@/lib/schemas/household'

/** Includes only coarse household details, and only after explicit model-sharing opt-in. */
export function householdContext(household?: Household): string {
  if (!household?.shareOptIn) return 'No household saved.'
  return JSON.stringify({
    members: household.members,
    budget: household.budget,
    sensitivity: household.respiratorySensitivity,
  })
}
