import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { HoursChips } from './HoursChips'

afterEach(cleanup)

describe('HoursChips', () => {
  it('lists a day’s ranges as chips, in opening order', () => {
    render(
      <HoursChips
        ranges={[
          { opens_at: '16:00:00', closes_at: '22:00:00' },
          { opens_at: '07:00:00', closes_at: '12:00:00' },
        ]}
      />,
    )
    const chips = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(chips.map((chip) => chip.textContent)).toEqual(['7:00 am–12:00 pm', '4:00–10:00 pm'])
    // The open-hour chip look (DESIGN §2 --accent-tint; design/AdminSettings.dc.html .chip).
    expect(screen.getByText('4:00–10:00 pm').className).toContain('bg-accent-tint')
  })

  it('writes a weekday evening the short way', () => {
    render(<HoursChips ranges={[{ opens_at: '17:30:00', closes_at: '22:00:00' }]} />)
    expect(screen.getByRole('listitem').textContent).toBe('5:30–10:00 pm')
  })

  it('says "Closed" for a day with no hours', () => {
    render(<HoursChips ranges={[]} />)
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.getByText('Closed')).toBeTruthy()
  })
})
