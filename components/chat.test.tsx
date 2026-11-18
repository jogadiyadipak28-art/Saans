import { TextDecoder, TextEncoder } from 'node:util'
import { ReadableStream } from 'node:stream/web'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { axe } from 'jest-axe'
import { Chat } from './chat'
import { Providers } from './providers'
import { saveProfile } from '@/lib/profile/storage'
import type { Household } from '@/lib/schemas/household'

const profile: Household = {
  locationLabel: 'Lucknow', latitude: 26.85, longitude: 80.95, locationPrecision: 'preset',
  floor: 'mid', windowHabit: 'closed', kitchenVentilation: 'none', cookingFuel: 'lpg',
  commuteMode: 'metro', distanceKm: 3, members: { infant: 0, child: 0, adult: 2, elderly: 0 },
  respiratorySensitivity: false, purifierOwned: false, purifierCadr: 0, budget: 'none', language: 'en', shareOptIn: false,
}

describe('Ask Saans interactions', () => {
  beforeEach(() => { window.localStorage.clear(); saveProfile(profile); delete (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition })

  it('explains voice fallback and has no accessibility violations when speech is unavailable', async () => {
    const { container } = render(<Providers><Chat /></Providers>)
    await screen.findByRole('textbox')
    expect(screen.getByText(/Voice input is not available/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Voice input' })).toBeDisabled()
    expect(await axe(container)).toMatchObject({ violations: [] })
  })

  it('uses browser speech recognition in the selected language and places the transcript in the draft', async () => {
    class MockSpeechRecognition {
      static deliverTranscript: (() => void) | null = null
      static startSpy = jest.fn()
      lang = ''
      continuous = false
      interimResults = false
      onstart: (() => void) | null = null
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null
      onerror: (() => void) | null = null
      onend: (() => void) | null = null
      start = MockSpeechRecognition.startSpy.mockImplementation(() => { MockSpeechRecognition.deliverTranscript = () => this.onresult?.({ results: [[{ transcript: 'How is the air today?' }]] }); this.onstart?.() })
      stop = jest.fn()
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: MockSpeechRecognition })
    render(<Providers><Chat /></Providers>)
    await screen.findByRole('textbox')
    fireEvent.click(screen.getByRole('button', { name: 'Voice input' }))
    await waitFor(() => expect(MockSpeechRecognition.startSpy).toHaveBeenCalled())
    act(() => MockSpeechRecognition.deliverTranscript?.())
    expect(screen.getByRole('textbox')).toHaveValue('How is the air today?')
    expect(screen.getByRole('button', { name: 'Voice input' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps the demo wording label visible after a fallback chat response completes', async () => {
    const originalFetch = global.fetch
    const encoder = new TextEncoder()
    Object.defineProperty(globalThis, 'TextDecoder', { configurable: true, value: TextDecoder })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: 'General tip.' })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', answer: 'General tip.', citations: [], summary: '', bannerWording: 'Demo wording, not a live model' })}\n\n`))
          controller.close()
        },
      }),
    }) as unknown as typeof fetch
    try {
      render(<Providers><Chat /></Providers>)
      await screen.findByRole('textbox')
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Give a tip.' } })
      fireEvent.click(screen.getByRole('button', { name: 'Send' }))
      expect(await screen.findByText('Demo wording, not a live model')).toBeInTheDocument()
    } finally {
      global.fetch = originalFetch
    }
  })
})
