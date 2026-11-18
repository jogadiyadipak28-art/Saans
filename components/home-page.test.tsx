import { fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { HomePage } from './home-page'
import { Providers } from './providers'

describe('onboarding', () => {
  beforeEach(() => window.localStorage.clear())

  it('opens a preset household in the review step and keeps the form accessible', async () => {
    const { container } = render(<Providers><HomePage /></Providers>)
    await screen.findByRole('heading', { name: 'Set up your home' })
    fireEvent.click(screen.getByRole('button', { name: 'Delhi NCR demo' }))
    expect(screen.getByRole('group', { name: 'जाँच' })).toBeInTheDocument()
    expect(screen.getByLabelText('वयस्क')).toHaveValue(2)
    expect(await axe(container)).toMatchObject({ violations: [] })
  })
})
