import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { GroupBalance } from '../model/types'
import { BalanceStatus } from './BalanceStatus'

afterEach(cleanup)

const NOW = '2026-09-26T12:00:00+08:00'

// Seed balances at DEMO_NOW (AdminStudents.dc.html's rows).
const aimanSofia: GroupBalance = {
  group_id: 'c0000000-0000-4000-8000-000000000001',
  account_id: 'a0000000-0000-4000-8000-000000000002',
  package_size: 4,
  paid_lessons: 16,
  used_lessons: 12,
  booked_lessons: 2,
  package_no: 4,
  used_in_package: 0,
  booked_in_package: 2,
  left_in_package: 2,
  unpaid: false,
  unpaid_since: null,
  can_still_book: 6,
  last_lesson_at: null,
  last_paid_on: '2026-09-19',
  last_payment_method: 'fpx',
}
const hana: GroupBalance = {
  ...aimanSofia,
  paid_lessons: 20,
  used_lessons: 20,
  unpaid: true,
  unpaid_since: '2026-09-26T11:30:00+00:00',
}
const priya: GroupBalance = { ...aimanSofia, last_lesson_at: '2026-10-01T09:30:00+00:00' }

describe('BalanceStatus', () => {
  it('shows Unpaid with its note in the table', () => {
    render(<BalanceStatus balance={hana} now={NOW} />)
    expect(screen.getByText('Unpaid').className).toContain('bg-warn-tint')
    expect(screen.getByText('Starts today').className).toContain('text-muted')
  })

  it('shows Paid with the last lesson in orange', () => {
    render(<BalanceStatus balance={priya} now={NOW} />)
    expect(screen.getByText('Paid').className).toContain('bg-accent-tint')
    expect(screen.getByText('Last lesson 1 Oct').className).toContain('text-warn')
  })

  it('shows a paid group with no note as the pill alone', () => {
    const { container } = render(<BalanceStatus balance={aimanSofia} now={NOW} />)
    expect(container.textContent).toBe('Paid')
  })

  it('shows no pill for a group no payment covers, only its note', () => {
    const neverPaid: GroupBalance = {
      ...aimanSofia,
      paid_lessons: 0,
      used_lessons: 0,
      booked_lessons: 0,
      package_no: 1,
      booked_in_package: 0,
      left_in_package: 4,
      last_paid_on: null,
      last_payment_method: null,
    }
    const { container } = render(
      <>
        <BalanceStatus balance={neverPaid} now={NOW} />
        <BalanceStatus balance={neverPaid} now={NOW} lastPaid="no payments yet" />
      </>,
    )
    expect(screen.queryByText('Paid')).toBeNull()
    expect(screen.getByText('New student').className).toContain('text-muted')
    expect(screen.getByText('New student · no payments yet')).toBeTruthy()
    expect(container.querySelector('.rounded-full')).toBeNull()
  })

  it('joins the last payment to the note on the phone cards, as drawn', () => {
    render(
      <>
        <BalanceStatus balance={hana} now={NOW} lastPaid="last paid 22 Aug, cash" />
        <BalanceStatus balance={aimanSofia} now={NOW} lastPaid="last paid 19 Sep, FPX" />
        <BalanceStatus balance={priya} now={NOW} lastPaid="last paid 5 Sep, cash" />
      </>,
    )
    expect(screen.getByText('Starts today · last paid 22 Aug, cash')).toBeTruthy()
    expect(screen.getByText('Last paid 19 Sep, FPX').className).toContain('text-muted')
    expect(screen.getByText('Last lesson 1 Oct')).toBeTruthy()
    expect(screen.queryByText(/5 Sep/)).toBeNull()
  })
})
