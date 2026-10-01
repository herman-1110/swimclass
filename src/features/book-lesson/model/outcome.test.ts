import { describe, expect, it } from 'vitest'

import type { GroupBalance } from '@/entities/balance'
import type { Slot } from '@/entities/slot'
import { AppError } from '@/shared/api/rpc'

import {
  bookedOutcome,
  bookedPackageLine,
  type Choice,
  choiceKey,
  followChoice,
  type Outcome,
  outcomeFits,
  type RefusedOutcome,
  sameChoice,
} from './outcome'

const A_AND_S = 'c0000000-0000-4000-8000-000000000001'
const SOFIA = 'c0000000-0000-4000-8000-000000000002'
const TUE: Choice = { groupId: A_AND_S, day: '2026-09-29', minutes: 60, time: '19:30' }
const TUE_NO_TIME: Choice = { ...TUE, time: null }
const TUE_730: Slot = {
  day: '2026-09-29',
  starts_at: '2026-09-29T11:30:00+00:00',
  ok: true,
  reason: null,
  detail: null,
}
const BALANCE: GroupBalance = {
  group_id: A_AND_S,
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
const BOOKED = {
  groupId: A_AND_S,
  startsAt: TUE_730.starts_at,
  minutes: 60,
  names: 'Aiman & Sofia',
}

function refused(code: string, choice: Choice = TUE): RefusedOutcome {
  return { kind: 'refused', choice, error: new AppError(code), slot: TUE_730 }
}

/** Follows a run of choices, as the summary does render by render. */
function follow(outcome: Outcome | null, ...choices: Choice[]): Outcome | null {
  return choices.reduce<Outcome | null>((kept, choice) => followChoice(kept, choice), outcome)
}

describe('choiceKey', () => {
  it('changes with the group, day, length and start', () => {
    const key = choiceKey(TUE)
    expect(choiceKey({ ...TUE })).toBe(key)
    expect(choiceKey({ ...TUE, groupId: SOFIA })).not.toBe(key)
    expect(choiceKey({ ...TUE, day: '2026-09-30' })).not.toBe(key)
    expect(choiceKey({ ...TUE, minutes: 120 })).not.toBe(key)
    expect(choiceKey(TUE_NO_TIME)).not.toBe(key)
    expect(choiceKey({ ...TUE_NO_TIME, day: null })).not.toBe(choiceKey(TUE_NO_TIME))
    expect(sameChoice(TUE, { ...TUE })).toBe(true)
  })
})

describe('bookedOutcome', () => {
  it('names the group booked and the lessons, for the choice it was booked from', () => {
    // Booked for Aiman & Sofia while Sofia is chosen (the group changed during "Booking…").
    const choice = { ...TUE, groupId: SOFIA }
    expect(bookedOutcome(BOOKED, 1, choice, BALANCE)).toEqual({
      kind: 'booked',
      choice,
      heading: 'Booked 7:30 pm for Aiman & Sofia',
      when: 'Tue 29 Sep · 7:30–8:30 pm',
      groupId: A_AND_S,
      balanceBefore: BALANCE,
    })
  })
})

describe('followChoice', () => {
  const booked = bookedOutcome(BOOKED, 1, TUE, BALANCE)

  it('keeps the success panel once the page forgets the booked time', () => {
    expect(followChoice(booked, TUE)).toBe(booked)
    expect(follow(booked, TUE_NO_TIME)).toEqual({ ...booked, choice: TUE_NO_TIME })
  })

  it('dismisses the panel for good: going back to the same choice doesn’t bring it back', () => {
    const wednesday = { ...TUE_NO_TIME, day: '2026-09-30' }
    expect(follow(booked, TUE_NO_TIME, wednesday)).toBeNull()
    expect(follow(booked, TUE_NO_TIME, wednesday, TUE_NO_TIME)).toBeNull()
    // 2 hours, then 1 hour again.
    expect(follow(booked, TUE_NO_TIME, { ...TUE_NO_TIME, minutes: 120 }, TUE_NO_TIME)).toBeNull()
    // Another group, then the same one again.
    expect(follow(booked, TUE_NO_TIME, { ...TUE_NO_TIME, groupId: SOFIA }, TUE_NO_TIME)).toBeNull()
    // The booked time itself, once forgotten, is a new choice.
    expect(follow(booked, TUE_NO_TIME, TUE)).toBeNull()
  })

  it('keeps a refusal while its start is chosen, and drops it for good once another is', () => {
    const conflict = refused('repeat_conflict')
    expect(followChoice(conflict, TUE)).toBe(conflict)
    const eight = { ...TUE, time: '20:00' }
    expect(follow(conflict, eight)).toBeNull()
    expect(follow(conflict, eight, TUE)).toBeNull()
  })

  it('keeps a refusal after invalid_length once the refreshed settings change the length', () => {
    const twoHours = { ...TUE, minutes: 120 }
    const invalid = refused('invalid_length', twoHours)
    expect(follow(invalid, TUE)).toEqual({ ...invalid, choice: TUE })
    // A length chosen after that is a new choice (choosing a length forgets the time).
    expect(follow(invalid, TUE, { ...TUE_NO_TIME, minutes: 90 })).toBeNull()
    // Other refusals belong to their length.
    expect(follow(refused('gap_after', twoHours), TUE)).toBeNull()
  })

  it('leaves nothing to follow when there is no outcome', () => {
    expect(followChoice(null, TUE)).toBeNull()
  })
})

describe('outcomeFits', () => {
  it('fits a refusal to the refused start only, on its group and day', () => {
    const gap = refused('gap_after')
    expect(outcomeFits(gap, TUE)).toBe(true)
    expect(outcomeFits(gap, TUE_NO_TIME)).toBe(false)
    expect(outcomeFits(gap, { ...TUE, groupId: SOFIA })).toBe(false)
    expect(outcomeFits(gap, { ...TUE, day: '2026-10-06' })).toBe(false)
  })
})

describe('bookedPackageLine', () => {
  const booked = bookedOutcome(BOOKED, 1, TUE, BALANCE)

  it('waits for the refreshed balance, and shows its package', () => {
    expect(bookedPackageLine(booked, BALANCE)).toBeNull()
    const refreshed = { ...BALANCE, booked_lessons: 3, booked_in_package: 3, left_in_package: 1 }
    expect(bookedPackageLine(booked, refreshed)).toBe(
      'Package 4 · 0 used · 3 booked · 1 left to book',
    )
  })

  it('stays out while another group is shown', () => {
    expect(bookedPackageLine(booked, { ...BALANCE, group_id: SOFIA })).toBeNull()
  })
})
