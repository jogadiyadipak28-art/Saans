'use client'

import { useState } from 'react'
import { PERSONAS, resolvePlace } from '@/lib/profile/places'
import type { Household } from '@/lib/schemas/household'
import { householdSchema } from '@/lib/schemas/household'
import { translate } from '@/lib/i18n'
import { useSaans } from '@/components/providers'
import { Brief } from '@/components/brief'

const EMPTY: Household = {
  locationLabel: '',
  latitude: 0,
  longitude: 0,
  locationPrecision: 'city',
  floor: 'mid',
  windowHabit: 'closed',
  kitchenVentilation: 'none',
  cookingFuel: 'lpg',
  commuteMode: 'walk',
  distanceKm: 2,
  members: { infant: 0, child: 0, adult: 1, elderly: 0 },
  respiratorySensitivity: false,
  purifierOwned: false,
  purifierCadr: 0,
  budget: 'none',
  language: 'en',
  shareOptIn: false,
}

export function HomePage() {
  const { ready, profile, prefs } = useSaans()
  const t = (key: string) => translate(prefs.language, key, prefs.simple)
  if (!ready) return <p role="status">{t('common.loading')}</p>
  if (!profile) return <Onboarding />
  return <Brief />
}

function Onboarding() {
  const { prefs, setProfile, setPrefs } = useSaans()
  const t = (key: string) => translate(prefs.language, key, prefs.simple)
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Household>({ ...EMPTY, language: prefs.language })
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeError, setPlaceError] = useState('')
  const [memberError, setMemberError] = useState('')

  function applyPersona(key: keyof typeof PERSONAS) {
    const persona = PERSONAS[key]
    setDraft(persona)
    setPlaceQuery(persona.locationLabel)
    setPlaceError('')
    setPrefs({ ...prefs, language: persona.language })
    setStep(3)
  }

  function savePlace() {
    const place = resolvePlace(placeQuery)
    if (!place) {
      setPlaceError(t('onboarding.errorPlace'))
      return
    }
    setDraft({ ...draft, locationLabel: place.label, latitude: place.latitude, longitude: place.longitude, locationPrecision: place.precision })
    setPlaceError('')
    setStep(1)
  }

  function savePeople() {
    const total = draft.members.infant + draft.members.child + draft.members.adult + draft.members.elderly
    if (total < 1) {
      setMemberError(t('onboarding.errorMembers'))
      return
    }
    setMemberError('')
    setStep(3)
  }

  function saveAll() {
    const next = { ...draft, language: prefs.language, purifierCadr: draft.purifierOwned ? draft.purifierCadr : 0 }
    const parsed = householdSchema.safeParse(next)
    if (!parsed.success) {
      setMemberError(t('onboarding.errorMembers'))
      return
    }
    setProfile(parsed.data)
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (step === 0) savePlace()
        else if (step === 2) savePeople()
        else if (step === 3) saveAll()
        else setStep(step + 1)
      }}
    >
      <h1 className="text-3xl font-semibold">{t('onboarding.title')}</h1>
      <p className="text-sm text-muted">
        {t('onboarding.stepPlace')} · {t('onboarding.stepHome')} · {t('onboarding.stepTravel')} · {t('onboarding.stepPeople')}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => applyPersona('delhi')}>{t('onboarding.personaDelhi')}</button>
        <button type="button" className="btn" onClick={() => applyPersona('surat')}>{t('onboarding.personaSurat')}</button>
        <button type="button" className="btn" onClick={() => applyPersona('lucknow')}>{t('onboarding.personaLucknow')}</button>
      </div>
      {step === 0 ? (
        <fieldset className="grid gap-3">
          <legend className="font-semibold">{t('onboarding.stepPlace')}</legend>
          <label className="grid gap-1" htmlFor="place">
            {t('onboarding.city')} / {t('onboarding.pincode')}
            <input id="place" className="field" value={placeQuery} aria-invalid={placeError ? true : undefined} aria-describedby={placeError ? 'place-error' : undefined} onChange={(event) => setPlaceQuery(event.target.value)} />
          </label>
          {placeError ? <p id="place-error" role="alert">{placeError}</p> : null}
        </fieldset>
      ) : null}
      {step === 1 ? (
        <fieldset className="grid gap-3">
          <legend className="font-semibold">{t('onboarding.stepHome')}</legend>
          <Choice label={t('onboarding.floor')} value={draft.floor} options={[['ground', 'options.ground'], ['mid', 'options.mid'], ['high', 'options.high']]} onChange={(floor) => setDraft({ ...draft, floor })} />
          <Choice label={t('onboarding.windows')} value={draft.windowHabit} options={[['open', 'options.open'], ['closed', 'options.closed'], ['sealed', 'options.sealed']]} onChange={(windowHabit) => setDraft({ ...draft, windowHabit })} />
          <Choice label={t('onboarding.kitchen')} value={draft.kitchenVentilation} options={[['none', 'options.ventNone'], ['exhaust', 'options.exhaust'], ['chimney', 'options.chimney']]} onChange={(kitchenVentilation) => setDraft({ ...draft, kitchenVentilation })} />
        </fieldset>
      ) : null}
      {step === 2 ? (
        <fieldset className="grid gap-3">
          <legend className="font-semibold">{t('onboarding.stepTravel')}</legend>
          <Choice label={t('onboarding.commute')} value={draft.commuteMode} options={[['walk', 'options.walk'], ['two-wheeler', 'options.twoWheeler'], ['open-bus', 'options.bus'], ['car-recirc', 'options.car'], ['metro', 'options.metro'], ['none', 'options.none']]} onChange={(commuteMode) => setDraft({ ...draft, commuteMode })} />
          <label className="grid gap-1" htmlFor="distance">{t('onboarding.distance')}
            <input id="distance" className="field" type="number" min={0} max={40} value={draft.distanceKm} onChange={(event) => setDraft({ ...draft, distanceKm: Number(event.target.value) })} />
          </label>
          <Choice label={t('onboarding.fuel')} value={draft.cookingFuel} options={[['lpg', 'options.lpg'], ['biomass', 'options.biomass'], ['induction', 'options.induction'], ['png', 'options.png']]} onChange={(cookingFuel) => setDraft({ ...draft, cookingFuel })} />
        </fieldset>
      ) : null}
      {step === 3 ? (
        <fieldset className="grid gap-3">
          <legend className="font-semibold">{t('onboarding.review')}</legend>
          {(['infant', 'child', 'adult', 'elderly'] as const).map((age) => (
            <label key={age} className="grid gap-1" htmlFor={age}>
              {t(`onboarding.${age}`)}
              <input id={age} className="field" type="number" min={0} max={8} value={draft.members[age]} aria-describedby={memberError ? 'member-error' : undefined} onChange={(event) => setDraft({ ...draft, members: { ...draft.members, [age]: Number(event.target.value) } })} />
            </label>
          ))}
          {memberError ? <p id="member-error" role="alert">{memberError}</p> : null}
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={draft.respiratorySensitivity} onChange={(event) => setDraft({ ...draft, respiratorySensitivity: event.target.checked })} />
            {t('onboarding.sensitivity')}
          </label>
          <p className="text-sm text-muted">{t('onboarding.sensitivityHelp')}</p>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={draft.purifierOwned} onChange={(event) => setDraft({ ...draft, purifierOwned: event.target.checked, purifierCadr: event.target.checked ? Math.max(50, draft.purifierCadr) : 0 })} />
            {t('onboarding.purifier')}
          </label>
          {draft.purifierOwned ? (
            <label className="grid gap-1" htmlFor="cadr">{t('onboarding.cadr')}
              <input id="cadr" className="field" type="number" min={50} max={800} value={draft.purifierCadr} onChange={(event) => setDraft({ ...draft, purifierCadr: Number(event.target.value) })} />
            </label>
          ) : null}
          <Choice label={t('onboarding.budget')} value={draft.budget} options={[['none', 'options.budgetNone'], ['low', 'options.budgetLow'], ['medium', 'options.budgetMedium'], ['high', 'options.budgetHigh']]} onChange={(budget) => setDraft({ ...draft, budget })} />
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={draft.shareOptIn} onChange={(event) => setDraft({ ...draft, shareOptIn: event.target.checked })} />
            {t('onboarding.share')}
          </label>
          <p className="text-sm text-muted">{t('onboarding.shareHelp')}</p>
        </fieldset>
      ) : null}
      <div className="flex gap-2">
        {step > 0 ? <button type="button" className="btn" onClick={() => setStep(step - 1)}>{t('common.back')}</button> : null}
        <button type="submit" className="btn bg-teal text-white">{step === 3 ? t('common.save') : t('common.next')}</button>
      </div>
    </form>
  )
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (value: T) => void }) {
  const { prefs } = useSaans()
  const t = (key: string) => translate(prefs.language, key, prefs.simple)
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([option, key]) => (
          <label key={option} className="min-h-11 inline-flex items-center gap-2 rounded-full border border-line px-3">
            <input type="radio" name={label} checked={value === option} onChange={() => onChange(option)} />
            {t(key)}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
