import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Legend } from './Legend'

afterEach(cleanup)

describe('Legend', () => {
  it('is a list named Legend, one item per colour, with the swatches hidden', () => {
    render(
      <Legend
        items={[
          { label: 'Free', tone: 'free' },
          { label: 'Booked', tone: 'booked-other' },
          { label: 'Travel', tone: 'travel' },
          { label: 'Yours', tone: 'accent' },
          { label: 'Closed', tone: 'closed' },
        ]}
      />,
    )
    const items = within(screen.getByRole('list', { name: 'Legend' })).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'Free',
      'Booked',
      'Travel',
      'Yours',
      'Closed',
    ])
    expect(items[0].firstElementChild?.getAttribute('aria-hidden')).toBe('true')
  })
})
