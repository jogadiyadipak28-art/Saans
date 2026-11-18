export class HttpError extends Error {
  readonly status: number
  readonly retryAfterSec?: number

  constructor(status: number, message: string, retryAfterSec?: number) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.retryAfterSec = retryAfterSec
  }
}

export function logServerError(scope: string, error: unknown): void {
  const message = error instanceof Error ? error.message : 'unknown'
  const safe = message
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
  console.error(`[saans] ${scope}: ${safe}`)
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    const headers = new Headers()
    if (error.status === 429 && error.retryAfterSec) {
      headers.set('retry-after', String(error.retryAfterSec))
    }
    return Response.json({ error: error.message }, { status: error.status, headers })
  }
  logServerError('api', error)
  return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}
