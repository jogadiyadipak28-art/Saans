'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSaans } from '@/components/providers'
import { next24Pm25, type AirPayload } from '@/lib/air/client'
import { compareHousehold } from '@/lib/engine/day'
import type { MetricRange } from '@/lib/engine/range'
import { toEngineInput } from '@/lib/profile/scenario'
import { translate } from '@/lib/i18n'

export function Simulator() {
  const { ready, profile, prefs } = useSaans()
  const t = (key: string) => translate(prefs.language, key, prefs.simple)
  const [air, setAir] = useState<AirPayload | null>(null)
  const [sealed, setSealed] = useState(false)
  const [filter, setFilter] = useState(false)
  const [outdoor, setOutdoor] = useState(1)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!profile) return
    let active = true
    fetch(`/api/air?lat=${profile.latitude}&lon=${profile.longitude}`).then(async (response) => {
      if (!response.ok) throw new Error('air')
      return response.json() as Promise<AirPayload>
    }).then((value) => { if (active) setAir(value) }).catch(() => { if (active) setError('Air data is not available yet. Please retry.') })
    return () => { active = false }
  }, [profile])
  const hourly = air ? next24Pm25(air.snapshot) : null
  const result = useMemo(() => {
    if (!profile || !hourly) return null
    return compareHousehold(toEngineInput(profile, hourly, { windowOverride: sealed ? 'sealed' : undefined, diyFilter: filter, outdoorFraction: outdoor }))
  }, [profile, hourly, sealed, filter, outdoor])
  if (!ready) return <p role="status">Loading…</p>
  if (!profile) return <p>Set up your household first. <Link className="underline" href="/">Go to setup</Link></p>
  return <section className="grid gap-5"><header><h1 className="mt-1 text-3xl font-semibold">{t('sim.title')}</h1><p className="mt-2 text-muted">{t('common.engineNote')} {t('common.notMedical')}</p></header>
    {air?.banner ? <p className="rounded-lg border border-amber-700 bg-amber-50 p-3 text-amber-950" role="status">{air.banner}</p> : null}{error ? <p role="alert">{error}</p> : null}
    <div className="grid gap-3 rounded-xl border border-line bg-card p-4">
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={sealed} onChange={(event) => setSealed(event.target.checked)} /> {t('sim.window')}</label>
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={filter} onChange={(event) => setFilter(event.target.checked)} /> {t('sim.diy')}</label>
      <label className="grid gap-2">{t('sim.outdoor')}: {Math.round(outdoor * 100)}%<input aria-label={t('sim.outdoor')} type="range" min="0" max="100" step="5" value={Math.round(outdoor * 100)} onChange={(event) => setOutdoor(Number(event.target.value) / 100)} /></label>
    </div>
    {result ? <><div className="grid gap-3 sm:grid-cols-2"><Metric title={t('sim.result')} range={result.scenario.exposure} unit="µg·h/m³/person" /><Metric title="Exposure change" range={result.exposureChangePercent} unit="% reduction" /><Metric title="CO₂e saved" range={result.co2eSavedGrams} unit="g/day" /><Metric title="PM2.5 emissions saved" range={result.pm25SavedGrams} unit="g/day" /></div>
      <section className="rounded-xl border border-line bg-card p-4"><h2 className="font-semibold">How this is calculated</h2><ul className="mt-2 list-disc pl-5">{result.scenario.howCalculated.map((line) => <li key={line} className="mt-1">{line}</li>)}</ul></section>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="p-2 text-left font-semibold">Default day and selected scenario · central estimates</caption><thead><tr><th className="p-2">Metric</th><th className="p-2">Default day</th><th className="p-2">Your selection</th></tr></thead><tbody>{[['Exposure index', result.baseline.exposure, result.scenario.exposure], ['Daily average PM2.5', result.baseline.twaPm25, result.scenario.twaPm25], ['CO₂e', result.baseline.co2eGrams, result.scenario.co2eGrams]].map(([name, before, after]) => typeof before === 'object' && typeof after === 'object' ? <tr key={String(name)} className="border-t border-line"><th className="p-2">{String(name)}</th><td className="p-2">{before.low}–{before.high} {before.unit}</td><td className="p-2">{after.low}–{after.high} {after.unit}</td></tr> : null)}</tbody></table></div></> : <p role="status">Loading air data and calculating…</p>}
  </section>
}
function Metric({ title, range, unit }: { title: string; range: MetricRange; unit: string }) { return <article className="rounded-xl border border-line bg-card p-4"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-2xl tabular-nums">{range.low.toFixed(1)}–{range.high.toFixed(1)} <span className="text-sm">{unit}</span></p><p className="text-sm text-muted">Central estimate: {range.central.toFixed(1)}. Approximate range.</p></article> }
