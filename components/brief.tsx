'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { next24Pm25, type AirPayload } from '@/lib/air/client'
import { compareHousehold, type DayComparison } from '@/lib/engine/day'
import { fallbackNarrative } from '@/lib/content/explain'
import { toEngineInput } from '@/lib/profile/scenario'
import { translate } from '@/lib/i18n'
import { AqiBadge, categoryPath } from '@/components/aqi-badge'
import { Banners } from '@/components/banners'
import { useSaans } from '@/components/providers'

const AirChart = dynamic(() => import('@/components/air-chart').then((mod) => mod.AirChart), {
  ssr: false,
  loading: () => <p role="status">Loading</p>,
})

type PlanState = {
  air: AirPayload
  comparison: DayComparison
  summary: string
  impact: string
  bannerWording: string | null
  local: boolean
}

export function Brief() {
  const { profile, prefs } = useSaans()
  const t = (key: string, vars?: Record<string, string | number>) => translate(prefs.language, key, prefs.simple, vars)
  const [state, setState] = useState<PlanState | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile) return
    let cancel = false
    const run = async () => {
      setError('')
      const response = await fetch(`/api/air?lat=${profile.latitude}&lon=${profile.longitude}`)
      if (!response.ok) throw new Error('air')
      const air = (await response.json()) as AirPayload
      const hourly = next24Pm25(air.snapshot)
      if (profile.shareOptIn) {
        const planResponse = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ household: { ...profile, language: prefs.language } }),
        })
        if (!planResponse.ok) throw new Error('plan')
        const plan = (await planResponse.json()) as {
          comparison: DayComparison
          narrative: { summary: string; impactExplanation: string }
          bannerWording: string | null
        }
        if (!cancel) {
          setState({
            air,
            comparison: plan.comparison,
            summary: plan.narrative.summary,
            impact: plan.narrative.impactExplanation,
            bannerWording: plan.bannerWording,
            local: false,
          })
        }
        return
      }
      const comparison = compareHousehold(toEngineInput({ ...profile, language: prefs.language }, hourly))
      const narrative = fallbackNarrative(comparison, prefs.language, prefs.simple)
      if (!cancel) {
        setState({
          air,
          comparison,
          summary: narrative.summary,
          impact: narrative.impactExplanation,
          bannerWording: 'Demo wording, not a live model',
          local: true,
        })
      }
    }
    run().catch(() => {
      if (!cancel) setError(translate(prefs.language, 'common.error', prefs.simple))
    })
    return () => {
      cancel = true
    }
  }, [profile, prefs.language, prefs.simple])

  if (error) return <p role="alert">{error} <button type="button" className="btn" onClick={() => location.reload()}>{t('common.retry')}</button></p>
  if (!state || !profile) return <p role="status">{t('common.loading')}</p>
  const rows = state.air.snapshot.hourly.slice(0, 48)
  return (
    <section className="grid gap-4">
      <h1 className="text-3xl font-semibold">{t('brief.title')}</h1>
      <Banners air={state.air.banner} wording={state.bannerWording} local={state.local} />
      <AqiBadge aqi={state.air.aqi} label={t(categoryPath(state.air.aqi))} />
      <p className="text-sm text-muted">{state.air.snapshot.attribution}</p>
      <h2 className="text-xl font-semibold">{t('brief.meaning')}</h2>
      <p>{state.summary}</p>
      <p>{state.impact}</p>
      <p className="text-sm">{t('common.engineNote')}</p>
      <p>
        {t('brief.exposure', {
          exposure: state.comparison.baseline.exposure.central,
          plan: state.comparison.scenario.exposure.central,
        })}
      </p>
      <h2 className="text-xl font-semibold">{t('brief.forecast')}</h2>
      <AirChart rows={rows} caption={t('brief.tableCaption')} />
      <table className="w-full text-sm">
        <caption className="text-left font-semibold">{t('brief.tableCaption')}</caption>
        <thead>
          <tr>
            <th className="text-left">Time</th>
            <th className="text-left">PM2.5</th>
            <th className="text-left">PM10</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.time}>
              <td>{row.time.slice(0, 16)}</td>
              <td>{row.pm25}</td>
              <td>{row.pm10}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
