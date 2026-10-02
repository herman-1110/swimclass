import { describe, expect, it } from 'vitest'

import { balanceBucket, balanceStatus, lastLessonLabel, unpaidPackageLabel } from './status'
import type { GroupBalance } from './types'

const NOW = '2026-09-26T12:00:00+08:00'

// Seed balances at DEMO_NOW (data-contracts Appendix C; coach-students spec §8).
const paid: GroupBalance = {
  group_id: 'c0000000-0000-4000-8000-000000000006',
  account_id: 'a0000000-0000-4000-8000-000000000006',
  package_size: 4,
  paid_lessons: 4,
  used_lessons: 1,
  booked_lessons: 1,
  package_no: 1,
  used_in_package: 1,
  booked_in_package: 1,
  left_in_package: 2,
  unpaid: false,
  unpaid_since: null,
  can_still_book: 6,
  last_lesson_at: null,
  last_paid_on: '2026-09-18',
  last_payment_method: 'cash',
}
const hana: GroupBalance = {
  ...paid,
  paid_lessons: 20,
  used_lessons: 20,
  booked_lessons: 2,
  unpaid: true,
  unpaid_since: '2026-09-26T11:30:00+00:00',
}
const weiJie: GroupBalance = {
  ...paid,
  paid_lessons: 4,
  used_lessons: 6,
  booked_lessons: 1,
  unpaid: true,
  unpaid_since: '2026-09-18T11:30:00+00:00',
}
const priya: GroupBalance = {
  ...paid,
  paid_lessons: 16,
  used_lessons: 14,
  booked_lessons: 2,
  last_lesson_at: '2026-10-01T09:30:00+00:00',
}

describe('balanceStatus', () => {
  it('dates an unpaid group by its first unpaid lesson', () => {
    expect(balanceStatus(hana, NOW)).toEqual({
      label: 'Unpaid',
      note: 'Starts today',
      noteTone: 'muted',
    })
    expect(balanceStatus(weiJie, NOW).note).toBe('Since 18 Sep')
    expect(balanceStatus(hana, '2026-09-26T20:00:00+08:00').note).toBe('Since today')
    expect(balanceStatus({ ...hana, unpaid_since: '2026-10-03T09:00:00+00:00' }, NOW).note).toBe(
      'Starts 3 Oct',
    )
    expect(balanceStatus({ ...weiJie, unpaid_since: null }, NOW).note).toBe('From starting balance')
  })

  it('marks a group on its last paid lesson in orange', () => {
    expect(balanceStatus(priya, NOW)).toEqual({
      label: 'Paid',
      note: 'Last lesson 1 Oct',
      noteTone: 'warn',
    })
    expect(balanceStatus({ ...priya, last_lesson_at: '2026-09-26T09:00:00+00:00' }, NOW).note).toBe(
      'Last lesson today',
    )
  })

  it('calls a group with no lesson used yet a new student', () => {
    expect(balanceStatus({ ...paid, used_lessons: 0 }, NOW).note).toBe('New student')
  })

  it('has no note for a paid group in the middle of its package', () => {
    expect(balanceStatus(paid, NOW)).toEqual({ label: 'Paid', note: null, noteTone: 'muted' })
  })

  it('doesn’t call a group Paid when no payment covers its package', () => {
    // A new group added with "First package already paid" left unticked.
    const neverPaid = { ...paid, paid_lessons: 0, used_lessons: 0, booked_lessons: 0 }
    expect(balanceStatus(neverPaid, NOW)).toEqual({
      label: null,
      note: 'New student',
      noteTone: 'muted',
    })
    // Every paid lesson used, none booked.
    const usedUp = { ...paid, used_lessons: 4, booked_lessons: 0, package_no: 2 }
    expect(balanceStatus(usedUp, NOW)).toEqual({ label: null, note: null, noteTone: 'muted' })
    expect(balanceBucket(neverPaid)).toBe('paid')
  })

  it('shows the year of a date in another year', () => {
    expect(balanceStatus({ ...weiJie, unpaid_since: '2025-12-18T11:30:00+00:00' }, NOW).note).toBe(
      'Since 18 Dec 2025',
    )
  })
})

describe('balanceBucket', () => {
  it('puts unpaid groups first, then those on their last lesson', () => {
    expect(balanceBucket(hana)).toBe('unpaid')
    expect(balanceBucket(priya)).toBe('last-lesson')
    expect(balanceBucket(paid)).toBe('paid')
  })
})

describe('Needs attention lines', () => {
  it('names the unpaid package and the lessons used past what’s paid', () => {
    expect(unpaidPackageLabel(hana)).toBe('Package 6 unpaid')
    expect(unpaidPackageLabel(weiJie)).toBe('Package 2 unpaid · 2 used')
  })

  it('names the last paid lesson’s package and day', () => {
    expect(lastLessonLabel(priya)).toBe('Last lesson of Package 4 on Thu 1 Oct')
    expect(
      lastLessonLabel({
        package_size: 4,
        paid_lessons: 8,
        last_lesson_at: '2026-10-04T09:00:00+00:00',
      }),
    ).toBe('Last lesson of Package 2 on Sun 4 Oct')
    expect(lastLessonLabel(paid)).toBeNull()
  })
})
