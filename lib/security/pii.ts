const EMAIL = /\b[\w.+-]+@[\w.-]+\.[A-Z]{2,}\b/gi
const INDIAN_PHONE = /(?<!\d)(?:\+?91[\s().-]?)?[6-9](?:[\s().-]?\d){9}(?!\d)/g
const PIN_CODE = /(?<!\d)\d{6}(?!\d)/g
const EXPLICIT_NAME = /\b(?:my name is|i am called)\s+[\p{L}][\p{L}'’-]*(?:\s+[\p{L}][\p{L}'’-]*)?/giu
const EXPLICIT_ADDRESS = /\b(?:my\s+)?(?:home\s+)?(?:address|flat|apartment|street address)\s*(?:is|:)?\s*[^\n.!?]+/gi
const HINDI_NAME = /मेरा नाम\s+[\p{L}]+(?:\s+[\p{L}]+)?/gu
const GUJARATI_NAME = /મારું નામ\s+[\p{L}]+(?:\s+[\p{L}]+)?/gu

/** Removes common explicit identifiers before free-form chat text reaches the model. */
export function redactPersonalIdentifiers(value: string): string {
  return value
    .replace(EMAIL, '[email removed]')
    .replace(INDIAN_PHONE, '[phone removed]')
    .replace(PIN_CODE, '[PIN removed]')
    .replace(EXPLICIT_NAME, '[name removed]')
    .replace(HINDI_NAME, '[नाम हटाया]')
    .replace(GUJARATI_NAME, '[નામ દૂર કર્યું]')
    .replace(EXPLICIT_ADDRESS, '[address removed]')
}
