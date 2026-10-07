import { describe, expect, it } from 'vitest'

import type { Slot } from '@/entities/slot'
import { AppError } from '@/shared/api/rpc'
import { GENERIC_MESSAGE, NETWORK_MESSAGE } from '@/shared/config/messages'
import { registerAllChinese } from '@/shared/i18n/registerAllChinese'

import {
  bookingSummaryState,
  cancelPolicyNote,
  lessonTitle,
  PICK_A_TIME,
  type SummaryInput,
  usageLine,
} from './summary'

// The seed's balances at Sat 26 Sep 2026 12:00 (data-contracts Appendix C), and Tue 29 Sep's
// start times for an hour (book §8.2).
const AIMAN_AND_SOFIA = {
  group: { display_names: 'Aiman & Sofia', type_label: '1-to-2' as const, size: 2 as const },
  balance: {
    package_size: 4,
    package_no: 4,
    left_in_package: 2,
    paid_lessons: 16,
    used_lessons: 12,
    booked_lessons: 2,
    can_still_book: 6,
  },
}
const SOFIA = {
  group: { display_names: 'Sofia', type_label: '1-to-1' as const, size: 1 as const },
  balance: {
    package_size: 4,
    package_no: 2,
    left_in_package: 0,
    paid_lessons: 8,
    used_lessons: 7,
    booked_lessons: 1,
    can_still_book: 4,
  },
}
const WEI_JIE = {
  group: { display_names: 'Wei Jie', type_label: '1-to-1' as const, size: 1 as const },
  balance: {
    package_size: 4,
    package_no: 2,
    left_in_package: 1,
    paid_lessons: 4,
    used_lessons: 6,
    booked_lessons: 1,
    can_still_book: 1,
  },
}
const NURUL = {
  group: { display_names: 'Nurul', type_label: '1-to-1' as const, size: 1 as const },
  balance: {
    package_size: 4,
    package_no: 1,
    left_in_package: 1,
    paid_lessons: 4,
    used_lessons: 2,
    booked_lessons: 1,
    can_still_book: 5,
  },
}

const FREE_730: Slot = {
  day: '2026-09-29',
  starts_at: '2026-09-29T11:30:00+00:00',
  ok: true,
  reason: null,
  detail: null,
}
const GAP_700: Slot = {
  day: '2026-09-29',
  starts_at: '2026-09-29T11:00:00+00:00',
  ok: false,
  reason: 'gap_after',
  detail: { ends_at: '2026-09-29T18:30:00+08:00' },
}

const messages = { gapMinutes: 60, windowWeeks: 4 }

function state(input: Partial<SummaryInput> & Pick<SummaryInput, 'group' | 'balance'>) {
  return bookingSummaryState({
    slot: FREE_730,
    minutes: 60,
    bookedBefore: null,
    repeatWeeks: 4,
    refusal: null,
    messages,
    ...input,
  })
}

