'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSaans } from '@/components/providers'
import { HTML_LANG, translate } from '@/lib/i18n'
import { readChat, saveChat, type ChatTurn } from '@/lib/profile/storage'

type Citation = { id: string; title: string; source: string; url: string | null }
type SpeechResult = ArrayLike<ArrayLike<{ transcript: string }>>
type SpeechRecognizer = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onresult: ((event: { results: SpeechResult }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognizer; webkitSpeechRecognition?: new () => SpeechRecognizer }
export function Chat() {
  const { profile, prefs } = useSaans()
  const t = (key: string) => translate(prefs.language, key, prefs.simple)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [summary, setSummary] = useState('')
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [citations, setCitations] = useState<Citation[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const recognition = useRef<SpeechRecognizer | null>(null)
  useEffect(() => {
    const speechWindow = window as SpeechWindow
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoiceSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition))
    return () => recognition.current?.stop()
  }, [])
  useEffect(() => {
    const saved = readChat()
    // Hydrate the browser-only transcript after mount to avoid server/client markup mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTurns(saved.turns)
    setSummary(saved.summary)
  }, [])
  async function ask(event: React.FormEvent) {
    event.preventDefault()
    const question = message.trim()
    if (!question || busy) return
    setMessage(''); setAnswer(''); setCitations([]); setBusy(true); setStatus('Saans is preparing an answer.')
    const abort = new AbortController(); controller.current = abort
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, signal: abort.signal, body: JSON.stringify({ message: question, language: prefs.language, simple: prefs.simple, turns, summary, household: profile?.shareOptIn ? profile : undefined }) })
      if (!response.ok || !response.body) throw new Error('request')
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let finalAnswer = ''; let nextSummary = summary; let finalStatus = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n'); buffer = events.pop() ?? ''
        for (const eventText of events) {
          const line = eventText.split('\n').find((row) => row.startsWith('data: ')); if (!line) continue
          const event = JSON.parse(line.slice(6)) as { type: string; text?: string; answer?: string; citations?: Citation[]; message?: string; summary?: string; bannerWording?: string | null }
          if (event.type === 'delta') { finalAnswer += event.text ?? ''; setAnswer(finalAnswer) }
          if (event.type === 'replace') { finalAnswer = event.text ?? ''; setAnswer(finalAnswer) }
          if (event.type === 'done') { finalAnswer = event.answer ?? finalAnswer; setAnswer(finalAnswer); setCitations(event.citations ?? []); nextSummary = event.summary ?? summary; if (event.bannerWording) finalStatus = event.bannerWording }
          if (event.type === 'error') throw new Error(event.message ?? 'request')
        }
      }
      const next = [...turns, { role: 'user' as const, content: question }, { role: 'assistant' as const, content: finalAnswer }].slice(-20)
      setTurns(next); setSummary(nextSummary); saveChat({ summary: nextSummary, turns: next }); setStatus(finalStatus || (finalAnswer ? 'Answer complete.' : 'No answer was returned.'))
    } catch (error) { if (error instanceof Error && error.name === 'AbortError') setStatus('Response cancelled.')
      else setStatus('Saans could not answer. Please try again.') }
    finally { setBusy(false); controller.current = null }
  }
  function startVoice() {
    const speechWindow = window as SpeechWindow
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Constructor) { setStatus(t('chat.voiceMissing')); return }
    const instance = new Constructor()
    instance.lang = HTML_LANG[prefs.language]
    instance.continuous = false
    instance.interimResults = false
    instance.onstart = () => setListening(true)
    instance.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript) setMessage((current) => [current.trim(), transcript.trim()].filter(Boolean).join(' '))
    }
    instance.onerror = () => setStatus(t('chat.voiceMissing'))
    instance.onend = () => { recognition.current = null; setListening(false) }
    recognition.current = instance
    setStatus(t('chat.voice'))
    instance.start()
  }
  if (!profile) return <section><h1 className="text-3xl font-semibold">{t('chat.title')}</h1><p className="mt-3">Set up a household profile first. <Link className="underline" href="/">Set up Saans</Link></p></section>
  return <section className="grid gap-4"><header><p className="text-sm font-semibold text-teal">GROUNDED Q&amp;A</p><h1 className="mt-1 text-3xl font-semibold">{t('chat.title')}</h1><p className="mt-2 text-muted">Answers draw on Saans’s air-quality guidance. Do not share identifying details. {t('common.notMedical')}</p></header>
    <div aria-live="polite" aria-atomic="false" className="grid gap-3 rounded-xl border border-line bg-card p-4"><p role="status">{status}</p>{answer ? <p className="whitespace-pre-wrap">{answer}</p> : null}{citations.length ? <section><h2 className="font-semibold">Sources</h2><ul className="list-disc pl-5">{citations.map((citation) => <li key={citation.id}>{citation.url ? <a className="underline" href={citation.url} target="_blank" rel="noreferrer">{citation.title}</a> : citation.title} · {citation.source}</li>)}</ul></section> : null}</div>
    <form className="grid gap-2" onSubmit={ask}><label htmlFor="chat-message" className="font-semibold">{t('chat.title')}</label><textarea id="chat-message" className="field min-h-28" maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('chat.placeholder')} /><div className="flex flex-wrap gap-2"><button className="btn bg-teal text-white" disabled={busy || !message.trim()}>{t('chat.send')}</button><button type="button" className="btn" onClick={startVoice} disabled={!voiceSupported || busy} aria-pressed={listening}>{t('chat.voice')}</button>{busy ? <button type="button" className="btn" onClick={() => controller.current?.abort()}>{t('chat.stop')}</button> : null}</div>{!voiceSupported ? <p className="text-sm text-muted">{t('chat.voiceMissing')}</p> : null}</form>
  </section>
}
