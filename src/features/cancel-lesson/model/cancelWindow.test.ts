import { describe, expect, it } from 'vitest'

import { registerAllChinese } from '@/shared/i18n/registerAllChinese'

import { cancelDeadline, cancelNote, cancelState } from './cancelWindow'

// meiling's Sat 3 Oct 9:00 am lesson (seed booking d0…02), as the bookings table sends it.
const SAT_9AM = '2026-10-03T01:00:00+00:00'
// Her Sat 26 Sep 5:00 pm lesson (d0…01), and the demo clock, Sat 26 Sep 12:00 pm.
const TODAY_5PM = '2026-09-26T09:00:00+00:00'
const DEMO_NOW = '2026-09-26T12:00:00+08:00'

describe('cancelDeadline', () => {
  it('is the start minus the cutoff, as the database computes it', () => {
    expect(cancelDeadline(SAT_9AM, 6).toISOString()).toBe('2026-10-02T19:00:00.000Z')
    expect(cancelDeadline('2026-10-03T09:00:00+08:00', 0).toISOString()).toBe(
      '2026-10-03T01:00:00.000Z',
    )
  })
})

describe('cancelState', () => {
  it('stays open up to and including the deadline (3:00 am for 9:00 am with 6 hours)', () => {
    expect(cancelState(SAT_9AM, 6, '2026-10-03T02:59:00+08:00')).toBe('open')
    expect(cancelState(SAT_9AM, 6, '2026-10-03T03:00:00+08:00')).toBe('open')
  })

  it('locks after the deadline, until the lesson starts', () => {
    expect(cancelState(SAT_9AM, 6, '2026-10-03T03:01:00+08:00')).toBe('locked')
    expect(cancelState(TODAY_5PM, 6, DEMO_NOW)).toBe('locked')
  })

  it('says started from the start time', () => {
    expect(cancelState(SAT_9AM, 6, '2026-10-03T09:00:00+08:00')).toBe('started')
  })

  it('never locks with a cutoff of 0: open until the start, then started', () => {
    expect(cancelState(SAT_9AM, 0, '2026-10-03T09:00:00+08:00')).toBe('open')
    expect(cancelState(SAT_9AM, 0, '2026-10-03T09:00:01+08:00')).toBe('started')
  })
})

describe('cancelNote', () => {
  it('gives the deadline while the lesson can be cancelled (MyClasses.dc.html)', () => {
    expect(cancelNote(SAT_9AM, 6, DEMO_NOW)).toBe('Free to cancel until 3:00 am, Sat 3 Oct.')
    expect(cancelNote('2026-10-04T09:00:00+00:00', 6, DEMO_NOW)).toBe(
      'Free to cancel until 11:00 am, Sun 4 Oct.',
    )
  })

  it('explains a locked lesson with the cutoff from settings', () => {
    expect(cancelNote(TODAY_5PM, 6, DEMO_NOW)).toBe(
      'Under 6 hours to go, so it can’t be cancelled and counts even if missed.',
    )
    expect(cancelNote('2026-09-26T04:30:00+00:00', 1, DEMO_NOW)).toBe(
      'Under 1 hour to go, so it can’t be cancelled and counts even if missed.',
    )
  })

  it('explains a lesson that has started', () => {
    expect(cancelNote('2026-09-26T03:30:00+00:00', 6, DEMO_NOW)).toBe(
      'It has started, so it can’t be cancelled and counts even if missed.',
    )
  })
})

describe('cancelNote in Chinese', () => {
  registerAllChinese()

  it('gives the deadline, or why it is locked, in Chinese', () => {
    expect(cancelNote(SAT_9AM, 6, DEMO_NOW, 'zh')).toBe('10月3日 周六 上午3:00前可以免费取消。')
    expect(cancelNote(TODAY_5PM, 6, DEMO_NOW, 'zh')).toBe(
      '离上课不到 6 小时，所以不能取消，缺课也会算一节。',
    )
    expect(cancelNote(TODAY_5PM, 6, '2026-09-26T17:30:00+08:00', 'zh')).toBe(
      '这节课已经开始，所以不能取消，缺课也会算一节。',
    )
  })
})