describe('bookingSummaryState', () => {
  it('asks for a start time while none is picked (state A)', () => {
    expect(state({ ...AIMAN_AND_SOFIA, slot: null })).toEqual(PICK_A_TIME)
    expect(PICK_A_TIME).toEqual({
      title: 'Pick a start time',
      useLine: 'Crossed-out times clash with another lesson or travel time.',
      useTone: 'muted',
      buttonLabel: 'Pick a time',
      canBook: false,
      showRepeat: false,
    })
  })

  it('explains a crossed-out start and keeps Book unavailable (state B, DESIGN §4)', () => {
    expect(state({ ...AIMAN_AND_SOFIA, slot: GAP_700 })).toEqual({
      title: '7:00 pm isn’t available',
      useLine:
        'It starts too soon after the lesson that ends at 6:30 pm. Your coach needs 1 hour to travel between lessons.',
      useTone: 'warn',
      buttonLabel: 'Pick a free time',
      canBook: false,
      showRepeat: false,
    })
  })

  it('shows what a free start uses while the package has room (state C)', () => {
    expect(state(AIMAN_AND_SOFIA)).toEqual({
      title: 'Tue 29 Sep · 7:30–8:30 pm',
      useLine: '1-to-2 for Aiman & Sofia · uses 1 lesson from Package 4, 1 left to book after this',
      useTone: 'muted',
      buttonLabel: 'Book 7:30 pm for Aiman & Sofia',
      canBook: true,
      showRepeat: true,
    })
  })

  it('says when the lesson completes the package', () => {
    const twoHours = state({ ...AIMAN_AND_SOFIA, minutes: 120, repeatWeeks: 3 })
    expect(twoHours.title).toBe('Tue 29 Sep · 7:30–9:30 pm')
    expect(twoHours.useLine).toBe(
      '1-to-2 for Aiman & Sofia · uses 2 lessons from Package 4, completes the package',
    )
  })

  it('names both packages when a 2-hour lesson takes the last lesson of one (C18)', () => {
    // After Nurul's lesson on Sun 4 Oct: lessons 4 and 5, and only 4 are paid.
    expect(state({ ...NURUL, minutes: 120, bookedBefore: 1 }).useLine).toBe(
      '1-to-1 for Nurul · uses 2 lessons: the last of Package 1 and the first of Package 2, not paid yet',
    )
    // Before it (Tue 29 Sep): lessons 3 and 4, and Sun 4 Oct moves on to Package 2.
    expect(state({ ...NURUL, minutes: 120, bookedBefore: 0 }).useLine).toBe(
      '1-to-1 for Nurul · uses 2 lessons from Package 1, completes the package · Package 2 isn’t paid yet',
    )
  })

  it('names the next package once this one is fully booked, and whether it is paid (state D)', () => {
    expect(state(SOFIA).useLine).toBe(
      '1-to-1 for Sofia · uses 1 lesson from Package 3, not paid yet',
    )
    expect(state({ ...SOFIA, bookedBefore: 1 }).useLine).toBe(
      '1-to-1 for Sofia · uses 1 lesson from Package 3, not paid yet',
    )
    const paidAhead = { ...SOFIA.balance, paid_lessons: 12 }
    expect(state({ ...SOFIA, balance: paidAhead }).useLine).toBe(
      '1-to-1 for Sofia · uses 1 lesson from Package 3',
    )
  })

  it('numbers a lesson before one already booked as the ledger will (Sofia, Sat 3 Oct)', () => {
    // Sofia's seed balance: 7 used, Sun 4 Oct 5:00 pm booked (lesson 8, the last one paid).
    // Sat 3 Oct comes first, so it takes lesson 4 of Package 2 and Sun 4 Oct moves on to
    // Package 3, which isn't paid (My classes: "lesson 4 of 4", "Package 3, lesson 1 of 4").
    const sat700 = { ...FREE_730, day: '2026-10-03', starts_at: '2026-10-03T11:00:00+00:00' }
    expect(state({ ...SOFIA, slot: sat700, bookedBefore: 0 })).toMatchObject({
      title: 'Sat 3 Oct · 7:00–8:00 pm',
      useLine: '1-to-1 for Sofia · uses 1 lesson from Package 2 · Package 3 isn’t paid yet',
      buttonLabel: 'Book 7:00 pm for Sofia',
    })
    // Two hours: the last lesson of Package 2 and the first of Package 3, which isn't paid
    // (My classes: "last lesson of Package 2 and first of Package 3").
    expect(state({ ...SOFIA, slot: sat700, minutes: 120, bookedBefore: 0 }).useLine).toBe(
      '1-to-1 for Sofia · uses 2 lessons: the last of Package 2 and the first of Package 3, not paid yet',
    )
    // Paid ahead, moving Sun 4 Oct on costs nothing.
    const paidAhead = { ...SOFIA.balance, paid_lessons: 12 }
    expect(state({ ...SOFIA, balance: paidAhead, slot: sat700, bookedBefore: 0 }).useLine).toBe(
      '1-to-1 for Sofia · uses 1 lesson from Package 2',
    )
  })

  it('says a lesson isn’t paid yet while its package still has room (states-14)', () => {
    // Every paid lesson used, none booked: Package 2 has 4 to book, and none is paid.
    const exact = {
      group: { display_names: 'Elena', type_label: '1-to-1' as const, size: 1 as const },
      balance: {
        package_size: 4,
        package_no: 2,
        left_in_package: 4,
        paid_lessons: 4,
        used_lessons: 4,
        booked_lessons: 0,
        can_still_book: 4,
      },
    }
    expect(state({ ...exact, bookedBefore: 0 }).useLine).toBe(
      '1-to-1 for Elena · uses 1 lesson from Package 2, not paid yet, 3 left to book after this',
    )
    // A group nothing has paid for yet.
    const neverPaid = {
      group: { display_names: 'Aiman', type_label: '1-to-1' as const, size: 1 as const },
      balance: { ...exact.balance, package_no: 1, paid_lessons: 0, used_lessons: 0 },
    }
    expect(state(neverPaid).useLine).toBe(
      '1-to-1 for Aiman · uses 1 lesson from Package 1, not paid yet, 3 left to book after this',
    )
    // Wei Jie has used more than is paid: his last lesson of Package 2 isn't paid either.
    expect(state({ ...WEI_JIE, bookedBefore: 0 }).useLine).toBe(
      '1-to-1 for Wei Jie · uses 1 lesson from Package 2, not paid yet, completes the package',
    )
  })

  it('hides "Repeat weekly" unless more than one week can be booked', () => {
    expect(state({ ...AIMAN_AND_SOFIA, repeatWeeks: 1 }).showRepeat).toBe(false)
    expect(state({ ...AIMAN_AND_SOFIA, repeatWeeks: 2 }).showRepeat).toBe(true)
  })

  it('asks to pay first when the credit is too small for the length (state E)', () => {
    expect(state({ ...WEI_JIE, minutes: 120, repeatWeeks: 0 })).toEqual({
      title: 'Tue 29 Sep · 7:30–9:30 pm',
      useLine: 'Pay for the current package before booking more lessons.',
      useTone: 'warn',
      buttonLabel: 'Pay for the current package first',
      canBook: false,
      showRepeat: false,
    })
    // One hour still fits Wei Jie's one lesson of credit.
    expect(state({ ...WEI_JIE, repeatWeeks: 1 }).canBook).toBe(true)
  })

  it('shows a clash the server found as state B, even on a start that looked free', () => {
    const refusal = new AppError('overlap_other', {
      starts_at: '2026-09-29T19:00:00+08:00',
      ends_at: '2026-09-29T20:00:00+08:00',
    })
    expect(state({ ...AIMAN_AND_SOFIA, refusal })).toMatchObject({
      title: '7:30 pm isn’t available',
      useLine: 'It overlaps another lesson at 7:00–8:00 pm.',
      useTone: 'warn',
      buttonLabel: 'Pick a free time',
      canBook: false,
    })
  })

  it('keeps Book and the checkbox after repeat_conflict, with its words (book §5.3.3)', () => {
    const refusal = new AppError('repeat_conflict', { dates: ['2026-10-04'], clashes: [] })
    expect(state({ ...AIMAN_AND_SOFIA, refusal })).toEqual({
      title: 'Tue 29 Sep · 7:30–8:30 pm',
      useLine:
        'These weeks clash: Sun 4 Oct. Nothing was booked. Try another time or turn off repeat.',
      useTone: 'warn',
      buttonLabel: 'Book 7:30 pm for Aiman & Sofia',
      canBook: true,
      showRepeat: true,
    })
  })

  it('keeps Book unavailable after group_inactive until the choice changes', () => {
    const paused = state({ ...AIMAN_AND_SOFIA, refusal: new AppError('group_inactive') })
    expect(paused.useLine).toBe(
      'Your coach has paused bookings for this group. Message your coach.',
    )
    expect(paused.canBook).toBe(false)
  })

  it('lets Book be pressed again after a network failure or any other refusal', () => {
    const offline = state({ ...AIMAN_AND_SOFIA, refusal: new AppError('network') })
    expect(offline).toMatchObject({ useLine: NETWORK_MESSAGE, useTone: 'warn', canBook: true })
    const other = state({ ...AIMAN_AND_SOFIA, refusal: new AppError('not_your_group') })
    expect(other).toMatchObject({ useLine: GENERIC_MESSAGE, canBook: true })
  })
})

