import { describe, expect, it } from 'vitest'

import { registerAllChinese } from '@/shared/i18n/registerAllChinese'

import { accountPackageNote, bookPackageNote } from './notes'
import type { GroupBalance } from './types'

const NOW = '2026-09-26T12:00:00+08:00'

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
  group_id: 'c0000000-0000-4000-8000-000000000002',
  paid_lessons: 8,
  used_lessons: 7,
  booked_lessons: 1,
  package_no: 2,
  used_in_package: 3,
  booked_in_package: 1,
  left_in_package: 0,
  can_still_book: 4,
  last_lesson_at: '2026-10-04T09:00:00+00:00',
  last_paid_on: '2026-08-29',
  last_payment_method: 'transfer',
}
const hana: GroupBalance = {
  ...aimanSofia,
  paid_lessons: 20,
  used_lessons: 20,
  booked_lessons: 2,
  package_no: 6,
  unpaid: true,
  unpaid_since: '2026-09-26T11:30:00+00:00',
  can_still_book: 2,
}
const weiJie: GroupBalance = {
  ...aimanSofia,
  paid_lessons: 4,
  used_lessons: 6,
  booked_lessons: 1,
  package_no: 2,
  used_in_package: 2,
  booked_in_package: 1,
  left_in_package: 1,
  unpaid: true,
  unpaid_since: '2026-09-18T11:30:00+00:00',
  can_still_book: 1,
}
const nurul: GroupBalance = { ...weiJie, used_lessons: 2, package_no: 1, unpaid: false }
/** A group the coach has just added, with "First package already paid" left unticked. */
const neverPaid: GroupBalance = {
  ...aimanSofia,
  paid_lessons: 0,
  used_lessons: 0,
  booked_lessons: 0,
  package_no: 1,
  used_in_package: 0,
  booked_in_package: 0,
  left_in_package: 4,
  can_still_book: 4,
  last_paid_on: null,
  last_payment_method: null,
}
/** Every paid lesson used, none booked: the package card is empty again (left 4). */
const usedUpExactly: GroupBalance = {
  ...neverPaid,
  paid_lessons: 4,
  used_lessons: 4,
  package_no: 2,
  can_still_book: 4,
}

describe('bookPackageNote', () => {
  it('says nothing while the package has lessons left to book', () => {
    expect(bookPackageNote(aimanSofia, 40000)).toBeNull()
    expect(bookPackageNote(hana, 24000)).toBeNull()
  })

  it('says nothing while the next lesson is paid for, though the package is fully booked', () => {
    // Priya after the coach adds a free lesson: 14 used + 2 booked of 17 paid.
    const freeLesson = { ...sofia, paid_lessons: 17, used_lessons: 14, booked_lessons: 2 }
    expect(bookPackageNote({ ...freeLesson, package_no: 4 }, 24000)).toBeNull()
  })

  it('asks for a payment when no payment covers the next lesson, as My classes does', () => {
    expect(bookPackageNote(neverPaid, 24000)).toBe(
      'New bookings start Package 1. Pay RM 240 before or at its first lesson.',
    )
    expect(bookPackageNote(usedUpExactly, null)).toBe(
      'New bookings start Package 2. Pay for it before or at its first lesson.',
    )
  })

  it('names the package new bookings start, and its price', () => {
    expect(bookPackageNote(sofia, 24000)).toBe(
      'New bookings start Package 3. Pay RM 240 before or at its first lesson.',
    )
    expect(
      bookPackageNote({ ...sofia, paid_lessons: 16, used_lessons: 14, booked_lessons: 2 }, 24050),
    ).toBe('New bookings start Package 5. Pay RM 240.50 before or at its first lesson.')
  })

  it('leaves the amount out while no price is set (book spec C10)', () => {
    expect(bookPackageNote(sofia, null)).toBe(
      'New bookings start Package 3. Pay for it before or at its first lesson.',
    )
  })

  it('tells a group that can book nothing more to pay first', () => {
    expect(bookPackageNote({ ...sofia, can_still_book: 0 }, 24000)).toBe(
      'Pay for the current package before booking more lessons.',
    )
  })
})

