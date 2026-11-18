# Saans security and privacy

## Serverless deployment

Deploy the Next.js application as serverless functions (for example, Vercel). API handlers do not persist profiles. The token bucket and in-flight request map are per warm function instance and are **demo-grade**, not globally consistent across serverless instances. For production-wide abuse controls, put a shared rate-limit store or gateway in front of the functions. Open-Meteo responses also use Next.js revalidation caching; local in-memory air entries are only an optimization.

## Application controls

- API bodies are size-limited while streaming, parsed as JSON, and checked with strict Zod schemas. User-provided unknown fields are rejected.
- The app sets CSP, HSTS, `X-Content-Type-Options`, Referrer-Policy, frame protection, and Permissions-Policy headers. `proxy.ts` generates a fresh CSP nonce for each document request; the root layout uses dynamic rendering so Next.js can attach the nonce to its runtime and hydration scripts.
- LLM and air requests run on the server. Credentials are read only from environment variables and must never use a `NEXT_PUBLIC_` name.
- Chat redacts common email, Indian mobile, PIN, explicit name, and address patterns from the current message, memory summary, and turns before calling the LLM. Pattern matching is not a guarantee; users should still avoid sending identifying details.
- The profile, preferences, pledges, and chat transcript are kept in browser local storage. The clear-data action removes these keys. Sharing a profile with the planner is opt-in.
- LLM output is schema-validated, citation URLs are restricted, and text is rendered as React text rather than HTML. User prompts and retrieved notes are delimited as untrusted data.
- The assistant provides general information, not medical diagnosis or medication instructions. For severe symptoms, contact local emergency services or a qualified clinician.

## Deployment checklist

Set `LLM_PROVIDER`, `LLM_API_KEY`, and `LLM_MODEL` in the deployment's server-side environment when enabling generated wording. Do not commit `.env` files. Verify CSP in the deployed browser when adding a new external resource. The default policy allows same-origin app behavior and the documented air/model connection hosts.

The built-in rate limit uses the platform-provided `x-real-ip` header in production and does not provide cross-region consistency. Add a shared store and monitoring before exposing a high-traffic public deployment.
