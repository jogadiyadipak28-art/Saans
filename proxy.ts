import { NextResponse, type NextRequest } from 'next/server'
import { contentSecurityPolicy } from './lib/security/headers'

/** Adds a per-request CSP nonce so Next.js runtime scripts work without unsafe-inline. */
export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === 'development')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', policy)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', policy)
  return response
}
