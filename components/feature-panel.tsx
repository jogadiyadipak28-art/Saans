'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSaans } from '@/components/providers'
import { translate } from '@/lib/i18n'
import type { DayComparison } from '@/lib/engine/day'
import type { MetricRange } from '@/lib/engine/range'
import type { Hack } from '@/lib/content/hacks'
import type { Swap } from '@/lib/engine/alternatives'
import type { Household } from '@/lib/schemas/household'

type FeatureKind = 'plan' | 'indoor' | 'alternatives'
type Citation = { id: string; title: string; source: string; url: string | null }
type FeatureResult = {
  bannerAir?: string | null
  bannerWording?: string | null
  narrative?: { summary?: string; impactExplanation?: string; disclaimer?: string }
  comparison?: DayComparison
  aqi?: { aqi: number; category: string }
  indoorNow?: MetricRange
  indoorSealed?: MetricRange
  indoorDiy?: MetricRange
  hacks?: Hack[]
  swaps?: Swap[]
  citations?: Citation[]
}

const TITLE_KEY: Record<FeatureKind, string> = { plan: 'planner.title', indoor: 'hacks.title', alternatives: 'alts.title' }
const MODE: Record<Household['commuteMode'], string> = {
  walk: 'walking', 'two-wheeler': 'a two-wheeler', 'open-bus': 'an open bus', 'car-recirc': 'a recirculating car', metro: 'the metro', none: 'no regular commute',
}
const FUEL: Record<Household['cookingFuel'], string> = { lpg: 'LPG', biomass: 'wood or dung', induction: 'induction', png: 'piped gas' }
const SWAP_LABEL: Record<string, string> = { walk: 'walking', 'two-wheeler': 'a two-wheeler', 'open-bus': 'an open bus', 'car-recirc': 'a recirculating car', metro: 'the metro', none: 'no commute', lpg: 'LPG', biomass: 'wood or dung', induction: 'induction', png: 'piped gas', 'open-burning': 'open burning', 'no-burning': 'no open burning' }

