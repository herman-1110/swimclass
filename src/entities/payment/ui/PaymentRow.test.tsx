import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { Payment } from '../model/types'
import { PaymentRow } from './PaymentRow'

afterEach(cleanup)

// meiling's payment for Aiman & Sofia (seed e0…01).
const payment: Payment = {
  id: 'e0000000-0000-4000-8000-000000000001',
  group_id: 'c0000000-0000-4000-8000-000000000001',
  lessons: 4,
  amount_cents: 40000,
  method: 'fpx',
  paid_on: '2026-09-19',
  note: null,
  created_at: '2026-09-29T16:05:07.107+00:00',
}
const free: Payment = {
  ...payment,
  lessons: 1,
  amount_cents: 0,
  method: 'free',
  paid_on: '2026-09-26',
  note: 'Makeup',
}

describe('PaymentRow', () => {
  it('shows a receipt in My classes: date, group and lessons, method, amount', () => {
    render(
      <ul role="list">
        <PaymentRow payment={payment} names="Aiman & Sofia" typeLabel="1-to-2" />
      </ul>,
    )
    const row = screen.getByRole('listitem')
    expect(screen.getByText('19 Sep 2026')).toBeTruthy()
    expect(screen.getByText('Aiman & Sofia · 1-to-2 · 4 lessons')).toBeTruthy()
    expect(screen.getByText('FPX')).toBeTruthy()
    expect(screen.getByText('RM 400')).toBeTruthy()
    expect(row.textContent).not.toContain('Makeup')
  })

  it('says Free for a free lesson', () => {
    render(
      <ul role="list">
        <PaymentRow payment={free} names="Hana" typeLabel="1-to-1" />
      </ul>,
    )
    expect(screen.getByText('Hana · 1-to-1 · 1 lesson')).toBeTruthy()
    expect(screen.getByText('Free lesson')).toBeTruthy()
    expect(screen.getByText('Free')).toBeTruthy()
  })

  it('shows the amount first, then the date and method, and the note in the coach’s History', () => {
    render(
      <ul role="list">
        <PaymentRow payment={payment} variant="history" />
        <PaymentRow payment={free} variant="history" />
      </ul>,
    )
    expect(screen.getByText('RM 400 · 4 lessons')).toBeTruthy()
    expect(screen.getByText('19 Sep · FPX')).toBeTruthy()
    expect(screen.getByText('Free · 1 lesson')).toBeTruthy()
    expect(screen.getByText('26 Sep · Free lesson')).toBeTruthy()
    expect(screen.getByText('Makeup')).toBeTruthy()
  })
})
