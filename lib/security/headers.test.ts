import { contentSecurityPolicy, securityHeaders } from './headers'

describe('security policy', () => {
  it('uses a nonce and strict-dynamic while allowing the air and model endpoints', () => {
    const policy = contentSecurityPolicy('random-base64-nonce')
    expect(policy).toContain("script-src 'self' 'nonce-random-base64-nonce' 'strict-dynamic'")
    expect(policy).toContain("style-src 'self' 'nonce-random-base64-nonce'")
    expect(policy).toContain('https://air-quality-api.open-meteo.com')
    expect(policy).toContain('https://api.openai.com')
    expect(policy).not.toContain("'unsafe-inline'")
    expect(policy).not.toContain("'unsafe-eval'")
  })

  it('allows eval only when explicitly building the development policy', () => {
    expect(contentSecurityPolicy('dev-nonce', true)).toContain("'unsafe-eval'")
    expect(contentSecurityPolicy('prod-nonce')).not.toContain("'unsafe-eval'")
  })

  it('sets the required transport and browser hardening headers', () => {
    const headers = new Map(securityHeaders().map(({ key, value }) => [key, value]))
    expect(headers.get('Strict-Transport-Security')).toContain('max-age=')
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(headers.get('Permissions-Policy')).toContain('geolocation=()')
  })
})
