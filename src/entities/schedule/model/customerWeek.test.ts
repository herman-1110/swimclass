import { describe, expect, it } from 'vitest'

import { describeCustomerDay } from './describe'
import { parseCustomerWeek } from './parseWeek'
import { ownLessonsOn } from './select'
import { customerDayTimeline, customerWeekHours } from './timeline'
import type { CustomerDay } from './types'

// week_busy('2026-09-28') as meiling, exactly as sent (data-contracts Appendix B). The
// drawing (design/Schedule.dc.html) is this week, block for block (customer-schedule §8.2).
const APPENDIX_B: unknown = JSON.parse(`[
{"day": "2026-09-28", "busy": [{"mine": false, "ends_at": "2026-09-28T20:30:00+08:00", "starts_at": "2026-09-28T19:30:00+08:00", "travel_after": 60, "travel_before": 60}], "open": [{"ends_at": "2026-09-28T22:00:00+08:00", "starts_at": "2026-09-28T17:30:00+08:00"}], "closed": []},
{"day": "2026-09-29", "busy": [{"mine": false, "ends_at": "2026-09-29T18:30:00+08:00", "starts_at": "2026-09-29T17:30:00+08:00", "travel_after": 60, "travel_before": 60}], "open": [{"ends_at": "2026-09-29T22:00:00+08:00", "starts_at": "2026-09-29T17:30:00+08:00"}], "closed": []},
{"day": "2026-09-30", "busy": [{"mine": false, "ends_at": "2026-09-30T21:30:00+08:00", "starts_at": "2026-09-30T20:30:00+08:00", "travel_after": 60, "travel_before": 60}], "open": [{"ends_at": "2026-09-30T22:00:00+08:00", "starts_at": "2026-09-30T17:30:00+08:00"}], "closed": []},
{"day": "2026-10-01", "busy": [{"mine": false, "ends_at": "2026-10-01T18:30:00+08:00", "starts_at": "2026-10-01T17:30:00+08:00", "travel_after": 60, "travel_before": 60}, {"mine": false, "ends_at": "2026-10-01T21:30:00+08:00", "starts_at": "2026-10-01T20:30:00+08:00", "travel_after": 60, "travel_before": 60}], "open": [{"ends_at": "2026-10-01T22:00:00+08:00", "starts_at": "2026-10-01T17:30:00+08:00"}], "closed": []},
{"day": "2026-10-02", "busy": [{"mine": false, "ends_at": "2026-10-02T20:30:00+08:00", "starts_at": "2026-10-02T19:30:00+08:00", "travel_after": 0, "travel_before": 60}, {"mine": false, "ends_at": "2026-10-02T22:00:00+08:00", "starts_at": "2026-10-02T21:00:00+08:00", "travel_after": 60, "travel_before": 0}], "open": [{"ends_at": "2026-10-02T22:00:00+08:00", "starts_at": "2026-10-02T17:30:00+08:00"}], "closed": []},
{"day": "2026-10-03", "busy": [{"mine": true, "ends_at": "2026-10-03T10:00:00+08:00", "group_id": "c0000000-0000-4000-8000-000000000001", "starts_at": "2026-10-03T09:00:00+08:00", "booking_id": "d0000000-0000-4000-8000-000000000002", "travel_after": 60, "travel_before": 60}, {"mine": false, "ends_at": "2026-10-03T12:00:00+08:00", "starts_at": "2026-10-03T11:00:00+08:00", "travel_after": 60, "travel_before": 60}, {"mine": false, "ends_at": "2026-10-03T18:00:00+08:00", "starts_at": "2026-10-03T17:00:00+08:00", "travel_after": 60, "travel_before": 60}], "open": [{"ends_at": "2026-10-03T12:00:00+08:00", "starts_at": "2026-10-03T07:00:00+08:00"}, {"ends_at": "2026-10-03T22:00:00+08:00", "starts_at": "2026-10-03T16:00:00+08:00"}], "closed": []},
{"day": "2026-10-04", "busy": [{"mine": false, "ends_at": "2026-10-04T09:00:00+08:00", "starts_at": "2026-10-04T08:00:00+08:00", "travel_after": 60, "travel_before": 60}, {"mine": false, "ends_at": "2026-10-04T12:00:00+08:00", "starts_at": "2026-10-04T10:00:00+08:00", "travel_after": 60, "travel_before": 60}, {"mine": true, "ends_at": "2026-10-04T18:00:00+08:00", "group_id": "c0000000-0000-4000-8000-000000000002", "starts_at": "2026-10-04T17:00:00+08:00", "booking_id": "d0000000-0000-4000-8000-000000000003", "travel_after": 60, "travel_before": 60}, {"mine": false, "ends_at": "2026-10-04T20:00:00+08:00", "starts_at": "2026-10-04T19:00:00+08:00", "travel_after": 60, "travel_before": 60}], "open": [{"ends_at": "2026-10-04T12:00:00+08:00", "starts_at": "2026-10-04T07:00:00+08:00"}, {"ends_at": "2026-10-04T22:00:00+08:00", "starts_at": "2026-10-04T16:00:00+08:00"}], "closed": []}
]`)

