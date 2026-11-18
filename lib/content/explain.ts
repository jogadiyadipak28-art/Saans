import type { AqiResult } from '@/lib/engine/aqi'
import type { DayComparison } from '@/lib/engine/day'
import { translate, type Lang } from '@/lib/i18n'
import { delimit } from '@/lib/security/sanitize'

export function engineContext(comparison: DayComparison, aqi: AqiResult, pm25: number) {
  return {
    baselineExposure: comparison.baseline.exposure.central,
    planExposure: comparison.scenario.exposure.central,
    reductionPercent: comparison.exposureChangePercent.central,
    cigarettes: comparison.scenario.cigaretteEquivalents.central,
    twa: comparison.scenario.twaPm25.central,
    co2eSaved: comparison.co2eSavedGrams.central,
    pmSaved: comparison.pm25SavedGrams.central,
    aqi: aqi.aqi,
    pm25,
    cigaretteDivisor: 22,
  }
}

export function fallbackNarrative(comparison: DayComparison, lang: Lang, simple: boolean) {
  const reduction = comparison.exposureChangePercent.central
  const summary = [
    translate(lang, reduction >= 0 ? 'brief.reduction' : 'brief.worse', simple, { reduction }),
    translate(lang, 'brief.exposure', simple, {
      exposure: comparison.baseline.exposure.central,
      plan: comparison.scenario.exposure.central,
    }),
  ].join(' ')
  return {
    summary,
    impactExplanation: translate(lang, 'brief.cigarette', simple, { cigs: comparison.scenario.cigaretteEquivalents.central }),
    disclaimer: translate(lang, 'common.notMedical', simple),
    engineFieldsUsed: ['plan.exposure.central', 'comparison.exposureChangePercent.central', 'plan.cigaretteEquivalents.central'],
  }
}

export function userPayload(context: unknown, extra: string): string {
  return `${delimit('engine_payload', JSON.stringify(context))}\n${delimit('task_notes', extra)}`
}
