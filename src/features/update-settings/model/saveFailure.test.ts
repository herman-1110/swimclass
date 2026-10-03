import { describe, expect, it } from 'vitest'

import { AppError } from '@/shared/api/rpc'
import { GENERIC_MESSAGE, NETWORK_MESSAGE, OPEN_HOURS_SAVED_LEAD } from '@/shared/config/messages'

import { describeInvalidFields, describeSaveFailure } from './saveFailure'
import type { SaveRequest } from './types'

const GAP_REFUSED = 'Travel gap has a value that isn’t allowed. Check it and save again.'

const WEEK: SaveRequest = {
  rules: [
    { weekday: 1, opens_at: '18:00', closes_at: '22:00' },
    { weekday: 6, opens_at: '07:00', closes_at: '12:00' },
    { weekday: 6, opens_at: '16:00', closes_at: '22:00' },
  ],
  patch: { travel_gap_minutes: 500 },
}

describe('describeSaveFailure', () => {
  it('puts a refused setting under its row and near Save, and focuses it', () => {
    const failure = describeSaveFailure(
      new AppError('invalid_setting', { field: 'travel_gap_minutes' }),
      WEEK,
    )
    expect(failure).toEqual({
      summary: GAP_REFUSED,
      fields: { travel_gap_minutes: GAP_REFUSED },
      days: {},
      focus: { field: 'travel_gap_minutes' },
    })
  })

  it.each([
    ['lesson_lengths', 'Lesson lengths has a value'],
    ['reminder_time', 'Lesson reminder to customers has a value'],
    ['digest_time', 'Tomorrow’s schedule for you has a value'],
    ['coach_email', 'Your email has a value'],
    ['price_1to2_cents', '1-to-2 price has a value'],
    ['payment_instructions', 'Payment instructions has a value'],
  ])('names %s by its label', (field, words) => {
    const failure = describeSaveFailure(new AppError('invalid_setting', { field }), WEEK)
    expect(failure.summary).toContain(words)
    expect(failure.focus).toEqual({ field })
  })

  it('says the open hours were saved when only update_settings refused', () => {
    const failure = describeSaveFailure(
      new AppError('invalid_setting', { field: 'travel_gap_minutes' }),
      WEEK,
      true,
    )
    expect(failure.summary).toBe(
      'Your open hours were saved, but your other changes weren’t. Travel gap has a value that isn’t allowed. Check it and save again.',
    )
    expect(failure.summary.startsWith(`${OPEN_HOURS_SAVED_LEAD} `)).toBe(true)
    expect(failure.fields.travel_gap_minutes).toBe(GAP_REFUSED)
  })

  it('gives a column the form doesn’t show the generic words and no highlight', () => {
    const failure = describeSaveFailure(
      new AppError('invalid_setting', { field: 'business_name' }),
      WEEK,
    )
    expect(failure).toEqual({ summary: GENERIC_MESSAGE, fields: {}, days: {}, focus: null })
  })

  it('puts a refused range under its day, counting the ranges sent from 1', () => {
    const failure = describeSaveFailure(new AppError('invalid_range', { index: 3 }), WEEK)
    const words = 'The end time must be after the start time. Change it and try again.'
    expect(failure).toEqual({
      summary: words,
      fields: {},
      days: { 6: words },
      focus: { weekday: 6 },
    })
  })

  it('puts overlapping ranges under their day, by its long name', () => {
    const failure = describeSaveFailure(new AppError('overlapping_rules', { weekday: 1 }), WEEK)
    expect(failure.summary).toBe('Two ranges on Monday overlap. Change one and save again.')
    expect(failure.days).toEqual({ 1: failure.summary })
    expect(failure.focus).toEqual({ weekday: 1 })
  })

  it('puts an incomplete range under its day, and keeps one without a detail near Save only', () => {
    const failure = describeSaveFailure(new AppError('invalid_rules', { index: 1 }), WEEK)
    expect(failure.summary).toBe(
      'Open hours range 1 is incomplete. Check each day’s hours and save again.',
    )
    expect(failure.focus).toEqual({ weekday: 1 })
    expect(describeSaveFailure(new AppError('invalid_rules'), WEEK)).toEqual({
      summary: GENERIC_MESSAGE,
      fields: {},
      days: {},
      focus: null,
    })
  })

  it.each([
    [new AppError('network'), NETWORK_MESSAGE],
    [new TypeError('Failed to fetch'), NETWORK_MESSAGE],
    [new AppError('not_coach'), GENERIC_MESSAGE],
    [new AppError('unknown_setting', { keys: ['id'] }), GENERIC_MESSAGE],
    [new AppError('unknown'), GENERIC_MESSAGE],
  ])('keeps %s near Save', (error, words) => {
    expect(describeSaveFailure(error, WEEK)).toEqual({
      summary: words,
      fields: {},
      days: {},
      focus: null,
    })
  })
})

describe('describeInvalidFields', () => {
  it('says what to type under each box the form couldn’t read, and names the first', () => {
    expect(
      describeInvalidFields(['travel_gap_minutes', 'price_1to3_cents', 'reminder_time']),
    ).toEqual({
      fields: {
        travel_gap_minutes: 'Enter a whole number.',
        price_1to3_cents: 'Enter the amount in RM, like 240 or 240.50.',
        reminder_time: 'Enter a time like 8:00 pm.',
      },
      summary: 'Travel gap: enter a whole number.',
    })
    expect(describeInvalidFields(['digest_time']).summary).toBe(
      'Tomorrow’s schedule for you: enter a time like 8:00 pm.',
    )
    expect(describeInvalidFields([])).toEqual({ fields: {}, summary: null })
  })
})