const week = parseCustomerWeek(APPENDIX_B, '2026-09-28')
const hours = customerWeekHours(week)

/** A day's blocks as "kind start–end" in minutes, lessons as "mine" or "booked". */
function blocks(day: CustomerDay) {
  return customerDayTimeline(day, hours).map((item) => {
    const kind = item.kind === 'lesson' ? (item.lesson.mine ? 'mine' : 'booked') : item.kind
    return `${kind} ${item.start}–${item.end}`
  })
}

describe('the customer’s week of 28 Sep as meiling (customer-schedule §8.2)', () => {
  it('shows 7 am to 10 pm', () => {
    expect(hours).toEqual({ from: 420, to: 1320 })
  })

  it('draws Monday: closed, free, travel, a booked lesson, travel, free', () => {
    expect(blocks(week[0])).toEqual([
      'closed 420–1050',
      'free 1050–1110',
      'travel 1110–1170',
      'booked 1170–1230',
      'travel 1230–1290',
      'free 1290–1320',
    ])
  })

  it('draws no travel before Tuesday’s 5:30 pm lesson: that hour is closed', () => {
    expect(blocks(week[1])).toEqual([
      'closed 420–1050',
      'booked 1050–1110',
      'travel 1110–1170',
      'free 1170–1320',
    ])
  })

  it('cuts Wednesday’s travel at 10 pm', () => {
    expect(blocks(week[2]).slice(-2)).toEqual(['booked 1230–1290', 'travel 1290–1320'])
  })

  it('joins Thursday’s touching travel into one block', () => {
    expect(blocks(week[3])).toEqual([
      'closed 420–1050',
      'booked 1050–1110',
      'travel 1110–1230',
      'booked 1230–1290',
      'travel 1290–1320',
    ])
  })

  it('draws no travel between Friday’s gap-override pair', () => {
    expect(blocks(week[4])).toEqual([
      'closed 420–1050',
      'free 1050–1110',
      'travel 1110–1170',
      'booked 1170–1230',
      'free 1230–1260',
      'booked 1260–1320',
    ])
  })

  it('shows Saturday’s own lesson as mine and one travel block between lessons', () => {
    expect(blocks(week[5])).toEqual([
      'free 420–480',
      'travel 480–540',
      'mine 540–600',
      'travel 600–660',
      'booked 660–720',
      'closed 720–960',
      'travel 960–1020',
      'booked 1020–1080',
      'travel 1080–1140',
      'free 1140–1320',
    ])
  })

  it('draws Sunday’s 2-hour lesson as one block', () => {
    expect(blocks(week[6])).toEqual([
      'travel 420–480',
      'booked 480–540',
      'travel 540–600',
      'booked 600–720',
      'closed 720–960',
      'travel 960–1020',
      'mine 1020–1080',
      'travel 1080–1140',
      'booked 1140–1200',
      'travel 1200–1260',
      'free 1260–1320',
    ])
  })

  it('says each day in words: free times and the viewer’s own lessons', () => {
    expect(week.map((day) => describeCustomerDay(day, hours))).toEqual([
      'Mon 28 Sep: free 5:30 pm to 6:30 pm, free 9:30 pm to 10:00 pm',
      'Tue 29 Sep: free 7:30 pm to 10:00 pm',
      'Wed 30 Sep: free 5:30 pm to 7:30 pm',
      'Thu 1 Oct: no free time',
      'Fri 2 Oct: free 5:30 pm to 6:30 pm, free 8:30 pm to 9:00 pm',
      'Sat 3 Oct: free 7:00 am to 8:00 am, your lesson 9:00 am to 10:00 am, free 7:00 pm to 10:00 pm',
      'Sun 4 Oct: your lesson 5:00 pm to 6:00 pm, free 9:00 pm to 10:00 pm',
    ])
  })

  it('finds the viewer’s own lessons of a day', () => {
    expect(ownLessonsOn(week, '2026-10-03')).toEqual([
      {
        starts_at: '2026-10-03T09:00:00+08:00',
        ends_at: '2026-10-03T10:00:00+08:00',
        travel_before: 60,
        travel_after: 60,
        mine: true,
        booking_id: 'd0000000-0000-4000-8000-000000000002',
        group_id: 'c0000000-0000-4000-8000-000000000001',
      },
    ])
    expect(ownLessonsOn(week, '2026-10-02')).toEqual([])
    expect(ownLessonsOn(week, '2026-10-05')).toEqual([])
  })
})

