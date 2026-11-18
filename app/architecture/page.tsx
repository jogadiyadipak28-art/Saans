const traces = [
  ['Live air brief', 'Today’s air', 'components/brief.tsx → /api/air → lib/air/client.ts + lib/engine/aqi.ts'],
  ['Personal daily routine', 'Planner', 'components/feature-panel.tsx → /api/plan → lib/server/features.ts → lib/engine/day.ts + lib/ai/'],
  ['Indoor air actions', 'Indoor', 'components/feature-panel.tsx → /api/indoor → lib/content/hacks.ts + lib/engine/indoor.ts'],
  ['Lower-emission choices', 'Alternatives', 'components/feature-panel.tsx → /api/alternatives → lib/engine/alternatives.ts'],
  ['Exposure and emissions estimates', 'Simulator', 'components/simulator.tsx → lib/engine/day.ts (same pure module as the API)'],
  ['School / housing advisory', 'Community', 'components/community.tsx → /api/advisory → lib/server/features.ts'],
  ['Grounded questions', 'Ask Saans', 'components/chat.tsx → /api/chat → lib/ai/ + lib/rag/ + lib/security/'],
]

export default function ArchitecturePage() {
  return (
    <article className="grid gap-6">
      <header className="grid gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal">Saans system map</p>
        <h1 className="text-3xl font-semibold">How Saans works</h1>
        <p className="max-w-3xl">Saans runs as a Next.js app on a serverless platform such as Vercel. Pages render per request so the strict CSP can attach a fresh nonce to Next.js runtime scripts. The browser keeps the optional household profile, preferences, and chat history in local storage. API handlers validate each request, run the deterministic engine, and use an LLM only to explain the engine’s results.</p>
      </header>
      <section aria-labelledby="flow-title" className="grid gap-3 rounded-xl border border-line bg-card p-5">
        <h2 id="flow-title" className="text-xl font-semibold">Request and data flow</h2>
        <ol className="grid gap-2 sm:grid-cols-5">
          {['Browser UI · optional profile stays on device', 'Serverless API · size limits, Zod validation, per-instance rate limit', 'Air feed · Open-Meteo CAMS global forecast, cached by platform and rounded coordinates', 'Impact engine · pure deterministic calculations and ranges', 'Optional LLM · wording only, structured JSON checked and repaired once'].map((step, index) => <li key={step} className="rounded-lg bg-paper p-3"><span className="block text-xs font-semibold text-teal">STEP {index + 1}</span>{step}</li>)}
        </ol>
        <p className="text-sm text-muted">If air data or model access is unavailable, the app returns labeled demo air data or deterministic fallback wording. It never labels fallback content as live.</p>
      </section>
      <section aria-labelledby="ownership-title" className="grid gap-3 rounded-xl border border-line bg-card p-5">
        <h2 id="ownership-title" className="text-xl font-semibold">Deterministic and generated</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><h3 className="font-semibold">Deterministic</h3><p>AQI category, exposure ranges, indoor concentration, commute and emissions trade-offs, planner time windows, validation, retrieval, and fallback text. The engine owns all numbers.</p></div>
          <div><h3 className="font-semibold">LLM generated when configured</h3><p>Plain-language summaries, translations, and grounded chat or advisory prose. Outputs must match a Zod schema, cite supplied knowledge, and pass a number audit. Without a key, labeled fallback wording is used.</p></div>
        </div>
      </section>
      <section aria-labelledby="trace-title" className="grid gap-3 rounded-xl border border-line bg-card p-5">
        <h2 id="trace-title" className="text-xl font-semibold">Requirement → feature → implementation</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-sm"><thead><tr><th className="p-2">Requirement</th><th className="p-2">Feature</th><th className="p-2">UI → API / engine</th></tr></thead><tbody>{traces.map(([requirement, feature, implementation]) => <tr key={feature} className="border-t border-line"><td className="p-2">{requirement}</td><td className="p-2">{feature}</td><td className="p-2">{implementation}</td></tr>)}</tbody></table></div>
      </section>
      <section className="grid gap-2 rounded-xl border border-line bg-card p-5"><h2 className="text-xl font-semibold">Serverless deployment notes</h2><p>API handlers are stateless between invocations. The in-memory rate limiter and request coalescing are best-effort per warm function instance, not a global quota. Air requests also use the Next.js revalidation cache. Use a shared Redis-compatible store for production-wide rate limits. No household or health profile is written to server storage.</p></section>
    </article>
  )
}
