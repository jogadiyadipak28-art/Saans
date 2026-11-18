import { z } from 'zod'

export const memberSchema = z
  .object({
    infant: z.number().int().min(0).max(8),
    child: z.number().int().min(0).max(8),
    adult: z.number().int().min(0).max(8),
    elderly: z.number().int().min(0).max(8),
  })
  .strict()

export const householdSchema = z
  .object({
    locationLabel: z.string().trim().min(2).max(80),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    locationPrecision: z.enum(['city', 'pincode', 'preset']),
    floor: z.enum(['ground', 'mid', 'high']),
    windowHabit: z.enum(['open', 'closed', 'sealed']),
    kitchenVentilation: z.enum(['none', 'exhaust', 'chimney']),
    cookingFuel: z.enum(['lpg', 'biomass', 'induction', 'png']),
    commuteMode: z.enum(['walk', 'two-wheeler', 'open-bus', 'car-recirc', 'metro', 'none']),
    distanceKm: z.number().min(0).max(40),
    members: memberSchema,
    respiratorySensitivity: z.boolean(),
    purifierOwned: z.boolean(),
    purifierCadr: z.number().min(0).max(800),
    budget: z.enum(['none', 'low', 'medium', 'high']),
    language: z.enum(['en', 'hi', 'gu']),
    shareOptIn: z.boolean(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const total = value.members.infant + value.members.child + value.members.adult + value.members.elderly
    if (total < 1) {
      ctx.addIssue({ code: 'custom', message: 'At least one person is required', path: ['members'] })
    }
    if (!value.purifierOwned && value.purifierCadr !== 0) {
      ctx.addIssue({ code: 'custom', message: 'CADR is only set when a purifier is owned', path: ['purifierCadr'] })
    }
    if (value.purifierOwned && value.purifierCadr < 50) {
      ctx.addIssue({ code: 'custom', message: 'Owned purifier needs a CADR', path: ['purifierCadr'] })
    }
  })

export type Household = z.infer<typeof householdSchema>

export const hourlySchema = z.array(z.number().min(0).max(1500)).min(24).max(48)

export const impactBodySchema = z
  .object({
    household: householdSchema,
    hourlyPm25: hourlySchema,
    windowOverride: z.enum(['open', 'closed', 'sealed']).optional(),
    cadrM3h: z.number().min(0).max(800).optional(),
    mask: z.boolean().optional(),
    commuteMode: z.enum(['walk', 'two-wheeler', 'open-bus', 'car-recirc', 'metro', 'none']).optional(),
    outdoorFraction: z.number().min(0).max(1).optional(),
    diyFilter: z.boolean().optional(),
    variant: z.enum(['baseline', 'optimized']).optional(),
  })
  .strict()

export type ImpactBody = z.infer<typeof impactBodySchema>