export function FeaturePanel({ kind }: { kind: FeatureKind }) {
  const { ready, profile, prefs } = useSaans()
  const title = translate(prefs.language, TITLE_KEY[kind], prefs.simple)
  const [result, setResult] = useState<FeatureResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!ready || !profile) return
    let active = true
    fetch(`/api/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ household: { ...profile, language: prefs.language } }) })
      .then(async (response) => { if (!response.ok) throw new Error('Request failed'); return response.json() as Promise<FeatureResult> })
      .then((data) => { if (active) { setResult(data); setError('') } })
      .catch(() => { if (active) setError('Saans could not load this right now. Please try again.') })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [attempt, kind, prefs.language, profile, ready])
  if (!ready) return <p role="status">Loading your saved preferences…</p>
  if (!profile) return <section className="grid gap-3"><h1 className="text-3xl font-semibold">{title}</h1><p>Set a location and household profile to get a personalized view.</p><Link className="btn w-fit" href="/">Set up Saans</Link></section>
  return <section className="grid gap-5">
    <header><p className="text-sm font-semibold text-teal">{profile.locationLabel.toUpperCase()}</p><h1 className="mt-1 text-3xl font-semibold">{title}</h1><p className="mt-2 max-w-3xl text-muted">{translate(prefs.language, 'common.engineNote', prefs.simple)}</p></header>
    {busy ? <p role="status" aria-live="polite">Preparing your guidance…</p> : null}
    {error ? <p role="alert" className="rounded-lg border border-severe p-4">{error} <button className="underline" onClick={() => { setBusy(true); setAttempt((value) => value + 1) }}>Try again</button></p> : null}
    {result ? <>
      <div className="grid gap-2" aria-live="polite">
        {result.bannerAir ? <p role="status" className="rounded-lg border border-severe bg-card p-3 font-semibold">{result.bannerAir}</p> : null}
        {result.bannerWording ? <p role="status" className="rounded-lg border border-line bg-card p-3">{result.bannerWording}</p> : null}
      </div>
      {kind === 'plan' ? <PlanView data={result} profile={profile} /> : null}
      {kind === 'indoor' ? <IndoorView data={result} /> : null}
      {kind === 'alternatives' ? <AlternativesView data={result} /> : null}
      <Sources citations={result.citations ?? []} />
    </> : null}
    <p className="text-sm text-muted">General information only; this is not medical advice. Estimates are approximate and depend on the assumptions shown.</p>
  </section>
}

function PlanView({ data, profile }: { data: FeatureResult; profile: Household }) {
  const comparison = data.comparison
  const peopleNeedingExtraCare = profile.members.infant + profile.members.child + profile.members.elderly > 0 || profile.respiratorySensitivity
  const steps = [
    data.aqi && data.aqi.aqi > 100
      ? 'Check Today’s air before leaving. Move outdoor exercise and optional errands to a lower reading period, or keep them indoors.'
      : 'Check Today’s air before leaving and use the forecast to choose a lower-reading period for outdoor exercise.',
    peopleNeedingExtraCare
      ? 'Your household includes someone who may be more affected by poor air. Keep strenuous outdoor activity flexible and follow local health guidance.'
      : 'Combine errands where practical to reduce extra trips and time in traffic.',
    profile.commuteMode === 'none'
      ? 'No regular commute is saved for this household. Keep optional trips short on higher-pollution periods.'
      : `Your usual commute is ${MODE[profile.commuteMode]}. Compare lower-emission options on Alternatives and combine trips when practical.`,
    profile.kitchenVentilation === 'none'
      ? `You have no kitchen fan saved. Keep the bedroom door closed while cooking with ${FUEL[profile.cookingFuel]}, and avoid open-flame waste burning.`
      : `Run your existing ${profile.kitchenVentilation === 'exhaust' ? 'exhaust fan' : 'chimney'} while cooking with ${FUEL[profile.cookingFuel]}; keep the bedroom door closed while cooking.`,
    profile.windowHabit === 'open'
      ? 'When outdoor readings are high, keep windows closed; ventilate when the forecast shows cleaner air.'
      : 'Keep windows closed during higher readings; ventilate when the forecast shows cleaner air.',
  ]
  return <div className="grid gap-4">
    <section className="rounded-xl border border-line bg-card p-5"><h2 className="text-xl font-semibold">Your plan for today</h2><p className="mt-2">{data.narrative?.summary ?? 'Use the steps below to reduce avoidable exposure and emissions today.'}</p>{data.narrative?.impactExplanation ? <p className="mt-3">{data.narrative.impactExplanation}</p> : null}
      <ol className="mt-4 grid list-decimal gap-3 pl-6">{steps.map((step) => <li key={step}>{step}</li>)}</ol>
    </section>
    {comparison ? <section className="grid gap-3"><h2 className="text-xl font-semibold">Estimated impact of the plan</h2><p className="text-sm text-muted">Compare the modeled day with your usual routine. These are approximate ranges, not health predictions. A negative exposure reduction means some modeled cases increase exposure. This plan changes activity and exposure assumptions but keeps your saved commute and cooking fuel; use <Link className="underline" href="/alternatives">Alternatives</Link> to compare emissions-saving swaps.</p><div className="grid gap-3 sm:grid-cols-2"><Metric title="Estimated exposure reduction" range={comparison.exposureChangePercent} /><Metric title="CO₂e saved per day" range={comparison.co2eSavedGrams} /><Metric title="PM2.5 emissions saved per day" range={comparison.pm25SavedGrams} /></div></section> : null}
  </div>
}

function IndoorView({ data }: { data: FeatureResult }) {
  return <div className="grid gap-4">
    {data.narrative?.summary ? <section className="rounded-xl border border-line bg-card p-5"><h2 className="text-xl font-semibold">Start with these steps</h2><p className="mt-2">{data.narrative.summary}</p></section> : null}
    {data.indoorNow || data.indoorSealed || data.indoorDiy ? <section className="grid gap-3"><h2 className="text-xl font-semibold">Estimated indoor PM2.5</h2><div className="grid gap-3 sm:grid-cols-3">{data.indoorNow ? <Metric title="With your usual window setting" range={data.indoorNow} /> : null}{data.indoorSealed ? <Metric title="If windows are sealed" range={data.indoorSealed} /> : null}{data.indoorDiy ? <Metric title="If using an existing fan and filter" range={data.indoorDiy} /> : null}</div><p className="text-sm text-muted">Model estimates only. The fan-and-filter estimate assumes a filter setup is already available; it is not a purchase recommendation.</p></section> : null}
    {data.hacks?.length ? <section className="grid gap-3"><h2 className="text-xl font-semibold">Things to do at home</h2><ol className="grid gap-3 sm:grid-cols-2">{data.hacks.map((hack) => <li key={hack.id} className="rounded-xl border border-line bg-card p-4"><h3 className="font-semibold">{hack.title}</h3><p className="mt-2">{hack.body}</p><p className="mt-2 text-sm text-muted">{hack.fitsBudget ? 'Fits your selected budget' : 'Optional; may be outside your selected budget'}</p></li>)}</ol></section> : null}
  </div>
}

function AlternativesView({ data }: { data: FeatureResult }) {
  const swaps = data.swaps ?? []
  const groups = [
    ['transport', 'Getting around'],
    ['cooking', 'Cooking fuel'],
    ['burning', 'Waste and open burning'],
  ] as const
  return <div className="grid gap-4">
    {data.narrative?.summary ? <section className="rounded-xl border border-line bg-card p-5"><h2 className="text-xl font-semibold">Your lower-emission options</h2><p className="mt-2">{data.narrative.summary}</p></section> : null}
    {groups.map(([group, heading]) => {
      const choices = swaps.filter((swap) => swap.group === group)
      if (!choices.length) return null
      return <section key={group} className="grid gap-3"><h2 className="text-xl font-semibold">{heading}</h2><ul className="grid gap-3 sm:grid-cols-2">{choices.map((swap) => <li key={swap.id} className="rounded-xl border border-line bg-card p-4"><h3 className="font-semibold">{swap.group === 'burning' ? 'Avoid open burning' : `From ${SWAP_LABEL[swap.from] ?? swap.from} to ${SWAP_LABEL[swap.to] ?? swap.to}`}</h3><p className="mt-2 text-sm">{swap.fitsBudget ? 'Fits your selected budget' : 'May be outside your selected budget'}</p><dl className="mt-3 grid gap-2 text-sm"><div><dt className="font-semibold">Estimated CO₂e reduction</dt><dd>{signed(swap.co2eSavedGrams)} g/day</dd></div><div><dt className="font-semibold">Estimated PM2.5 emissions reduction</dt><dd>{signed(swap.pm25SavedGrams)} g/day</dd></div><div><dt className="font-semibold">Estimated added time</dt><dd>{signed(swap.extraMinutesPerDay.central)} min/day</dd></div><div><dt className="font-semibold">Estimated cost</dt><dd>{formatRange(swap.costInrPerDay)}</dd></div></dl><p className="mt-3 text-sm text-muted">{swap.note}</p></li>)}</ul></section>
    })}
  </div>
}

function Metric({ title, range }: { title: string; range: MetricRange }) {
  return <article className="rounded-xl border border-line bg-card p-4"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-xl tabular-nums">{formatRange(range)}</p><p className="mt-1 text-sm text-muted">Approximate low-to-high range; central estimate {range.central} {range.unit}.</p></article>
}

function formatRange(range: MetricRange): string { return `${range.low}–${range.high} ${range.unit}` }
function signed(value: number): string { return `${value > 0 ? '+' : ''}${value}` }

function Sources({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null
  return <section className="rounded-xl border border-line bg-card p-4"><h2 className="font-semibold">Sources for these suggestions</h2><ul className="mt-2 grid gap-2">{citations.map((citation) => <li key={citation.id}>{citation.url ? <a className="underline" href={citation.url} target="_blank" rel="noreferrer">{citation.title}</a> : citation.title}<span className="text-muted"> · {citation.source}</span></li>)}</ul></section>
}
