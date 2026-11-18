export type SecurityHeader = { key: string; value: string }

const CONNECT = [
  "'self'",
  'https://air-quality-api.open-meteo.com',
  'https://api.openai.com',
  'https://api.anthropic.com',
  'https://generativelanguage.googleapis.com',
].join(' ')

/** Browser policy. Air and model calls are server-side; the hosts stay listed so a future client call cannot silently widen the policy. */
export function contentSecurityPolicy(nonce: string, allowDevelopmentEval = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${allowDevelopmentEval ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${CONNECT}`,
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}

export function securityHeaders(): SecurityHeader[] {
  return [
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(self), geolocation=(), payment=(), usb=()',
    },
  ]
}
