export function collectNumbers(value: unknown, into = new Set<string>()): Set<string> {
  if (typeof value === 'number' && Number.isFinite(value)) {
    into.add(String(value))
    into.add(String(Math.round(value)))
    into.add(value.toFixed(1))
    return into
  }
  if (typeof value === 'string') {
    for (const match of value.match(/\d+(?:\.\d+)?/g) ?? []) into.add(match)
    return into
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNumbers(item, into)
    return into
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectNumbers(item, into)
  }
  return into
}

export function unknownNumbers(text: string, allowed: Set<string>): string[] {
  const found = text.match(/\d+(?:\.\d+)?/g) ?? []
  return found.filter((token) => !allowed.has(token) && !allowed.has(String(Number(token))))
}

export function auditText(text: string, context: unknown, allowHours = true): string | null {
  const allowed = collectNumbers(context)
  if (allowHours) for (let hour = 0; hour <= 24; hour += 1) allowed.add(String(hour))
  const unknown = unknownNumbers(text.replace(/\bPM(?:2\.5|10)\b/gi, ''), allowed)
  if (unknown.length === 0) return null
  return `Unsupported numbers: ${unknown.slice(0, 8).join(', ')}`
}
