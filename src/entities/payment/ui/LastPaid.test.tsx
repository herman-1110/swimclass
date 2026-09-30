import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { LastPaid } from './LastPaid'

afterEach(cleanup)

describe('LastPaid', () => {
  it('puts the date over the method in the Students table', () => {
    render(<LastPaid paidOn="2026-08-22" method="cash" variant="cell" />)
    const date = screen.getByText('22 Aug')
    expect(date.nextElementSibling?.textContent).toBe('Cash')
    expect(date.nextElementSibling?.className).toContain('text-muted')
  })

  it('says where the paid lessons came from when there is no payment row', () => {
    render(
      <>
        <LastPaid paidOn={null} method={null} openingPaid={4} variant="cell" />
        <LastPaid paidOn={null} method={null} openingPaid={0} variant="cell" />
      </>,
    )
    expect(screen.getByText('Starting balance')).toBeTruthy()
    expect(screen.getByText('None yet')).toBeTruthy()
  })

  it('reads "Paid 19 Sep · FPX" in My classes, and nothing without a payment', () => {
    const { container, rerender } = render(
      <LastPaid paidOn="2026-09-19" method="fpx" variant="inline" />,
    )
    expect(container.textContent).toBe('Paid 19 Sep · FPX')
    rerender(<LastPaid paidOn={null} method={null} openingPaid={4} variant="inline" />)
    expect(container.textContent).toBe('')
  })

  it('shows the year of a payment in another year', () => {
    render(
      <LastPaid
        paidOn="2025-12-12"
        method="transfer"
        variant="cell"
        now="2026-01-05T12:00:00+08:00"
      />,
    )
    expect(screen.getByText('12 Dec 2025')).toBeTruthy()
  })
})
