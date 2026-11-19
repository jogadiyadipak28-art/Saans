import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { axe } from 'jest-axe'
import { PERSONAS } from '@/lib/profile/places'
import { Providers } from './providers'
import { Shell } from './shell'

describe('model wording preference', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('saans.profile.v1', JSON.stringify(PERSONAS.delhi))
    window.localStorage.setItem('saans.prefs.v1', JSON.stringify({ language: 'en', largeText: false, simple: false, theme: 'system' }))
  })

  it('lets an existing profile explicitly opt into or out of model wording', async () => {
    const { container } = render(<Providers><Shell><p>Page content</p></Shell></Providers>)
    const checkbox = await screen.findByRole('checkbox', { name: /configured AI model/i })

    expect(checkbox).not.toBeChecked()
    expect(await axe(container)).toMatchObject({ violations: [] })

    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem('saans.profile.v1') ?? '{}').shareOptIn).toBe(true)
    })

    fireEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem('saans.profile.v1') ?? '{}').shareOptIn).toBe(false)
    })
  })
})
