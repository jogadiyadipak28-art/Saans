import { useSaans } from '@/components/providers'
import { translate } from '@/lib/i18n'

export function Banners({ air, wording, local }: { air?: string | null; wording?: string | null; local?: boolean }) {
  const { prefs } = useSaans()
  if (!air && !wording && !local) return null
  return (
    <div className="mb-4 grid gap-2" aria-live="polite">
      {air ? (
        <p role="status" className="rounded-md border border-severe bg-card px-3 py-3 font-semibold">
          {air}
        </p>
      ) : null}
      {wording ? (
        <p role="status" className="rounded-md border border-line bg-card px-3 py-3">
          {wording}
        </p>
      ) : null}
      {local ? (
        <p role="status" className="rounded-md border border-line bg-card px-3 py-3">
          {translate(prefs.language, 'banner.local', prefs.simple)}
        </p>
      ) : null}
    </div>
  )
}