describe('accountPackageNote', () => {
  const input = { names: 'Sofia', typeLabel: '1-to-1', priceCents: null, now: NOW }

  it('says nothing while the next lesson is paid for', () => {
    expect(accountPackageNote(aimanSofia, { ...input, names: 'Aiman & Sofia' })).toBeNull()
    expect(accountPackageNote(nurul, { ...input, names: 'Nurul' })).toBeNull()
  })

  it('agrees with Book about a group no payment covers', () => {
    expect(accountPackageNote(neverPaid, input)).toBe(
      'Sofia’s next 1-to-1 lesson starts Package 1. Pay before or at its first lesson.',
    )
    expect(accountPackageNote(usedUpExactly, input)).toBe(
      'Sofia’s next 1-to-1 lesson starts Package 2. Pay before or at its first lesson.',
    )
  })

  it('names the next package after the last paid lesson (the drawing)', () => {
    expect(accountPackageNote(sofia, input)).toBe(
      'After 4 Oct, Sofia’s next 1-to-1 lesson starts Package 3. Pay before or at its first lesson.',
    )
    expect(accountPackageNote(sofia, { ...input, priceCents: 24000 })).toBe(
      'After 4 Oct, Sofia’s next 1-to-1 lesson starts Package 3. Pay RM 240 before or at its first lesson.',
    )
  })

  it('starts with the names when no paid lesson is left ahead', () => {
    const allUsed = { ...sofia, used_lessons: 8, booked_lessons: 0, last_lesson_at: null }
    expect(accountPackageNote(allUsed, input)).toBe(
      'Sofia’s next 1-to-1 lesson starts Package 3. Pay before or at its first lesson.',
    )
  })

  it('asks to pay before that lesson when the paid lessons end mid-package', () => {
    const freeLesson = { ...sofia, paid_lessons: 9, used_lessons: 8, booked_lessons: 1 }
    expect(accountPackageNote(freeLesson, input)).toBe(
      'After 4 Oct, Sofia’s next 1-to-1 lesson isn’t paid yet. Pay before or at that lesson.',
    )
  })

  it('asks to pay before the first unpaid lesson while it is still ahead', () => {
    expect(accountPackageNote(hana, { ...input, names: 'Hana' })).toBe(
      'Package 6 isn’t paid yet. Pay before or at its first lesson.',
    )
    expect(accountPackageNote(hana, { ...input, names: 'Hana', priceCents: 24000 })).toBe(
      'Package 6 isn’t paid yet. Pay RM 240 before or at its first lesson.',
    )
  })

  it('asks to pay the coach soon once the first unpaid lesson has started', () => {
    expect(accountPackageNote(weiJie, { ...input, names: 'Wei Jie' })).toBe(
      'Package 2 isn’t paid yet. Pay your coach as soon as you can.',
    )
    expect(accountPackageNote(weiJie, { ...input, names: 'Wei Jie', priceCents: 24000 })).toBe(
      'Package 2 isn’t paid yet. Pay your coach RM 240 as soon as you can.',
    )
    // Unpaid lessons in the starting balance have no start time: already owed.
    expect(accountPackageNote({ ...weiJie, unpaid_since: null }, input)).toBe(
      'Package 2 isn’t paid yet. Pay your coach as soon as you can.',
    )
  })
})

describe('accountPackageNote in Chinese', () => {
  registerAllChinese()
  const input = { names: 'Sofia', typeLabel: '一对一', priceCents: 24000, now: NOW }

  it('writes each note in Chinese', () => {
    expect(accountPackageNote(sofia, input, 'zh')).toBe(
      '10月4日之后，Sofia 的下一节一对一课从配套 3 开始。请在这个配套的第一节课之前或当天付 RM 240。',
    )
    expect(accountPackageNote(hana, { ...input, names: 'Hana', priceCents: null }, 'zh')).toBe(
      '配套 6 还没付款。请在这个配套的第一节课之前或当天付款。',
    )
    expect(accountPackageNote(weiJie, { ...input, names: 'Wei Jie' }, 'zh')).toBe(
      '配套 2 还没付款。请尽快付 RM 240 给教练。',
    )
  })
})