/** A customer day with the given open windows and lessons ("HH:MM" on 3 Oct). */
function day(open: [string, string][], busy: [string, string, boolean?][] = []): CustomerDay {
  const at = (time: string) =>
    time === '24:00' ? '2026-10-04T00:00:00+08:00' : `2026-10-03T${time}:00+08:00`
  return {
    day: '2026-10-03',
    open: open.map(([from, to]) => ({ starts_at: at(from), ends_at: at(to) })),
    closed: [],
    busy: busy.map(([from, to, mine]) => ({
      starts_at: at(from),
      ends_at: to === '01:00' ? '2026-10-04T01:00:00+08:00' : at(to),
      travel_before: 60,
      travel_after: 60,
      ...(mine ? { mine: true, booking_id: 'b', group_id: 'g' } : { mine: false }),
    })),
  }
}

describe('the customer’s edge cases (customer-schedule §3.2, §6.5)', () => {
  it('starts the grid earlier for extra open time, and ends it later for a late lesson', () => {
    expect(customerWeekHours([day([['06:00', '12:00']])])).toEqual({ from: 360, to: 1320 })
    expect(customerWeekHours([day([], [['22:00', '23:00']])])).toEqual({ from: 420, to: 1380 })
  })

  it('stops at midnight for a lesson that crosses it, and draws it to midnight', () => {
    const late = day([], [['23:00', '01:00']])
    const range = customerWeekHours([late])
    expect(range).toEqual({ from: 420, to: 1440 })
    expect(customerDayTimeline(late, range).at(-1)).toMatchObject({
      kind: 'lesson',
      start: 1380,
      end: 1440,
    })
  })

  it('draws a whole closed day and says so', () => {
    const closed = day([])
    expect(blocks(closed)).toEqual(['closed 420–1320'])
    expect(describeCustomerDay(closed, hours)).toBe('Sat 3 Oct: closed')
  })

  it('draws a lesson placed in closed time over a gap in the closed block, without travel', () => {
    const odd = day([['16:00', '22:00']], [['13:00', '14:00']])
    expect(blocks(odd).slice(0, 3)).toEqual(['closed 420–780', 'booked 780–840', 'closed 840–960'])
  })

  it('reads an evening window that runs to midnight', () => {
    const late = day([['21:00', '24:00']])
    const range = customerWeekHours([late])
    expect(range.to).toBe(1440)
    expect(describeCustomerDay(late, range)).toBe('Sat 3 Oct: free 9:00 pm to 12:00 am')
  })
})
