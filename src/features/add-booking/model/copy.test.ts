import { describe, expect, it } from 'vitest'

import {
  blockedLabel,
  bookedNotice,
  bookLabel,
  noMatch,
  primaryLabel,
  skipGapWarning,
  summaryGroup,
  summaryRepeat,
  summaryWhen,
} from './copy'

const START = new Date('2026-09-29T11:30:00Z') // Tue 29 Sep, 7:30 pm in Malaysia
const END = new Date('2026-09-29T12:30:00Z')

describe('the primary button', () => {
  it('says what is missing before it can book (§6.4)', () => {
    expect(blockedLabel('group')).toBe('Pick a group')
    expect(blockedLabel('start')).toBe('Pick a start time')
    expect(blockedLabel('clash')).toBe('Pick a free time')
    expect(blockedLabel('weeks')).toBe('Choose 2 to 52 weeks')
  })

  it('names the time and the group, or the weeks when repeating', () => {
    expect(bookLabel(START, 1, 'Aiman & Sofia')).toBe('Book 7:30 pm for Aiman & Sofia')
    expect(bookLabel(START, 3, 'Aiman & Sofia')).toBe('Book 3 weeks for Aiman & Sofia')
  })

  it('says “Booking…” while it books, and “Book anyway” after the credit refusal', () => {
    const state = {
      blocker: null,
      pending: false,
      creditRefused: false,
      start: START,
      weeks: 2,
      names: 'Wei Jie',
    }
    expect(primaryLabel(state)).toBe('Book 2 weeks for Wei Jie')
    expect(primaryLabel({ ...state, creditRefused: true })).toBe('Book anyway')
    expect(primaryLabel({ ...state, pending: true })).toBe('Booking…')
    expect(primaryLabel({ ...state, blocker: 'clash' })).toBe('Pick a free time')
    expect(primaryLabel({ ...state, blocker: 'length', start: null })).toBe('Pick a length')
  })
})

describe('the summary', () => {
  it('reads like the drawn Book summary', () => {
    expect(summaryWhen(START, END)).toBe('Tue 29 Sep · 7:30–8:30 pm')
    expect(
      summaryGroup({
        display_names: 'Aiman & Sofia',
        type_label: '1-to-2',
        location: 'Palm Court',
      }),
    ).toBe('Aiman & Sofia · 1-to-2 · Palm Court')
    expect(summaryRepeat(3, new Date('2026-10-13T11:30:00Z'))).toBe(
      'Every week for 3 weeks, until Tue 13 Oct',
    )
  })
})

describe('the notice', () => {
  it('says what was booked (§6.4)', () => {
    expect(bookedNotice(START, END, 1, 'Aiman & Sofia')).toBe(
      'Booked Tue 29 Sep, 7:30–8:30 pm for Aiman & Sofia.',
    )
    expect(bookedNotice(START, END, 3, 'Aiman & Sofia')).toBe(
      'Booked 3 weeks for Aiman & Sofia from Tue 29 Sep.',
    )
  })
})

describe('other words', () => {
  it('puts the travel gap into the Skip travel gap warning', () => {
    expect(skipGapWarning(60)).toBe(
      'You may have less than 1 hour to travel before or after this lesson.',
    )
    expect(skipGapWarning(90)).toBe(
      'You may have less than 90 minutes to travel before or after this lesson.',
    )
  })

  it('quotes the search that found nothing', () => {
    expect(noMatch('  zz ')).toBe('No active group matches “zz”.')
  })
})
