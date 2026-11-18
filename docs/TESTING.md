# Testing map

| Requirement | Current test or check | Status |
|---|---|---|
| AQI category breakpoint behavior | `lib/engine/engine.test.ts` | Unit tests present |
| Exposure ranges, indoor monotonicity, units, day duration | `lib/engine/engine.test.ts` | Unit tests present |
| Token-aware memory and rolling summary | `lib/ai/memory.test.ts` | Unit tests present |
| LLM JSON repair, retries, and fallback | `lib/ai/repair.test.ts`, `app/api/routes.test.ts` | Provider-mocked retry and malformed streamed chat response tested |
| AI guardrails and number audit | `lib/ai/guardrails.test.ts`, `lib/ai/numbers.test.ts`, `lib/ai/prompts.test.ts` | Unit tests present |
| Live air schema, cache, and demo fallback | `lib/air/client.test.ts` | Fetch mocked; unit tests present |
| CSP and browser security headers | `lib/security/headers.test.ts` | Unit tests present |
| Citation URL safety, request parsing, and rate-limit behavior | `lib/security/*.test.ts`, `lib/server/parse.test.ts`, `lib/server/rate.test.ts` | Unit tests include streamed body limits and retry behavior |
| Translation key completeness | `lib/i18n/index.test.ts` | En/hi/gu keys compared |
| Local profile validation and curated corpus | `lib/profile/*.test.ts`, `lib/rag/*.test.ts` | Unit tests present |
| Household and API body validation | `lib/schemas/household.ts`, `lib/server/parse.test.ts`, `app/api/impact/route.test.ts`, `app/api/routes.test.ts` | Schema, invalid JSON, unknown keys, and streamed size limits tested |
| Live air fallback and caching | `lib/air/client.test.ts`, `app/api/routes.test.ts` | Fetch mock tests client behavior and GET route validation |
| Stalled air provider | `lib/air/client.test.ts` | Aborts after the configured timeout and returns labeled demo data |
| Chat identifiers and provider timeout | `lib/security/pii.test.ts`, `lib/ai/client.test.ts`, `app/api/routes.test.ts` | Common identifier patterns are redacted; bounded provider timeout and model-failure fallback are tested |
| LLM JSON repair and typed fallback | `lib/ai/repair.test.ts`, `app/api/routes.test.ts` | Provider-mocked retry and malformed chat JSON repair tested |
| Impact API success, validation, and throttling | `app/api/impact/route.test.ts` | Route-level happy path and 400/429 behavior tested |
| Planner, indoor, alternatives, advisory, air, and chat routes | `app/api/routes.test.ts`, `lib/server/features.test.ts` | Feature composition and route success/invalid-request paths covered; shared rate-limit behavior tested separately |
| Onboarding persona selection and simulator recalculation | `components/home-page.test.tsx`, `components/simulator.test.tsx`, `lib/engine/engine.test.ts` | Interaction, profile-difference, and axe checks present |
| Indoor action text reaches the feature UI | `components/feature-panel.test.tsx`, `lib/content/hacks.test.ts` | Localized actionable advice rendering tested |
| Chat voice input, fallback wording, and core labels | `components/chat.test.tsx` | Supported/unsupported browser paths and visible demo fallback label tested; axe check present |
| AQI component contrast and semantics | `components/aqi-badge.test.tsx` | jest-axe component check present; page-level axe coverage and manual keyboard audit still needed |
| End-to-end onboarding to impact flow | Not present | Playwright path still needed |
| Production homepage response and security headers | `curl http://127.0.0.1:3000/offline`, production HTML response | HTTP 200; HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and matching Next.js script nonces verified |
| Mobile browser quality check | Lighthouse 13.6.0 against local production homepage | Performance 97, Accessibility 100, Best Practices 96, SEO 100; LCP 0.8 s, CLS 0, TBT 180 ms. One CSP issue appears in Chrome Issues with no detail; console error audit is clean. |
| Dependency vulnerability audit | `npm audit` | 0 vulnerabilities on 2026-11-19; unused development dependencies removed |

Run checks with `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm audit`, and `npm run build`. The latest successful run passed 34 suites and 100 tests and measured 95.25% statements, 95.17% lines, 96.17% functions, and 80.26% branches across `lib/`. Jest enforces 80% statements, lines, and functions, plus 60% branches for the whole library and higher local floors on critical modules.
