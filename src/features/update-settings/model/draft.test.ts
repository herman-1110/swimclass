import { describe, expect, it } from 'vitest'

import type { WeeklyRange } from '@/entities/open-hours'
import type { CoachSettings } from '@/entities/settings'

import {
  checkForm,
  parseCount,
  parsePrice,
  sameDraftValue,
  sameRanges,
  toDraft,
  toWeekHours,
} from './draft'
import type { SettingsDraft, WeekHours } from './types'

// The seed's settings row and weekly hours (coach-settings §5.1).
const SEED: CoachSettings = {
  id: 1,
  business_name: 'Swim Class',
  coach_email: 'herman@example.com',
  travel_gap_minutes: 60,
  start_step_minutes: 30,
  lesson_lengths: [60, 120],
  max_students_per_lesson: 3,
  cancel_cutoff_hours: 6,
  booking_window_weeks: 4,
  lessons_per_package: 4,
  unpaid_packages_allowed: 1,
  price_1to1_cents: null,
  price_1to2_cents: null,
  price_1to3_cents: null,
  payment_instructions: null,
  lesson_expiry_months: null,
  reminder_time: '20:00:00',
  digest_time: '20:00:00',
  booking_confirmations: true,
  late_change_alert: true,
  require_approval: true,
  updated_at: '2026-09-29T16:27:29.628+00:00',
}

const evening = (weekday: WeeklyRange['weekday']): WeeklyRange => ({
  weekday,
  opens_at: '17:30:00',
  closes_at: '22:00:00',
})

const SEED_HOURS: WeeklyRange[] = [
  evening(1),
  evening(2),
  evening(3),
  evening(4),
  evening(5),
  { weekday: 6, opens_at: '16:00:00', closes_at: '22:00:00' },
  { weekday: 6, opens_at: '07:00:00', closes_at: '12:00:00' },
  { weekday: 7, opens_at: '07:00:00', closes_at: '12:00:00' },
  { weekday: 7, opens_at: '16:00:00', closes_at: '22:00:00' },
]

const SEED_WEEK = toWeekHours(SEED_HOURS)
const SEED_DRAFT = toDraft(SEED)

function check(edits: Partial<SettingsDraft>, week: Partial<WeekHours> = {}) {
  return checkForm(SEED, SEED_WEEK, { ...SEED_DRAFT, ...edits }, { ...SEED_WEEK, ...week })
}

describe('toDraft', () => {
  it('shows the seed as the drawing does', () => {
    expect(SEED_DRAFT).toEqual({
      travel_gap_minutes: '60',
      lesson_lengths: [60, 120],
      max_students_per_lesson: '3',
      start_step_minutes: '30',
      cancel_cutoff_hours: '6',
      booking_window_weeks: '4',
      require_approval: true,
      lessons_per_package: '4',
      price_1to1_cents: '',
      price_1to2_cents: '',
      price_1to3_cents: '',
      unpaid_packages_allowed: '1',
      payment_instructions: '',
      reminder_time: '8:00 pm',
      digest_time: '8:00 pm',
      late_change_alert: true,
      booking_confirmations: true,
      coach_email: 'herman@example.com',
    })
  })

  it('shows prices in ringgit, times in words and the lengths in order', () => {
    const draft = toDraft({
      ...SEED,
      price_1to1_cents: 26000,
      price_1to2_cents: 26050,
      price_1to3_cents: 0,
      reminder_time: '19:45:30',
      digest_time: '07:00:00',
      lesson_lengths: [120, 60],
      payment_instructions: 'Maybank 1234',
    })
    expect(draft).toMatchObject({
      price_1to1_cents: '260',
      price_1to2_cents: '260.50',
      price_1to3_cents: '0',
      reminder_time: '7:45 pm',
      digest_time: '7:00 am',
      lesson_lengths: [60, 120],
      payment_instructions: 'Maybank 1234',
    })
  })
})

