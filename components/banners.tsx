export function Banners({ air, wording, local }: { air?: string | null; wording?: string | null; local?: boolean }) {
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
          Numbers were calculated on this device. Nothing was uploaded.
        </p>
      ) : null}
    </div>
  )
}
