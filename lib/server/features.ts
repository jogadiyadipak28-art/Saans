import { z } from 'zod'
import { loadAir, next24Pm25 } from '@/lib/air/client'
import { compareHousehold } from '@/lib/engine/day'
import { cookingSwaps, noBurningSwap, transportSwaps } from '@/lib/engine/alternatives'
import { indoorConcentration } from '@/lib/engine/indoor'
import { FLOOR_OUTDOOR_FACTOR } from '@/lib/engine/constants'
import { engineContext, fallbackNarrative, userPayload } from '@/lib/content/explain'
import { buildHacks } from '@/lib/content/hacks'
import { narrate } from '@/lib/server/narrate'
import { householdSchema } from '@/lib/schemas/household'
import { toEngineInput } from '@/lib/profile/scenario'
import { retrieve } from '@/lib/rag/retrieve'
import { sanitizeCitation } from '@/lib/security/sanitize'
import { PROMPT_VERSION } from '@/lib/ai/prompts'
import { categoryKey, translate } from '@/lib/i18n'

const narrativeSchema = z
  .object({
    summary: z.string().min(1).max(800),
    impactExplanation: z.string().min(1).max(800),
    disclaimer: z.string().min(1).max(300),
    engineFieldsUsed: z.array(z.string().max(80)).max(12),
  })
  .strict()

const blurbSchema = z
  .object({
    summary: z.string().min(1).max(800),
    disclaimer: z.string().min(1).max(300),
    engineFieldsUsed: z.array(z.string().max(80)).max(12),
  })
  .strict()

const advisorySchema = z
  .object({
    title: z.string().min(1).max(140),
    paragraphs: z.array(z.string().min(1).max(500)).min(1).max(5),
    actions: z.array(z.string().min(1).max(200)).min(1).max(6),
    disclaimer: z.string().min(1).max(300),
    engineFieldsUsed: z.array(z.string().max(80)).max(12),
  })
  .strict()

function cites(query: string) {
  return retrieve(query, 4).map((doc) => sanitizeCitation({ id: doc.id, title: doc.title, source: doc.source, url: doc.url }))
}

function wordingStatus(household: z.infer<typeof householdSchema>, source: 'model' | 'fallback') {
  if (!household.shareOptIn) return translate(household.language, 'banner.aiOff')
  return source === 'fallback' ? translate(household.language, 'banner.wordingDemo') : null
}

export async function buildPlan(household: z.infer<typeof householdSchema>) {
  const air = await loadAir(household.latitude, household.longitude)
  const hourly = next24Pm25(air.snapshot)
  const comparison = compareHousehold(toEngineInput(household, hourly))
  const context = engineContext(comparison, air.aqi, air.snapshot.current.pm25)
  const fallback = fallbackNarrative(comparison, household.language, false)
  const worded = await narrate({
    lang: household.language,
    simple: false,
    schema: narrativeSchema,
    fallback,
    context,
    maxTokens: 700,
    task: userPayload(context, 'Explain the stricter day and its impact. Do not invent a schedule.'),
    textOf: (value) => `${value.summary} ${value.impactExplanation} ${value.disclaimer}`,
    allowLlm: household.shareOptIn,
  })
  return {
    promptVersion: PROMPT_VERSION,
    airSource: air.snapshot.source,
    narrativeSource: worded.source,
    repaired: worded.repaired,
    bannerAir: air.banner,
    bannerWording: wordingStatus(household, worded.source),
    aqi: air.aqi,
    snapshot: air.snapshot,
    hourlyPm25: hourly,
    comparison,
    narrative: worded.data,
    citations: cites('daily routine windows commute cooking'),
  }
}

