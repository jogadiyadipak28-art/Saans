import type { Household } from '@/lib/schemas/household'
import { householdSchema } from '@/lib/schemas/household'
import type { Lang } from '@/lib/i18n'
import { z } from 'zod'

export type Prefs = {
  language: Lang
  largeText: boolean
  simple: boolean
  theme: 'system' | 'light' | 'dark'
}

export type Pledge = { id: string; text: string; topic: 'transport' | 'cooking' | 'burning'; at: string }
export type ChatTurn = { role: 'user' | 'assistant'; content: string }

const prefsSchema = z.object({
  language: z.enum(['en', 'hi', 'gu']),
  largeText: z.boolean(),
  simple: z.boolean(),
  theme: z.enum(['system', 'light', 'dark']),
}).strict()
const pledgeSchema = z.object({ id: z.string().max(80), text: z.string().max(500), topic: z.enum(['transport', 'cooking', 'burning']), at: z.string().max(40) }).strict()
const chatSchema = z.object({ summary: z.string().max(2000), turns: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }).strict()).max(20) }).strict()

const PROFILE = 'saans.profile.v1'
const PREFS = 'saans.prefs.v1'
const PLEDGES = 'saans.pledges.v1'
const CHAT = 'saans.chat.v1'

export const DEFAULT_PREFS: Prefs = { language: 'en', largeText: false, simple: false, theme: 'system' }

export function readProfile(): Household | null {
  const parsed = householdSchema.safeParse(readRaw(PROFILE))
  return parsed.success ? parsed.data : null
}

export function saveProfile(profile: Household): void {
  window.localStorage.setItem(PROFILE, JSON.stringify(profile))
}

export function readPrefs(): Prefs {
  const parsed = prefsSchema.safeParse(readRaw(PREFS))
  return parsed.success ? parsed.data : DEFAULT_PREFS
}

export function savePrefs(prefs: Prefs): void {
  window.localStorage.setItem(PREFS, JSON.stringify(prefs))
}

export function readPledges(): Pledge[] {
  const parsed = z.array(pledgeSchema).max(500).safeParse(readRaw(PLEDGES))
  return parsed.success ? parsed.data : []
}

export function savePledges(pledges: Pledge[]): void {
  window.localStorage.setItem(PLEDGES, JSON.stringify(pledges))
}

export function readChat(): { summary: string; turns: ChatTurn[] } {
  const parsed = chatSchema.safeParse(readRaw(CHAT))
  return parsed.success ? parsed.data : { summary: '', turns: [] }
}

export function saveChat(chat: { summary: string; turns: ChatTurn[] }): void {
  window.localStorage.setItem(CHAT, JSON.stringify(chat))
}

export function clearSaansData(): void {
  for (const key of [PROFILE, PREFS, PLEDGES, CHAT]) window.localStorage.removeItem(key)
}

function readRaw(key: string): unknown {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(window.localStorage.getItem(key) ?? 'null') as unknown }
  catch { return null }
}