describe('toWeekHours', () => {
  it('lists each day’s ranges in opening order, without zero seconds', () => {
    expect(SEED_WEEK[1]).toEqual([{ opens_at: '17:30', closes_at: '22:00' }])
    expect(SEED_WEEK[6]).toEqual([
      { opens_at: '07:00', closes_at: '12:00' },
      { opens_at: '16:00', closes_at: '22:00' },
    ])
  })

  it('gives a day without ranges none, and keeps midnight and seconds', () => {
    const week = toWeekHours([{ weekday: 2, opens_at: '17:30:30', closes_at: '24:00:00' }])
    expect(week[1]).toEqual([])
    expect(week[2]).toEqual([{ opens_at: '17:30:30', closes_at: '24:00' }])
  })
})

describe('sameRanges', () => {
  it('ignores the order and how the times are written', () => {
    expect(
      sameRanges(
        [
          { opens_at: '16:00', closes_at: '22:00' },
          { opens_at: '07:00:00', closes_at: '12:00' },
        ],
        SEED_WEEK[6],
      ),
    ).toBe(true)
    expect(sameRanges([{ opens_at: '08:00', closes_at: '12:00' }], SEED_WEEK[6])).toBe(false)
  })
})

describe('sameDraftValue', () => {
  it('compares text and switches as they are, and lesson lengths in any order', () => {
    expect(sameDraftValue('60', '60')).toBe(true)
    expect(sameDraftValue('60 ', '60')).toBe(false)
    expect(sameDraftValue(false, false)).toBe(true)
    expect(sameDraftValue(true, false)).toBe(false)
    expect(sameDraftValue([120, 60], [60, 120])).toBe(true)
    expect(sameDraftValue([60], [60, 120])).toBe(false)
  })
})

describe('parseCount and parsePrice', () => {
  it('reads whole numbers only', () => {
    expect(parseCount('60')).toBe(60)
    expect(parseCount(' 60 ')).toBe(60)
    for (const text of ['', '1.5', '60.0', '-1', 'abc', '6 0']) expect(parseCount(text)).toBeNull()
  })

  it('reads amounts in RM as cents, nothing as null, and refuses the rest', () => {
    expect(parsePrice('260.5')).toBe(26050)
    expect(parsePrice('RM 1,200')).toBe(120000)
    expect(parsePrice('0')).toBe(0)
    expect(parsePrice('  ')).toBeNull()
    for (const text of ['-1', '12a', '260.555', '.5']) expect(parsePrice(text)).toBe('invalid')
  })
})