export async function buildIndoor(household: z.infer<typeof householdSchema>) {
  const air = await loadAir(household.latitude, household.longitude)
  const outdoor = air.snapshot.current.pm25 * FLOOR_OUTDOOR_FACTOR[household.floor]
  const cadr = household.purifierOwned ? household.purifierCadr : 0
  const indoorNow = indoorConcentration({ cOut: outdoor, window: household.windowHabit, cadrM3h: cadr })
  const indoorSealed = indoorConcentration({ cOut: outdoor, window: 'sealed', cadrM3h: cadr })
  const indoorDiy = indoorConcentration({ cOut: outdoor, window: household.windowHabit, cadrM3h: cadr + 180 })
  const context = { indoorNow: indoorNow.central, indoorSealed: indoorSealed.central, indoorDiy: indoorDiy.central, pm25: air.snapshot.current.pm25 }
  const fallback = {
    summary: translate(household.language, 'hacks.summary', false, { before: indoorNow.central, after: indoorSealed.central }),
    disclaimer: translate(household.language, 'common.notMedical'),
    engineFieldsUsed: ['indoor.now.central', 'indoor.sealed.central', 'indoor.diy.central'],
  }
  const worded = await narrate({
    lang: household.language,
    simple: false,
    schema: blurbSchema,
    fallback,
    context,
    maxTokens: 500,
    task: userPayload(context, 'Explain indoor steps without assuming a new purifier purchase unless the payload shows a high budget elsewhere. The server attaches the hack list.'),
    textOf: (value) => `${value.summary} ${value.disclaimer}`,
    allowLlm: household.shareOptIn,
  })
  return {
    promptVersion: PROMPT_VERSION,
    airSource: air.snapshot.source,
    narrativeSource: worded.source,
    bannerAir: air.banner,
    bannerWording: wordingStatus(household, worded.source),
    indoorNow,
    indoorSealed,
    indoorDiy,
      hacks: buildHacks({ budget: household.budget, purifierOwned: household.purifierOwned, language: household.language }),
    narrative: worded.data,
    citations: cites('indoor seal filter myth cooking'),
  }
}

export async function buildAlternatives(household: z.infer<typeof householdSchema>) {
  const swaps = [
    ...transportSwaps(household.commuteMode, household.distanceKm, household.budget),
    ...cookingSwaps(household.cookingFuel, 2, household.budget),
    noBurningSwap(),
  ]
  const context = {
    co2SavedWalk: swaps.find((swap) => swap.to === 'walk')?.co2eSavedGrams ?? 0,
    pmSaved: swaps.find((swap) => swap.group === 'burning')?.pm25SavedGrams ?? 0,
  }
  const fallback = {
    summary: translate(household.language, 'alts.summary'),
    disclaimer: translate(household.language, 'common.notMedical'),
    engineFieldsUsed: ['swaps.co2eSavedGrams', 'swaps.pm25SavedGrams'],
  }
  const worded = await narrate({
    lang: household.language,
    simple: false,
    schema: blurbSchema,
    fallback,
    context,
    maxTokens: 500,
    task: userPayload(context, 'Introduce the transport, fuel, and no-burn swaps. The numbers stay in the engine table.'),
    textOf: (value) => `${value.summary} ${value.disclaimer}`,
    allowLlm: household.shareOptIn,
  })
  return {
    promptVersion: PROMPT_VERSION,
    narrativeSource: worded.source,
    bannerWording: wordingStatus(household, worded.source),
    swaps,
    narrative: worded.data,
    citations: cites('transport cooking burning fuel'),
  }
}

export async function buildAdvisory(household: z.infer<typeof householdSchema>, audience: 'school' | 'housing-society') {
  const air = await loadAir(household.latitude, household.longitude)
  const hourly = next24Pm25(air.snapshot)
  const comparison = compareHousehold(toEngineInput(household, hourly))
  const context = engineContext(comparison, air.aqi, air.snapshot.current.pm25)
  const who = audience === 'school' ? 'school' : 'housing society'
  const localizedCategory = translate(household.language, categoryKey(air.aqi.category))
  const fallback = {
    title: translate(household.language, 'advisory.title', false, { place: household.locationLabel }),
    paragraphs: [
      translate(household.language, 'advisory.paragraph', false, { aqi: air.aqi.aqi, category: localizedCategory, reduction: comparison.exposureChangePercent.central }),
    ],
    actions: [
      translate(household.language, 'advisory.action1'),
      translate(household.language, 'advisory.action2'),
      translate(household.language, 'advisory.action3'),
    ],
    disclaimer: translate(household.language, 'common.notMedical'),
    engineFieldsUsed: ['aqi.aqi', 'comparison.exposureChangePercent.central'],
  }
  const worded = await narrate({
    lang: household.language,
    simple: false,
    schema: advisorySchema,
    fallback,
    context,
    maxTokens: 800,
    task: userPayload(context, `Write a one-page advisory for a ${who}. No diagnosis.`),
    textOf: (value) => `${value.title} ${value.paragraphs.join(' ')} ${value.actions.join(' ')} ${value.disclaimer}`,
    allowLlm: household.shareOptIn,
  })
  return {
    promptVersion: PROMPT_VERSION,
    airSource: air.snapshot.source,
    narrativeSource: worded.source,
    bannerAir: air.banner,
    bannerWording: wordingStatus(household, worded.source),
    aqi: air.aqi,
    comparison,
    advisory: worded.data,
    citations: cites(audience === 'school' ? 'school advisory' : 'housing society burning'),
  }
}
