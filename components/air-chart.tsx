'use client'

type Row = { time: string; pm25: number; pm10: number }
export function AirChart({ rows, caption }: { rows: Row[]; caption: string }) {
  const points = rows.slice(0, 48)
  if (points.length === 0) return <p role="status">Forecast chart is unavailable.</p>
  const max = Math.max(1, ...points.map((row) => Math.max(row.pm25, row.pm10)))
  const path = (key: 'pm25' | 'pm10') => points.map((row, index) => `${index === 0 ? 'M' : 'L'} ${(index / Math.max(1, points.length - 1)) * 1000} ${190 - (row[key] / max) * 170}`).join(' ')
  return <figure className="rounded-xl border border-line bg-card p-4"><figcaption className="font-semibold">{caption}: PM2.5 and PM10 over the forecast</figcaption><p className="text-sm text-muted">The chart shows hourly modeled concentrations in µg/m³. A data table follows.</p><svg role="img" aria-label={`Air quality forecast chart. PM2.5 is teal, PM10 is rust. Peak is ${Math.round(max)} micrograms per cubic meter.`} viewBox="0 0 1000 210" className="mt-2 w-full" preserveAspectRatio="none"><path d="M0 20H1000 M0 105H1000 M0 190H1000" stroke="currentColor" opacity=".18"/><path d={path('pm25')} fill="none" stroke="#087e73" strokeWidth="4"/><path d={path('pm10')} fill="none" stroke="#aa573b" strokeWidth="4"/></svg><ul className="flex gap-5 text-sm"><li><span aria-hidden="true" className="inline-block h-3 w-3 rounded-full bg-teal" /> PM2.5</li><li><span aria-hidden="true" className="inline-block h-3 w-3 rounded-full bg-[#aa573b]" /> PM10</li></ul></figure>
}