describe('checkForm', () => {
  it('has nothing to save for the saved values', () => {
    expect(check({})).toEqual({
      request: { rules: null, patch: null },
      invalid: [],
      changed: [],
      changedDays: [],
      dirty: false,
    })
  })

  it('counts values, not text, as changes', () => {
    const result = check({
      travel_gap_minutes: '60 ',
      reminder_time: '8:00 PM',
      digest_time: '20:00',
      lesson_lengths: [120, 60],
      payment_instructions: '   ',
      coach_email: ' herman@example.com ',
      price_1to1_cents: '',
    })
    expect(result.dirty).toBe(false)
    expect(result.request).toEqual({ rules: null, patch: null })
  })

  it('leaves a stored time with seconds alone until it is changed', () => {
    const stored = { ...SEED, digest_time: '19:45:30' }
    const draft = toDraft(stored)
    expect(checkForm(stored, SEED_WEEK, draft, SEED_WEEK).dirty).toBe(false)
    const changed = checkForm(stored, SEED_WEEK, { ...draft, digest_time: '7:30 pm' }, SEED_WEEK)
    expect(changed.request.patch).toEqual({ digest_time: '19:30' })
  })

  it('sends only the changed settings, each as its JSON type (the spec’s example)', () => {
    const result = check({
      travel_gap_minutes: '30',
      lesson_lengths: [60],
      price_1to1_cents: '260',
      payment_instructions: '  Maybank 1234 5678 (Herman) ',
      reminder_time: '7:30 pm',
      coach_email: 'herman@swimclass.online ',
    })
    expect(result.request).toEqual({
      rules: null,
      patch: {
        travel_gap_minutes: 30,
        lesson_lengths: [60],
        price_1to1_cents: 26000,
        payment_instructions: 'Maybank 1234 5678 (Herman)',
        reminder_time: '19:30',
        coach_email: 'herman@swimclass.online',
      },
    })
    expect(result.changed).toEqual([
      'travel_gap_minutes',
      'lesson_lengths',
      'price_1to1_cents',
      'payment_instructions',
      'reminder_time',
      'coach_email',
    ])
    expect(result.dirty).toBe(true)
  })

  it('sends the selects and switches as numbers and booleans', () => {
    expect(
      check({
        max_students_per_lesson: '1',
        start_step_minutes: '60',
        require_approval: false,
        late_change_alert: false,
        booking_confirmations: false,
      }).request.patch,
    ).toEqual({
      max_students_per_lesson: 1,
      start_step_minutes: 60,
      require_approval: false,
      late_change_alert: false,
      booking_confirmations: false,
    })
  })

  it('empties a price and the instructions with null, and the email with ""', () => {
    const stored = { ...SEED, price_1to2_cents: 40000, payment_instructions: 'Cash' }
    const result = checkForm(
      stored,
      SEED_WEEK,
      { ...toDraft(stored), price_1to2_cents: '', payment_instructions: '', coach_email: '' },
      SEED_WEEK,
    )
    expect(result.request.patch).toEqual({
      price_1to2_cents: null,
      payment_instructions: null,
      coach_email: '',
    })
  })

  it('sends no lesson lengths at all for the database to refuse', () => {
    expect(check({ lesson_lengths: [] }).request.patch).toEqual({ lesson_lengths: [] })
  })

  it('marks every number, amount or time it can’t read, in form order, as changed', () => {
    const result = check({
      digest_time: '24:00',
      travel_gap_minutes: '1.5',
      price_1to3_cents: '-1',
      booking_window_weeks: '',
      reminder_time: '8',
      lessons_per_package: '4',
    })
    expect(result.invalid).toEqual([
      'travel_gap_minutes',
      'booking_window_weeks',
      'price_1to3_cents',
      'reminder_time',
      'digest_time',
    ])
    expect(result.changed).toEqual(result.invalid)
    expect(result.dirty).toBe(true)
    expect(result.request).toEqual({ rules: null, patch: null })
  })

  it('sends the whole week when one day changes (Saturday from 8:00 am)', () => {
    const result = check(
      {},
      {
        6: [
          { opens_at: '16:00', closes_at: '22:00' },
          { opens_at: '08:00', closes_at: '12:00' },
        ],
      },
    )
    expect(result.changedDays).toEqual([6])
    expect(result.dirty).toBe(true)
    expect(result.request).toEqual({
      patch: null,
      rules: [
        { weekday: 1, opens_at: '17:30', closes_at: '22:00' },
        { weekday: 2, opens_at: '17:30', closes_at: '22:00' },
        { weekday: 3, opens_at: '17:30', closes_at: '22:00' },
        { weekday: 4, opens_at: '17:30', closes_at: '22:00' },
        { weekday: 5, opens_at: '17:30', closes_at: '22:00' },
        { weekday: 6, opens_at: '08:00', closes_at: '12:00' },
        { weekday: 6, opens_at: '16:00', closes_at: '22:00' },
        { weekday: 7, opens_at: '07:00', closes_at: '12:00' },
        { weekday: 7, opens_at: '16:00', closes_at: '22:00' },
      ],
    })
  })

  it('closes every day with an empty week', () => {
    const closed = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] }
    const result = check({}, closed)
    expect(result.changedDays).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(result.request.rules).toEqual([])
  })

  it('sends the hours and the settings together', () => {
    const result = check(
      { travel_gap_minutes: '500' },
      { 1: [{ opens_at: '18:00', closes_at: '22:00' }] },
    )
    expect(result.request.rules?.[0]).toEqual({ weekday: 1, opens_at: '18:00', closes_at: '22:00' })
    expect(result.request.patch).toEqual({ travel_gap_minutes: 500 })
  })
})