describe('usageLine', () => {
  it('counts the lessons left after this one', () => {
    const oneBooked = { ...AIMAN_AND_SOFIA.balance, booked_lessons: 1, left_in_package: 3 }
    expect(usageLine(AIMAN_AND_SOFIA.group, oneBooked, 1)).toBe(
      '1-to-2 for Aiman & Sofia · uses 1 lesson from Package 4, 2 left to book after this',
    )
  })

  it('counts the same before or after the lessons already booked while the package has room', () => {
    // Aiman & Sofia's two booked lessons are Sat 26 Sep and Sat 3 Oct.
    for (const bookedBefore of [0, 1, 2]) {
      expect(usageLine(AIMAN_AND_SOFIA.group, AIMAN_AND_SOFIA.balance, 1, bookedBefore)).toBe(
        '1-to-2 for Aiman & Sofia · uses 1 lesson from Package 4, 1 left to book after this',
      )
    }
  })
})

describe('lessonTitle', () => {
  it('writes the day and the time range in Malaysia time', () => {
    expect(lessonTitle(FREE_730, 60)).toBe('Tue 29 Sep · 7:30–8:30 pm')
    expect(lessonTitle({ day: '2026-10-03', starts_at: '2026-10-03T03:00:00+00:00' }, 60)).toBe(
      'Sat 3 Oct · 11:00 am–12:00 pm',
    )
  })
})

