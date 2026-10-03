import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { GroupBalance } from '../model/types'
import { PackageSummary } from './PackageSummary'

afterEach(cleanup)

// Seed balances at DEMO_NOW (data-contracts Appendix C).
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
const sofia: GroupBalance = {
  ...aimanSofia,
  paid_lessons: 8,
  used_lessons: 7,
  booked_lessons: 1,
  package_no: 2,
  used_in_package: 3,
  booked_in_package: 1,
  left_in_package: 0,
  last_lesson_at: '2026-10-04T09:00:00+00:00',
}
const hana: GroupBalance = { ...aimanSofia, package_no: 6, unpaid: true }

const NOTE = 'New bookings start Package 3. Pay for it before or at its first lesson.'

function segments(container: HTMLElement) {
  return [...container.querySelectorAll('[aria-hidden="true"] > span')].map((segment) =>
    segment.className.includes('bg-accent')
      ? 'used'
      : segment.className.includes('bg-seg-booked')
        ? 'booked'
        : 'free',
  )
}

describe('PackageSummary on Book', () => {
  it('shows the type and package, Paid, the bar and the counts (Main.dc.html)', () => {
    const { container } = render(<PackageSummary balance={aimanSofia} typeLabel="1-to-2" />)
    expect(screen.getByText('1-to-2 · Package 4')).toBeTruthy()
    expect(screen.getByText('Paid').className).toContain('text-muted')
    expect(screen.getByText('0 used · 2 booked · 2 left to book')).toBeTruthy()
    expect(segments(container)).toEqual(['booked', 'booked', 'free', 'free'])
  })

  it('adds the orange note it is given', () => {
    render(<PackageSummary balance={sofia} typeLabel="1-to-1" note={NOTE} />)
    expect(screen.getByText('3 used · 1 booked · fully booked')).toBeTruthy()
    expect(screen.getByText(NOTE).className).toContain('text-warn')
  })

  it('writes Unpaid in orange', () => {
    render(<PackageSummary balance={hana} typeLabel="1-to-1" />)
    expect(screen.getByText('Unpaid').className).toContain('text-warn')
    expect(screen.queryByText('Paid')).toBeNull()
  })

  it('says Paid for a paid package even when a lesson booked past it isn’t paid', () => {
    // TECH_SPEC §10's Sofia case: Package 2 is paid and full, and an extra booking starts
    // Package 3, which isn't. The card names Package 2; the note speaks for Package 3. My
    // classes' pill, which is about the group, says Unpaid.
    const extra: GroupBalance = { ...sofia, booked_lessons: 2, unpaid: true }
    render(<PackageSummary balance={extra} typeLabel="1-to-1" note={NOTE} />)
    expect(screen.getByText('1-to-1 · Package 2')).toBeTruthy()
    expect(screen.getByText('Paid').className).toContain('text-muted')
    cleanup()
    render(<PackageSummary variant="account" balance={extra} typeLabel="1-to-1" names="Sofia" />)
    expect(screen.getByText('Unpaid').className).toContain('bg-warn-tint')
  })

  it('says Unpaid for a package no payment covers', () => {
    // A new group the coach added with "First package already paid" left unticked.
    const neverPaid: GroupBalance = {
      ...aimanSofia,
      paid_lessons: 0,
      used_lessons: 0,
      booked_lessons: 0,
      package_no: 1,
      booked_in_package: 0,
      left_in_package: 4,
    }
    render(<PackageSummary balance={neverPaid} typeLabel="1-to-1" note={NOTE} />)
    expect(screen.getByText('1-to-1 · Package 1')).toBeTruthy()
    expect(screen.queryByText('Paid')).toBeNull()
    // Herman, 2 Oct 2026: not paid yet says Unpaid, in orange.
    expect(screen.getByText('Unpaid').className).toContain('text-warn')
    expect(screen.getByText('0 used · 0 booked · 4 left to book')).toBeTruthy()
  })
})

describe('PackageSummary on My classes', () => {
  it('shows the names, the tag, the last payment and the package in the caption', () => {
    render(
      <PackageSummary
        variant="account"
        balance={aimanSofia}
        typeLabel="1-to-2"
        names="Aiman & Sofia"
        lastPaid={<span>Paid 19 Sep · FPX</span>}
      />,
    )
    expect(screen.getByText('Aiman & Sofia')).toBeTruthy()
    expect(screen.getByText('1-to-2')).toBeTruthy()
    expect(screen.getByText('Paid 19 Sep · FPX')).toBeTruthy()
    expect(screen.getByText('Package 4 · 0 used · 2 booked · 2 left to book')).toBeTruthy()
  })

  it('shows the Unpaid pill in place of the last payment', () => {
    render(
      <PackageSummary
        variant="account"
        balance={hana}
        typeLabel="1-to-1"
        names="Hana"
        lastPaid={<span>Paid 22 Aug · Cash</span>}
      />,
    )
    expect(screen.getByText('Unpaid').className).toContain('bg-warn-tint')
    expect(screen.queryByText('Paid 22 Aug · Cash')).toBeNull()
  })

  it('shows how to pay under a note, keeping the coach’s text', () => {
    const { rerender } = render(
      <PackageSummary
        variant="account"
        balance={sofia}
        typeLabel="1-to-1"
        names="Sofia"
        note={NOTE}
        howToPay={'  Bank transfer to Maybank 1234.\nOr cash at the pool.  '}
      />,
    )
    const box = screen.getByText('How to pay:').parentElement
    expect(box?.textContent).toBe(
      'How to pay: Bank transfer to Maybank 1234.\nOr cash at the pool.',
    )
    expect(box?.className).toContain('whitespace-pre-line')

    rerender(
      <PackageSummary
        variant="account"
        balance={aimanSofia}
        typeLabel="1-to-2"
        names="Aiman & Sofia"
        howToPay="Bank transfer to Maybank 1234."
      />,
    )
    expect(screen.queryByText('How to pay:')).toBeNull()
  })

  it('hides how to pay while the coach has written nothing', () => {
    render(
      <PackageSummary
        variant="account"
        balance={sofia}
        typeLabel="1-to-1"
        names="Sofia"
        note={NOTE}
        howToPay="   "
      />,
    )
    expect(screen.getByText(NOTE)).toBeTruthy()
    expect(screen.queryByText('How to pay:')).toBeNull()
  })
})
