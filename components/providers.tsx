'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { HTML_LANG, type Lang } from '@/lib/i18n'
import {
  clearSaansData,
  DEFAULT_PREFS,
  readPrefs,
  readProfile,
  savePrefs,
  saveProfile,
  type Prefs,
} from '@/lib/profile/storage'
import type { Household } from '@/lib/schemas/household'

type SaansValue = {
  ready: boolean
  profile: Household | null
  prefs: Prefs
  setProfile: (profile: Household | null) => void
  setPrefs: (prefs: Prefs) => void
  clearAll: () => void
}

const SaansContext = createContext<SaansValue | null>(null)

export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [profile, setProfileState] = useState<Household | null>(null)
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS)

  useEffect(() => {
    // Hydrate the browser-only profile after mount to avoid server/client markup mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileState(readProfile())
    setPrefsState(readPrefs())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    document.documentElement.lang = HTML_LANG[prefs.language]
    document.documentElement.dataset.text = prefs.largeText ? 'large' : 'normal'
    document.documentElement.dataset.theme = prefs.theme
    savePrefs(prefs)
  }, [prefs, ready])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  }, [])

  const value = useMemo<SaansValue>(
    () => ({
      ready,
      profile,
      prefs,
      setProfile: (next) => {
        setProfileState(next)
        if (next) saveProfile(next)
        else window.localStorage.removeItem('saans.profile.v1')
      },
      setPrefs: (next) => setPrefsState(next),
      clearAll: () => {
        clearSaansData()
        setProfileState(null)
        setPrefsState(DEFAULT_PREFS)
      },
    }),
    [profile, prefs, ready],
  )

  return <SaansContext.Provider value={value}>{children}</SaansContext.Provider>
}

export function useSaans(): SaansValue {
  const value = useContext(SaansContext)
  if (!value) throw new Error('Saans provider missing')
  return value
}

export function useLang(): Lang {
  return useSaans().prefs.language
}
