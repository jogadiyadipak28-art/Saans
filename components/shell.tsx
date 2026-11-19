'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { translate } from '@/lib/i18n'
import { useSaans } from '@/components/providers'

const LINKS = [
  ['/', 'nav.today'],
  ['/planner', 'nav.planner'],
  ['/indoor', 'nav.indoor'],
  ['/alternatives', 'nav.alternatives'],
  ['/simulator', 'nav.simulator'],
  ['/community', 'nav.community'],
  ['/chat', 'nav.chat'],
  ['/architecture', 'nav.architecture'],
] as const

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile, prefs, setProfile, setPrefs, clearAll } = useSaans()
  const t = (path: string) => translate(prefs.language, path, prefs.simple)

  return (
    <>
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:p-3">Skip to content</a>
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/" className="min-h-11 text-xl font-semibold text-teal">
            {t('app.name')}
          </Link>
          <p className="text-sm text-muted">{t('app.tagline')}</p>
          <div className="ml-auto flex flex-wrap gap-2">
            <label className="min-h-11 text-sm">
              <span className="sr-only">{t('prefs.language')}</span>
              <select
                className="min-h-11 rounded-md border border-line bg-paper px-3"
                value={prefs.language}
                onChange={(event) => setPrefs({ ...prefs, language: event.target.value as typeof prefs.language })}
              >
                <option value="en">{t('lang.en')}</option>
                <option value="hi">{t('lang.hi')}</option>
                <option value="gu">{t('lang.gu')}</option>
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={prefs.largeText}
                onChange={(event) => setPrefs({ ...prefs, largeText: event.target.checked })}
              />
              {t('prefs.large')}
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={prefs.simple}
                onChange={(event) => setPrefs({ ...prefs, simple: event.target.checked })}
              />
              {t('prefs.simple')}
            </label>
          </div>
        </div>
        <nav aria-label="Primary" className="mx-auto flex max-w-5xl flex-wrap gap-1 px-4 pb-3">
          {LINKS.map(([href, key]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className="nav-link inline-flex min-h-11 items-center rounded-full px-3 text-sm"
            >
              {t(key)}
            </Link>
          ))}
        </nav>
      </header>
      <main id="content" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {profile ? (
          <label className="mb-4 flex min-h-11 items-start gap-2 rounded-lg border border-line bg-card p-3">
            <input
              className="mt-1"
              type="checkbox"
              checked={profile.shareOptIn}
              aria-describedby="model-sharing-help"
              onChange={(event) => setProfile({ ...profile, shareOptIn: event.target.checked })}
            />
            <span>
              <span className="block font-semibold">{t('onboarding.share')}</span>
              <span id="model-sharing-help" className="block text-sm text-muted">{t('onboarding.shareHelp')}</span>
            </span>
          </label>
        ) : null}
        {children}
      </main>
      <footer className="border-t border-line px-4 py-6 text-sm text-muted">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <p>{t('common.notMedical')}</p>
          <Link href="/privacy" className="min-h-11 inline-flex items-center underline">
            {t('nav.privacy')}
          </Link>
          <Dialog.Root>
            <Dialog.Trigger className="min-h-11 rounded-md border border-line px-3">{t('common.clear')}</Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/40" />
              <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card p-4">
                <Dialog.Title className="text-lg font-semibold">{t('common.clear')}</Dialog.Title>
                <Dialog.Description className="mt-2">{t('privacy.body')}</Dialog.Description>
                <div className="mt-4 flex gap-2">
                  <Dialog.Close className="min-h-11 rounded-md border border-line px-3">{t('common.cancel')}</Dialog.Close>
                  <button type="button" className="min-h-11 rounded-md bg-severe px-3 text-white" onClick={clearAll}>
                    {t('common.clear')}
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </footer>
    </>
  )
}
