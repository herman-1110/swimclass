import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SectionLabel } from './SectionLabel'
import { SectionTitle } from './SectionTitle'

afterEach(cleanup)

describe('SectionTitle', () => {
  it('is an h2 that can name its section, with its note under it', () => {
    render(
      <section aria-labelledby="rules-title">
        <SectionTitle id="rules-title" note="What customers can pick, and when they can change it.">
          Booking rules
        </SectionTitle>
      </section>,
    )
    const heading = screen.getByRole('heading', { level: 2, name: 'Booking rules' })
    expect(screen.getByRole('region', { name: 'Booking rules' })).toBeTruthy()
    expect(heading.nextElementSibling?.textContent).toBe(
      'What customers can pick, and when they can change it.',
    )
  })

  it('can be an h3', () => {
    render(<SectionTitle as="h3">Saturday 3 Oct</SectionTitle>)
    expect(screen.getByRole('heading', { level: 3, name: 'Saturday 3 Oct' })).toBeTruthy()
  })
})

describe('SectionLabel', () => {
  it('is a paragraph unless it heads a section', () => {
    render(
      <>
        <SectionLabel>Other adjustments</SectionLabel>
        <SectionLabel as="h2" className="mb-1">
          Upcoming
        </SectionLabel>
      </>,
    )
    expect(screen.getByText('Other adjustments').tagName).toBe('P')
    const heading = screen.getByRole('heading', { level: 2, name: 'Upcoming' })
    expect(heading.className).toBe('text-label font-medium text-muted mb-1')
  })
})
