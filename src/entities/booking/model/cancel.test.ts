import { describe, expect, it } from 'vitest'

import { cancelDeadline, cancelNote, cancelState } from './cancel'

// Sat 3 Oct 9:00 am MYT, with the seed's 6-hour cutoff (my-classes spec §8.6).
const SAT = '2026-10-03T01:00:00+00:00'
const at = (time: string) => `2026-10-03T${time}:00+08:00`

describe('cancelDeadline', () => {
  it('is the start less the cutoff, the same moment the database uses', () => {
    expect(cancelDeadline(SAT, 6).toISOString()).toBe('2026-10-02T19:00:00.000Z')
    expect(cancelDeadline(SAT, 0).toISOString()).toBe('2026-10-03T01:00:00.000Z')
  })
})

describe('cancelState', () => {
  it('stays open up to and at the deadline, then locks', () => {
    expect(cancelState(SAT, at('02:59'), 6)).toBe('open')
    expect(cancelState(SAT, at('03:00'), 6)).toBe('open')
    expect(cancelState(SAT, at('03:01'), 6)).toBe('locked')
  })

  it('says started once the lesson has begun', () => {
    expect(cancelState(SAT, at('09:00'), 6)).toBe('started')
    expect(cancelState(SAT, at('09:30'), 6)).toBe('started')
  })

  it('with no cutoff, stays open until the start', () => {
    expect(cancelState(SAT, at('09:00'), 0)).toBe('open')
    expect(cancelState(SAT, at('09:01'), 0)).toBe('started')
  })
})

describe('cancelNote', () => {
  it('gives the deadline while the lesson can be cancelled (the drawing)', () => {
    expect(cancelNote('open', SAT, 6)).toBe('Free to cancel until 3:00 am, Sat 3 Oct.')
    expect(cancelNote('open', '2026-10-04T09:00:00+00:00', 6)).toBe(
      'Free to cancel until 11:00 am, Sun 4 Oct.',
    )
  })

  it('explains a locked lesson with the cutoff from settings', () => {
    expect(cancelNote('locked', SAT, 6)).toBe(
      'Under 6 hours to go, so it can’t be cancelled and counts even if missed.',
    )
    expect(cancelNote('locked', SAT, 1)).toBe(
      'Under 1 hour to go, so it can’t be cancelled and counts even if missed.',
    )
  })

  it('explains a lesson that has started', () => {
    expect(cancelNote('started', SAT, 6)).toBe(
      'It has started, so it can’t be cancelled and counts even if missed.',
    )
  })
})
