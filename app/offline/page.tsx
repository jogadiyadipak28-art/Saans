import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-xl content-center gap-4 px-4 py-12">
      <p className="text-sm font-semibold text-teal">SAANS · OFFLINE</p>
      <h1 className="text-3xl font-semibold">You’re offline right now</h1>
      <p className="text-muted">Your saved profile stays on this device. Reconnect to refresh air forecasts and generate new guidance. Previously viewed estimates may be out of date.</p>
      <Link className="btn w-fit" href="/">Try Saans again</Link>
    </main>
  )
}