describe('cancelPolicyNote', () => {
  it('reads the cutoff from the settings (C11)', () => {
    expect(cancelPolicyNote(6)).toBe('Free to cancel or reschedule up to 6 hours before.')
    expect(cancelPolicyNote(1)).toBe('Free to cancel or reschedule up to 1 hour before.')
  })

  it('says "until the lesson starts" with no cutoff (Q16)', () => {
    expect(cancelPolicyNote(0)).toBe('Free to cancel or reschedule until the lesson starts.')
  })
})

describe('in Chinese', () => {
  registerAllChinese()
  const zh = (input: Partial<SummaryInput> & Pick<SummaryInput, 'group' | 'balance'>) =>
    state({ ...input, language: 'zh' })

  it('writes the lesson, what it uses and the button in Chinese', () => {
    expect(zh(AIMAN_AND_SOFIA)).toMatchObject({
      title: '9月29日 周二 · 晚上7:30–8:30',
      useLine: '一对二 · Aiman & Sofia · 用配套 4 的 1 节课，之后还可预约 1 节',
      buttonLabel: '为 Aiman & Sofia 预约晚上7:30',
    })
    expect(zh({ ...NURUL, minutes: 120, bookedBefore: 1 }).useLine).toBe(
      '一对一 · Nurul · 用 2 节课：配套 1 的最后一节和配套 2 的第一节（还没付款）',
    )
    expect(zh({ ...AIMAN_AND_SOFIA, slot: null })).toMatchObject({ title: '请选择开始时间' })
  })

  it('explains a crossed-out start with the Chinese reason', () => {
    expect(zh({ ...AIMAN_AND_SOFIA, slot: GAP_700 })).toMatchObject({
      title: '晚上7:00不可预约',
      useLine: '这节课离晚上6:30结束的课太近。教练需要 1 小时 赶到下一节课。',
      buttonLabel: '请选一个空闲时间',
    })
  })

  it('writes the cancel note with the cutoff in Chinese', () => {
    expect(cancelPolicyNote(6, 'zh')).toBe('开课 6 小时前都可以免费取消或改期。')
    expect(cancelPolicyNote(0, 'zh')).toBe('开课前都可以免费取消或改期。')
  })
})
