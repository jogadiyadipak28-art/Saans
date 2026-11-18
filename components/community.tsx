'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSaans } from '@/components/providers'
import { translate } from '@/lib/i18n'
import { readPledges, savePledges, type Pledge } from '@/lib/profile/storage'

type AdvisoryDraft = { title?: string; paragraphs?: string[]; actions?: string[]; disclaimer?: string }
export function Community() {
  const { profile, prefs } = useSaans()
  const t = (key: string) => translate(prefs.language, key, prefs.simple)
  const [pledges, setPledges] = useState<Pledge[]>([])
  const [advisory, setAdvisory] = useState<AdvisoryDraft | null>(null)
  const [advisoryBanners, setAdvisoryBanners] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  useEffect(() => {
    // Pledges are browser-only; load them after hydration to keep server markup stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPledges(readPledges())
  }, [])
  function pledge(topic: Pledge['topic'], text: string) {
    const next = [...pledges, { id: crypto.randomUUID(), text, topic, at: new Date().toISOString() }]
    setPledges(next); savePledges(next); setStatus('Your pledge was saved on this device.')
  }
  async function makeAdvisory(audience: 'school' | 'housing-society') {
    if (!profile) return
    setBusy(true); setStatus('Creating a general draft…')
    try {
      const response = await fetch('/api/advisory', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ household: { ...profile, language: prefs.language }, audience }) })
      if (!response.ok) throw new Error()
      const data = await response.json() as { advisory?: AdvisoryDraft; bannerAir?: string | null; bannerWording?: string | null }
      setAdvisory(data.advisory ?? null)
      setAdvisoryBanners([data.bannerAir, data.bannerWording].filter((part): part is string => Boolean(part)))
      setStatus('Draft ready. Please review it before sharing.')
    } catch { setStatus('Could not create the draft. Please try again.') }
    finally { setBusy(false) }
  }
  async function copyCard() {
    const text = `Clean Air Day · ${profile?.locationLabel}\nMy household has made ${pledges.length} clean-air pledge${pledges.length === 1 ? '' : 's'} on this device. Small steps can help: avoid burning waste, reduce idling, and ventilate when outdoor air is cleaner.`
    try { await navigator.clipboard.writeText(text); setStatus('Clean Air Day card copied. You can paste it into a message.') }
    catch { setStatus(text) }
  }
  if (!profile) return <section><h1 className="text-3xl font-semibold">{t('community.title')}</h1><p className="mt-3">Set up a profile to create a local pledge or advisory. <Link className="underline" href="/">Set up Saans</Link></p></section>
  return <section className="grid gap-5"><header><h1 className="text-3xl font-semibold">{t('community.title')}</h1><p className="mt-2 text-muted">{t('community.deviceNote')}</p></header>
    <section className="grid gap-3 rounded-xl border border-line bg-card p-4"><h2 className="text-xl font-semibold">{t('community.pledge')}</h2><div className="flex flex-wrap gap-2"><button className="btn" onClick={() => pledge('transport', 'I will combine trips or choose a lower-emission commute when practical.')}>Lower-emission trips</button><button className="btn" onClick={() => pledge('cooking', 'I will use kitchen ventilation while cooking.')}>Ventilate while cooking</button><button className="btn" onClick={() => pledge('burning', 'I will avoid burning waste and share a safer disposal option.')}>No waste burning</button></div><p aria-live="polite">{t('community.counter')}: <strong>{pledges.length}</strong></p><button className="btn w-fit" onClick={copyCard}>{t('community.copy')}</button></section>
    <section className="grid gap-3 rounded-xl border border-line bg-card p-4"><h2 className="text-xl font-semibold">{t('community.advisory')}</h2><p>{t('common.notMedical')}</p><div className="flex flex-wrap gap-2"><button disabled={busy} className="btn" onClick={() => makeAdvisory('school')}>{t('community.school')}</button><button disabled={busy} className="btn" onClick={() => makeAdvisory('housing-society')}>{t('community.society')}</button></div>{advisoryBanners.map((banner) => <p key={banner} role="status" className="rounded-md border border-line p-3">{banner}</p>)}{advisory ? <article className="grid gap-3 rounded-lg bg-paper p-4">{advisory.title ? <h3 className="text-lg font-semibold">{advisory.title}</h3> : null}{advisory.paragraphs?.length ? <div className="grid gap-2">{advisory.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div> : null}{advisory.actions?.length ? <section><h4 className="font-semibold">Recommended actions</h4><ol className="mt-2 list-decimal space-y-1 pl-5">{advisory.actions.map((action) => <li key={action}>{action}</li>)}</ol></section> : null}{advisory.disclaimer ? <p className="text-sm text-muted">{advisory.disclaimer}</p> : null}</article> : null}</section>
    <p role="status" aria-live="polite">{status}</p>
  </section>
}
