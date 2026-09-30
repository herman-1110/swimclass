import { describe, expect, it } from 'vitest'

import { lastPaidPhrase } from './lastPaid'

describe('lastPaidPhrase', () => {
  it('reads as the phone cards draw it', () => {
    expect(lastPaidPhrase({ paidOn: '2026-08-22', method: 'cash' })).toBe('last paid 22 Aug, cash')
    expect(lastPaidPhrase({ paidOn: '2026-08-16', method: 'fpx' })).toBe('last paid 16 Aug, FPX')
  })

  it('shows the year of a payment in another year', () => {
    expect(
      lastPaidPhrase({ paidOn: '2025-12-12', method: 'transfer' }, '2026-01-05T12:00:00+08:00'),
    ).toBe('last paid 12 Dec 2025, transfer')
  })

  it('tells a starting balance from no payment at all', () => {
    expect(lastPaidPhrase({ paidOn: null, method: null, openingPaid: 4 })).toBe(
      'paid in starting balance',
    )
    expect(lastPaidPhrase({ paidOn: null, method: null })).toBe('no payments yet')
  })
})
