import { render, screen } from '@testing-library/react'
import { Providers } from './providers'
import { Banners } from './banners'

describe('air and wording notices', () => {
  it('explains how to enable AI wording without calling opted-out guidance a demo', async () => {
    render(<Providers><Banners local /></Providers>)

    expect(await screen.findByText(/Numbers were calculated on this device/)).toBeInTheDocument()
    expect(screen.getByText(/turn on the household-sharing option above/)).toBeInTheDocument()
    expect(screen.queryByText(/Demo wording, not a live model/)).not.toBeInTheDocument()
  })
})
