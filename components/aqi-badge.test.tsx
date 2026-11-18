import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { AqiBadge } from './aqi-badge'
import { cpcbAqi } from '@/lib/engine/aqi'

describe('AQI badge accessibility', () => {
  it('shows the category with text and an icon, and passes axe', async () => {
    const { container } = render(<AqiBadge aqi={cpcbAqi({ pm25: 22 })} label="Moderate" />)
    expect(screen.getByText(/Moderate/)).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
