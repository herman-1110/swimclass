import { beforeAll, describe, expect, it } from 'vitest'

import { logIn } from '@/shared/api/auth'
import { AppError, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import {
  clashLines,
  DAY_FULLY_BOOKED_MESSAGE,
  GENERIC_MESSAGE,
  messageFor,
  type MessageOptions,
  messageParts,
  MIN_PASSWORD_LENGTH,
  NETWORK_MESSAGE,
  NO_GROUPS_MESSAGE,
  reasonMessage,
} from './messages'

// The seed's settings (get_public_settings): travel gap 60, cutoff 6, window 4 weeks.
const SETTINGS = { gapMinutes: 60, cutoffHours: 6, windowWeeks: 4 }
const CUSTOMER: MessageOptions = { audience: 'customer', ...SETTINGS }
const COACH: MessageOptions = {
  audience: 'coach',
  ...SETTINGS,
  fieldLabels: { travel_gap_minutes: 'Travel gap', lesson_lengths: 'Lesson lengths' },
}

// Details as the database sends them: MYT text with an offset (TECH_SPEC §5.1).
const OVERLAP = { starts_at: '2026-09-29T17:30:00+08:00', ends_at: '2026-09-29T18:30:00+08:00' }
const MINE = {
  starts_at: '2026-10-03T09:00:00+08:00',
  ends_at: '2026-10-03T10:00:00+08:00',
  names: 'Aiman & Sofia',
}
const GAP_AFTER = { ends_at: '2026-09-29T18:30:00+08:00' }
const GAP_BEFORE = { starts_at: '2026-09-30T20:30:00+08:00' }
const SOFIA_CLASH = {
  date: '2026-10-04',
  reason: 'overlap_mine',
  detail: {
    starts_at: '2026-10-04T17:00:00+08:00',
    ends_at: '2026-10-04T18:00:00+08:00',
    names: 'Sofia',
  },
}
const REPEAT = { dates: ['2026-10-04'], clashes: [SOFIA_CLASH] }

type Case = [code: string, detail: Record<string, unknown>, words: string]

const CUSTOMER_CASES: Case[] = [
  ['overlap_mine', MINE, 'It overlaps Aiman & Sofia’s lesson at 9:00–10:00 am.'],
  ['overlap_other', OVERLAP, 'It overlaps another lesson at 5:30–6:30 pm.'],
  [
    'gap_after',
    GAP_AFTER,
    'It starts too soon after the lesson that ends at 6:30 pm. Your coach needs 1 hour to travel between lessons.',
  ],
  [
    'gap_before',
    GAP_BEFORE,
    'It ends too close to the 8:30 pm lesson. Your coach needs 1 hour to travel between lessons.',
  ],
  ['outside_open_hours', {}, 'Your coach isn’t available at that time.'],
  ['outside_window', {}, 'You can book up to 4 weeks ahead.'],
  ['past', {}, 'This time has already started.'],
  [
    'credit_exceeded',
    { needed: 6, can_still_book: 4 },
    'Pay for the current package before booking more lessons.',
  ],
  [
    'repeat_conflict',
    REPEAT,
    'These weeks clash: Sun 4 Oct. Nothing was booked. Try another time or turn off repeat.',
  ],
  ['group_inactive', {}, 'Your coach has paused bookings for this group. Message your coach.'],
  [
    'locked',
    { cutoff_at: '2026-09-26T11:00:00+08:00' },
    'It’s less than 6 hours before the lesson, so it can’t be cancelled.',
  ],
  [
    'not_booked',
    { status: 'cancelled' },
    'This lesson is no longer booked. Refresh to see the latest.',
  ],
  ['not_approved', {}, 'Your coach hasn’t approved your account yet.'],
  ['invalid_login', {}, 'Wrong username or password.'],
  ['too_many_attempts', {}, 'Too many tries. Wait 15 minutes and try again.'],
  ['network', {}, 'Couldn’t reach the server. Check your connection and try again.'],
  // The auth spec's proposed wording (§5.4).
  ['weak_password', {}, 'Use at least 8 characters.'],
  ['same_password', {}, 'That’s your current password. Choose a different one.'],
  [
    'user_already_exists',
    {},
    'An account already uses that email. Log in, or use Forgot username or password.',
  ],
  ['email_address_invalid', {}, 'Enter an email address like name@example.com.'],
  [
    'over_email_send_rate_limit',
    {},
    'We can’t send another email just yet. Wait a few minutes and try again.',
  ],
  ['username_taken', {}, 'That username is taken.'],
  // The auth forms' checks before any call (the auth spec §5.4, proposed).
  ['invalid_username', {}, 'Use 3 to 30 small letters, numbers, dots or underscores.'],
  ['username_required', {}, 'Enter your username.'],
  ['password_required', {}, 'Enter your password.'],
  ['name_required', {}, 'Enter your name.'],
  ['phone_required', {}, 'Enter your phone number.'],
  ['password_mismatch', {}, 'The passwords don’t match. Type the same password twice.'],
]

const COACH_CASES: Case[] = [
  [
    'outside_open_hours',
    {},
    'It’s outside your open hours. Turn on “Outside open hours” to book it anyway.',
  ],
  [
    'off_step',
    {},
    'It starts between your usual start times. Turn on “Outside open hours” to book it anyway.',
  ],
  [
    'gap_after',
    GAP_AFTER,
    'It starts too soon after the lesson that ends at 6:30 pm. You need 1 hour to travel between lessons. Turn on “Skip travel gap” to book it anyway.',
  ],
  [
    'gap_before',
    GAP_BEFORE,
    'It ends too close to the 8:30 pm lesson. You need 1 hour to travel between lessons. Turn on “Skip travel gap” to book it anyway.',
  ],
  [
    'credit_exceeded',
    { needed: 2, can_still_book: 1 },
    'This group can book 1 more lesson before paying. Record a payment first, or choose “Book anyway”.',
  ],
  ['not_started', {}, 'This lesson hasn’t started yet. Cancel it instead.'],
  [
    'not_booked',
    { status: 'cancelled' },
    'This lesson is already cancelled. Refresh to see the latest.',
  ],
  ['invalid_reason', {}, 'The reason is too long. Shorten it to 500 characters.'],
  [
    'price_not_set',
    {},
    'No price is set for this lesson type. Type the amount, or set the price in Settings.',
  ],
  ['invalid_lessons', {}, 'A payment needs at least 1 lesson. Change the number of lessons.'],
  ['invalid_amount', {}, 'The amount can’t be negative. Enter RM 0 or more.'],
  ['invalid_method', {}, 'Choose how they paid: Cash, Transfer or FPX.'],
  ['invalid_date', {}, 'The payment date is in the future. Pick today or an earlier date.'],
  ['invalid_note', {}, 'The note is too long. Shorten it to 500 characters.'],
  [
    'duplicate_group',
    { group_id: 'c0000000-0000-4000-8000-000000000001' },
    'These students already have an active group. Use that group, or deactivate it first.',
  ],
  [
    'has_upcoming_lessons',
    { count: 2 },
    'This group has 2 upcoming lessons. Cancel them first, then deactivate it. Each cancellation emails the customer.',
  ],
  [
    'group_full',
    { max: 3 },
    'A lesson can have up to 3 students. Remove one, or change “Students per lesson” in Settings.',
  ],
  [
    'invalid_students',
    { index: 2 },
    'Student 2 is already in the list or can’t be found. Pick another student or type a new name.',
  ],
  ['invalid_name', { index: 1 }, 'Type a name for student 1 (up to 100 characters).'],
  [
    'student_other_account',
    { index: 3 },
    'Student 3 belongs to another account. Pick one of this account’s students or type a new name.',
  ],
  ['invalid_location', {}, 'Type the pool location (up to 100 characters).'],
  ['invalid_opening', {}, 'Lessons already used and paid can’t be negative. Enter 0 or more.'],
  [
    'invalid_range',
    { index: 2 },
    'The end time must be after the start time. Change it and try again.',
  ],
  [
    'invalid_rules',
    { index: 4 },
    'Open hours range 4 is incomplete. Check each day’s hours and save again.',
  ],
  ['overlapping_rules', { weekday: 1 }, 'Two ranges on Monday overlap. Change one and save again.'],
  [
    'invalid_setting',
    { field: 'travel_gap_minutes' },
    'Travel gap has a value that isn’t allowed. Check it and save again.',
  ],
  ['invalid_message', {}, 'The message must be 1 to 1000 characters. Change it and send again.'],
  // admin-accounts, for a new account on Add students (its spec §5.2.2, proposed).
  ['invalid_username', {}, 'Use 3 to 30 lowercase letters, numbers, dots or underscores.'],
  ['username_taken', {}, 'That username is taken.'],
  ['invalid_display_name', {}, 'Type their name (up to 100 characters).'],
  ['invalid_phone', {}, 'Shorten the phone number to 30 characters or fewer.'],
  ['invalid_email', {}, 'Type an email address, like name@example.com.'],
  ['email_taken', {}, 'Another account already uses this email.'],
  // The coach's forms' checks before any call (proposed in the Add students, Students,
  // Settings and Schedule specs).
  ['account_required', {}, 'Choose an account, or create a new one.'],
  ['amount_format', {}, 'Enter the amount in RM, like 240 or 240.50.'],
  ['hours_incomplete', {}, 'Choose a start and an end time.'],
  ['hours_out_of_range', {}, 'Open hours must be between 5:00 am and 11:00 pm.'],
  ['last_day_before_first', {}, 'The last day must be on or after the first day.'],
]

// Codes the customer table leaves generic on purpose (DESIGN §6's generic row), and codes in
// neither table.
const CUSTOMER_GENERIC = [
  'not_your_group',
  'not_your_booking',
  'invalid_repeat',
  'invalid_length',
  'invalid_reason',
  'not_found',
  'unknown',
  'invalid_week',
  'off_step',
  'signup_failed',
  'not_signed_in',
  'over_request_rate_limit',
  'email_address_not_authorized',
  'a_code_nobody_wrote',
]

// DESIGN §6's generic row of the coach table, and codes in neither table.
const COACH_GENERIC = [
  'not_coach',
  'not_found',
  'invalid_settings',
  'unknown_setting',
  'invalid_kind',
  'invalid_active',
  'not_customer',
  'group_inactive',
  'group_empty',
  'unknown',
  'invalid_week',
  'invalid_length',
  'invalid_repeat',
  'a_code_nobody_wrote',
]

const CUSTOMER_CODES = new Set(CUSTOMER_CASES.map(([code]) => code))
const COACH_CODES = new Set(COACH_CASES.map(([code]) => code))

describe('messageFor on customer screens (DESIGN §6, first table)', () => {
  it.each(CUSTOMER_CASES)('turns %s into its words', (code, detail, words) => {
    expect(messageFor(new AppError(code, detail), CUSTOMER)).toBe(words)
  })

  it.each(CUSTOMER_GENERIC)('gives %s the generic message', (code) => {
    expect(messageFor(new AppError(code), CUSTOMER)).toBe(GENERIC_MESSAGE)
  })

  // With the detail, settings and labels the coach's words need: only the audience differs.
  it.each(
    COACH_CASES.filter(([code]) => !CUSTOMER_CODES.has(code) && !CUSTOMER_GENERIC.includes(code)),
  )('keeps the coach’s words for %s off customer screens', (code, detail) => {
    expect(messageFor(new AppError(code, detail), { ...COACH, audience: 'customer' })).toBe(
      GENERIC_MESSAGE,
    )
  })

  it.each(
    COACH_GENERIC.filter((code) => !CUSTOMER_CODES.has(code) && !CUSTOMER_GENERIC.includes(code)),
  )('gives the coach table’s generic %s the generic message too', (code) => {
    expect(messageFor(new AppError(code), CUSTOMER)).toBe(GENERIC_MESSAGE)
  })

  it('reads customer screens by default', () => {
    expect(messageFor(new AppError('outside_open_hours'))).toBe(
      'Your coach isn’t available at that time.',
    )
    expect(messageFor(new AppError('network'))).toBe(NETWORK_MESSAGE)
  })
})

describe('messageFor on coach screens (DESIGN §6, coach table first)', () => {
  it.each(COACH_CASES)('turns %s into the coach’s words', (code, detail, words) => {
    expect(messageFor(new AppError(code, detail), COACH)).toBe(words)
  })

  it.each(COACH_GENERIC)('gives %s the generic message', (code) => {
    expect(messageFor(new AppError(code, { keys: ['id', 'updated_at'] }), COACH)).toBe(
      GENERIC_MESSAGE,
    )
  })

  it.each(
    CUSTOMER_CASES.filter(([code]) => !COACH_CODES.has(code) && !COACH_GENERIC.includes(code)),
  )('falls back to the customer table for %s', (code, detail, words) => {
    expect(messageFor(new AppError(code, detail), COACH)).toBe(words)
  })

  it.each(
    CUSTOMER_GENERIC.filter((code) => !COACH_CODES.has(code) && !COACH_GENERIC.includes(code)),
  )('gives the customer table’s generic %s the generic message too', (code) => {
    expect(messageFor(new AppError(code), COACH)).toBe(GENERIC_MESSAGE)
  })
})

describe('placeholders read naturally', () => {
  it('writes the travel gap from settings in hours or minutes', () => {
    const error = new AppError('gap_after', GAP_AFTER)
    expect(messageFor(error, { ...CUSTOMER, gapMinutes: 90 })).toBe(
      'It starts too soon after the lesson that ends at 6:30 pm. Your coach needs 90 minutes to travel between lessons.',
    )
    expect(messageFor(error, { ...COACH, gapMinutes: 120 })).toBe(
      'It starts too soon after the lesson that ends at 6:30 pm. You need 2 hours to travel between lessons. Turn on “Skip travel gap” to book it anyway.',
    )
  })

  it('writes a one-week window and a one-hour cutoff in the singular', () => {
    expect(messageFor(new AppError('outside_window'), { ...CUSTOMER, windowWeeks: 1 })).toBe(
      'You can book up to 1 week ahead.',
    )
    expect(messageFor(new AppError('locked'), { ...CUSTOMER, cutoffHours: 1 })).toBe(
      'It’s less than 1 hour before the lesson, so it can’t be cancelled.',
    )
  })

  it('writes a range across noon with am and pm on both ends', () => {
    const detail = { starts_at: '2026-10-03T11:00:00+08:00', ends_at: '2026-10-03T12:00:00+08:00' }
    expect(messageFor(new AppError('overlap_other', detail), CUSTOMER)).toBe(
      'It overlaps another lesson at 11:00 am–12:00 pm.',
    )
  })

  it('lists several clashing weeks', () => {
    const detail = { dates: ['2026-10-13', '2026-10-20'], clashes: [] }
    expect(messageFor(new AppError('repeat_conflict', detail), CUSTOMER)).toBe(
      'These weeks clash: Tue 13 Oct and Tue 20 Oct. Nothing was booked. Try another time or turn off repeat.',
    )
  })

  it('shows what the group can still book, 0 when it is past its credit', () => {
    const credit = (left: number) =>
      messageFor(new AppError('credit_exceeded', { needed: 3, can_still_book: left }), COACH)
    expect(credit(2)).toBe(
      'This group can book 2 more lessons before paying. Record a payment first, or choose “Book anyway”.',
    )
    expect(credit(0)).toContain('can book 0 more lessons before paying')
    expect(credit(-1)).toContain('can book 0 more lessons before paying')
  })

  it('writes one upcoming lesson as "it"', () => {
    expect(messageFor(new AppError('has_upcoming_lessons', { count: 1 }), COACH)).toBe(
      'This group has 1 upcoming lesson. Cancel it first, then deactivate it. Each cancellation emails the customer.',
    )
  })

  it('writes a limit of one student in the singular', () => {
    expect(messageFor(new AppError('group_full', { max: 1 }), COACH)).toBe(
      'A lesson can have up to 1 student. Remove one, or change “Students per lesson” in Settings.',
    )
  })

  it('names the weekday, 1 being Monday and 7 Sunday', () => {
    expect(messageFor(new AppError('overlapping_rules', { weekday: 7 }), COACH)).toBe(
      'Two ranges on Sunday overlap. Change one and save again.',
    )
  })

  it('says whether a lesson was cancelled or excused', () => {
    expect(messageFor(new AppError('not_booked', { status: 'excused' }), COACH)).toBe(
      'This lesson is already excused. Refresh to see the latest.',
    )
  })

  it('uses the form’s label for the setting', () => {
    expect(messageFor(new AppError('invalid_setting', { field: 'lesson_lengths' }), COACH)).toBe(
      'Lesson lengths has a value that isn’t allowed. Check it and save again.',
    )
  })

  it('asks for the password length the forms check', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8)
    expect(messageFor(new AppError('weak_password'))).toBe(
      `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    )
  })
})

describe('a code without the detail its message needs gets the generic message', () => {
  const missing: [code: string, detail: Record<string, unknown>, options: MessageOptions][] = [
    ['overlap_mine', OVERLAP, CUSTOMER],
    ['overlap_mine', { names: 'Aiman & Sofia' }, CUSTOMER],
    // The exclusion-constraint backstop raises overlap_other with no detail.
    ['overlap_other', {}, CUSTOMER],
    ['overlap_other', { starts_at: '2026-09-29', ends_at: '2026-09-29' }, CUSTOMER],
    ['overlap_other', { starts_at: 1, ends_at: 2 }, CUSTOMER],
    ['gap_after', {}, CUSTOMER],
    ['gap_before', { starts_at: 'soon' }, CUSTOMER],
    ['gap_after', GAP_AFTER, { audience: 'customer' }],
    ['gap_after', GAP_AFTER, { ...COACH, gapMinutes: 0 }],
    ['gap_before', GAP_BEFORE, { ...COACH, gapMinutes: null }],
    ['outside_window', {}, { audience: 'customer' }],
    ['locked', {}, { audience: 'customer' }],
    ['locked', {}, { ...CUSTOMER, cutoffHours: 0 }],
    ['repeat_conflict', {}, CUSTOMER],
    ['repeat_conflict', { dates: [] }, CUSTOMER],
    ['repeat_conflict', { dates: ['next Sunday'] }, CUSTOMER],
    ['repeat_conflict', { dates: [20261004] }, CUSTOMER],
    ['credit_exceeded', {}, COACH],
    ['credit_exceeded', { can_still_book: '1' }, COACH],
    ['not_booked', {}, COACH],
    ['not_booked', { status: 'booked' }, COACH],
    // “that group” links to {group_id}.
    ['duplicate_group', {}, COACH],
    ['duplicate_group', { group_id: ' ' }, COACH],
    ['has_upcoming_lessons', {}, COACH],
    ['has_upcoming_lessons', { count: 0 }, COACH],
    ['group_full', {}, COACH],
    // create_group's "not a list, or empty", set_open_hours' "not an array", the triggers.
    ['invalid_students', {}, COACH],
    ['invalid_rules', {}, COACH],
    ['student_other_account', {}, COACH],
    ['invalid_name', { index: 0 }, COACH],
    ['invalid_name', { index: '2' }, COACH],
    ['overlapping_rules', { weekday: 0 }, COACH],
    ['overlapping_rules', { weekday: 8 }, COACH],
    ['invalid_setting', {}, COACH],
    ['invalid_setting', { field: 'lesson_expiry_months' }, COACH],
    ['invalid_setting', { field: 'travel_gap_minutes' }, { audience: 'coach' }],
  ]

  it.each(missing)('%s with %o', (code, detail, options) => {
    expect(messageFor(new AppError(code, detail), options)).toBe(GENERIC_MESSAGE)
  })
})

describe('messageParts', () => {
  it('gives duplicate_group’s “that group” as a link to the group', () => {
    const error = new AppError('duplicate_group', {
      group_id: 'c0000000-0000-4000-8000-000000000001',
    })
    expect(messageParts(error, COACH)).toEqual([
      'These students already have an active group. Use ',
      { text: 'that group', groupId: 'c0000000-0000-4000-8000-000000000001' },
      ', or deactivate it first.',
    ])
  })

  it('gives the generic message when the group id is missing (no link, no “that group”)', () => {
    expect(messageParts(new AppError('duplicate_group'), COACH)).toEqual([GENERIC_MESSAGE])
  })

  it('gives every other message as one piece of text', () => {
    expect(messageParts(new AppError('invalid_note'), COACH)).toEqual([
      'The note is too long. Shorten it to 500 characters.',
    ])
    expect(messageParts(new AppError('duplicate_group', { group_id: 'x' }), CUSTOMER)).toEqual([
      GENERIC_MESSAGE,
    ])
  })
})

describe('reasonMessage', () => {
  it('explains a crossed-out time from its week_slots reason and detail', () => {
    expect(reasonMessage('gap_after', GAP_AFTER, CUSTOMER)).toBe(
      'It starts too soon after the lesson that ends at 6:30 pm. Your coach needs 1 hour to travel between lessons.',
    )
    expect(reasonMessage('overlap_mine', MINE, CUSTOMER)).toBe(
      'It overlaps Aiman & Sofia’s lesson at 9:00–10:00 am.',
    )
    expect(reasonMessage('past', null, CUSTOMER)).toBe('This time has already started.')
  })

  it('explains a coach_slot_check reason in the coach’s words', () => {
    expect(reasonMessage('off_step', null, COACH)).toBe(
      'It starts between your usual start times. Turn on “Outside open hours” to book it anyway.',
    )
    expect(reasonMessage('overlap_other', OVERLAP, COACH)).toBe(
      'It overlaps another lesson at 5:30–6:30 pm.',
    )
  })

  it('gives the generic message when the detail is missing', () => {
    expect(reasonMessage('overlap_other', null, COACH)).toBe(GENERIC_MESSAGE)
  })
})

describe('clashLines', () => {
  it('lists each clashing week with its reason', () => {
    expect(clashLines(new AppError('repeat_conflict', REPEAT), CUSTOMER)).toEqual([
      'Sun 4 Oct: It overlaps Sofia’s lesson at 5:00–6:00 pm.',
    ])
  })

  it('uses the coach’s words on coach screens, in the order the weeks come', () => {
    const detail = {
      dates: ['2026-09-29', '2026-10-06'],
      clashes: [
        { date: '2026-09-29', reason: 'overlap_other', detail: OVERLAP },
        {
          date: '2026-10-06',
          reason: 'gap_after',
          detail: { ends_at: '2026-10-06T18:30:00+08:00' },
        },
      ],
    }
    expect(clashLines(new AppError('repeat_conflict', detail), COACH)).toEqual([
      'Tue 29 Sep: It overlaps another lesson at 5:30–6:30 pm.',
      'Tue 6 Oct: It starts too soon after the lesson that ends at 6:30 pm. You need 1 hour to travel between lessons. Turn on “Skip travel gap” to book it anyway.',
    ])
  })

  it('skips clashes it can’t read', () => {
    const detail = {
      dates: ['2026-10-04'],
      clashes: [null, { reason: 'past' }, { date: 'soon', reason: 'past' }, SOFIA_CLASH],
    }
    expect(clashLines(new AppError('repeat_conflict', detail), CUSTOMER)).toEqual([
      'Sun 4 Oct: It overlaps Sofia’s lesson at 5:00–6:00 pm.',
    ])
    expect(clashLines(new AppError('repeat_conflict', { clashes: 'none' }), CUSTOMER)).toEqual([])
  })

  it('gives no lines for any other error', () => {
    expect(clashLines(new AppError('overlap_other', OVERLAP), CUSTOMER)).toEqual([])
    expect(clashLines(new Error('boom'))).toEqual([])
  })
})

describe('what messageFor accepts', () => {
  it('reads a { code, detail } object, such as a check before any call', () => {
    expect(messageFor({ code: 'invalid_name', detail: { index: 2 } }, COACH)).toBe(
      'Type a name for student 2 (up to 100 characters).',
    )
    expect(messageFor({ code: 'credit_exceeded' })).toBe(
      'Pay for the current package before booking more lessons.',
    )
    expect(messageFor({ code: 'past', detail: null })).toBe('This time has already started.')
  })

  it('words a form’s checks before any call, on the form’s own screen', () => {
    // Sign up and Account: the customer table (coach screens reach it through the fallback).
    expect(messageFor({ code: 'password_mismatch' })).toBe(
      'The passwords don’t match. Type the same password twice.',
    )
    expect(messageFor({ code: 'invalid_username' })).toBe(
      'Use 3 to 30 small letters, numbers, dots or underscores.',
    )
    expect(messageFor({ code: 'name_required' }, COACH)).toBe('Enter your name.')
    // Add students' new account: the same rule in the coach's words.
    expect(messageFor({ code: 'invalid_username' }, COACH)).toBe(
      'Use 3 to 30 lowercase letters, numbers, dots or underscores.',
    )
    // Record payment, Settings' hours, Block time.
    expect(messageFor({ code: 'amount_format' }, COACH)).toBe(
      'Enter the amount in RM, like 240 or 240.50.',
    )
    expect(messageFor({ code: 'overlapping_rules', detail: { weekday: 3 } }, COACH)).toBe(
      'Two ranges on Wednesday overlap. Change one and save again.',
    )
    expect(messageFor({ code: 'last_day_before_first' }, COACH)).toBe(
      'The last day must be on or after the first day.',
    )
    // The coach's checks never reach a customer screen.
    expect(messageFor({ code: 'amount_format' })).toBe(GENERIC_MESSAGE)
  })

  it('turns other failures into codes the way rpc.ts does', () => {
    expect(messageFor(new TypeError('Failed to fetch'))).toBe(NETWORK_MESSAGE)
    const refusal = {
      code: 'P0001',
      message: 'locked',
      details: '{"cutoff_at": "2026-09-26T11:00:00+08:00"}',
    }
    expect(messageFor(refusal, CUSTOMER)).toBe(
      'It’s less than 6 hours before the lesson, so it can’t be cancelled.',
    )
  })

  it('gives the generic message for anything else', () => {
    for (const error of [new Error('boom'), 'boom', 42, null, undefined, {}, { code: 'Oops' }]) {
      expect(messageFor(error)).toBe(GENERIC_MESSAGE)
    }
  })

  it('never takes words from Object.prototype', () => {
    for (const code of ['constructor', 'toString', 'valueof', '__proto__']) {
      expect(messageFor({ code }, COACH)).toBe(GENERIC_MESSAGE)
      expect(messageFor(new AppError(code), CUSTOMER)).toBe(GENERIC_MESSAGE)
    }
  })
})

describe('the fixed messages', () => {
  it('are DESIGN §6’s words', () => {
    expect(GENERIC_MESSAGE).toBe('Something went wrong. Refresh the page and try again.')
    expect(NETWORK_MESSAGE).toBe('Couldn’t reach the server. Check your connection and try again.')
    expect(NO_GROUPS_MESSAGE).toBe(
      'Your coach hasn’t set up your lessons yet. Message your coach to get started.',
    )
    expect(DAY_FULLY_BOOKED_MESSAGE).toBe('This day is fully booked. Try another day.')
  })

  it('all use typographic quotes, end with a full stop and never shout', () => {
    const all = [
      ...CUSTOMER_CASES.map(([, , words]) => words),
      ...COACH_CASES.map(([, , words]) => words),
      GENERIC_MESSAGE,
      NETWORK_MESSAGE,
      NO_GROUPS_MESSAGE,
      DAY_FULLY_BOOKED_MESSAGE,
    ]
    for (const words of all) {
      expect(words).not.toMatch(/['"!]/)
      expect(words).toMatch(/^[A-Z].*\.$/)
    }
  })
})

describe('with refusals from the demo database', () => {
  const AIMAN_AND_SOFIA = 'c0000000-0000-4000-8000-000000000001' // meiling's group

  /** The AppError a call is refused with. */
  async function refusal(call: Promise<unknown>): Promise<AppError> {
    const error = await call.then(
      () => null,
      (reason: unknown) => reason,
    )
    if (!(error instanceof AppError)) {
      throw new Error('Expected the call to be refused with an AppError.', { cause: error })
    }
    return error
  }

  beforeAll(async () => {
    // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
    await rpc('username_available', { p_username: 'warm_up' })
  }, 60_000)

  it('explains why meiling’s crossed-out times are taken', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const slots = await rpc('week_slots', {
      p_week_start: '2026-09-28',
      p_minutes: 60,
      p_group_id: AIMAN_AND_SOFIA,
    })
    const at = (time: string) =>
      slots.find((slot) => Date.parse(slot.starts_at) === Date.parse(time))
    const tuesday = at('2026-09-29T19:00:00+08:00')
    const saturday = at('2026-10-03T09:00:00+08:00')
    expect(tuesday?.reason).toBe('gap_after')
    expect(saturday?.reason).toBe('overlap_mine')
    expect(reasonMessage(tuesday?.reason ?? '', tuesday?.detail, CUSTOMER)).toBe(
      'It starts too soon after the lesson that ends at 6:30 pm. Your coach needs 1 hour to travel between lessons.',
    )
    expect(reasonMessage(saturday?.reason ?? '', saturday?.detail, CUSTOMER)).toBe(
      'It overlaps Aiman & Sofia’s lesson at 9:00–10:00 am.',
    )
  })

  it('words a repeat that clashes, and each clashing week', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const error = await refusal(
      rpc('book_lesson', {
        p_group_id: AIMAN_AND_SOFIA,
        p_starts_at: '2026-09-27T17:00:00+08:00',
        p_minutes: 60,
        p_repeat_weeks: 2,
      }),
    )
    expect(messageFor(error, CUSTOMER)).toBe(
      'These weeks clash: Sun 4 Oct. Nothing was booked. Try another time or turn off repeat.',
    )
    expect(clashLines(error, CUSTOMER)).toEqual([
      'Sun 4 Oct: It overlaps Sofia’s lesson at 5:00–6:00 pm.',
    ])
  })

  it('words a lesson too close to cancel', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const error = await refusal(
      rpc('cancel_booking', { p_booking_id: 'd0000000-0000-4000-8000-000000000001' }),
    )
    expect(error.code).toBe('locked')
    expect(messageFor(error, CUSTOMER)).toBe(
      'It’s less than 6 hours before the lesson, so it can’t be cancelled.',
    )
  })

  it('words the coach’s refusals with their details', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const credit = await refusal(
      rpc('coach_book', {
        p_group_id: 'c0000000-0000-4000-8000-000000000004', // Wei Jie
        p_starts_at: '2026-10-06T17:30:00+08:00',
        p_minutes: 60,
        p_repeat_weeks: 2,
      }),
    )
    expect(messageFor(credit, COACH)).toBe(
      'This group can book 1 more lesson before paying. Record a payment first, or choose “Book anyway”.',
    )

    const [check] = await rpc('coach_slot_check', {
      p_group_id: AIMAN_AND_SOFIA,
      p_starts_at: '2026-09-29T15:00:00+08:00',
      p_minutes: 60,
    })
    expect(reasonMessage(check?.reason ?? '', check?.detail, COACH)).toBe(
      'It’s outside your open hours. Turn on “Outside open hours” to book it anyway.',
    )

    const hours = await refusal(
      rpc('set_open_hours', {
        p_rules: [
          { weekday: 2, opens_at: '17:00', closes_at: '19:00' },
          { weekday: 2, opens_at: '18:00', closes_at: '20:00' },
        ],
      }),
    )
    expect(messageFor(hours, COACH)).toBe(
      'Two ranges on Tuesday overlap. Change one and save again.',
    )

    const setting = await refusal(
      rpc('update_settings', { p_settings: { travel_gap_minutes: 500 } }),
    )
    expect(messageFor(setting, COACH)).toBe(
      'Travel gap has a value that isn’t allowed. Check it and save again.',
    )
  })

  it('words the refusals of Add students and deactivating a group', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const meiling = 'a0000000-0000-4000-8000-000000000002'
    const aiman = { student_id: 'b0000000-0000-4000-8000-000000000001' }
    const sofia = { student_id: 'b0000000-0000-4000-8000-000000000002' }
    const addGroup = (students: { student_id?: string; name?: string }[]) =>
      refusal(
        rpc('create_group', {
          p_account_id: meiling,
          p_students: students,
          p_location: 'Palm Court',
        }),
      )

    expect(messageFor(await addGroup([aiman, { name: '  ' }]), COACH)).toBe(
      'Type a name for student 2 (up to 100 characters).',
    )
    expect(messageFor(await addGroup([aiman, aiman]), COACH)).toBe(
      'Student 2 is already in the list or can’t be found. Pick another student or type a new name.',
    )
    expect(
      messageFor(
        await addGroup([{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }]),
        COACH,
      ),
    ).toBe(
      'A lesson can have up to 3 students. Remove one, or change “Students per lesson” in Settings.',
    )
    const duplicate = await addGroup([aiman, sofia])
    expect(messageParts(duplicate, COACH)).toEqual([
      'These students already have an active group. Use ',
      { text: 'that group', groupId: AIMAN_AND_SOFIA },
      ', or deactivate it first.',
    ])

    const active = await refusal(
      rpc('set_group_active', {
        p_group_id: 'c0000000-0000-4000-8000-000000000003', // Hana: 2 lessons ahead
        p_active: false,
      }),
    )
    expect(messageFor(active, COACH)).toBe(
      'This group has 2 upcoming lessons. Cancel them first, then deactivate it. Each cancellation emails the customer.',
    )
  })
})
