import { describe, expect, it } from 'vitest'

import {
  dayButtonLabel,
  dayLessonsLabel,
  describeCoachDay,
  lessonLine,
  lessonNotes,
  lessonPlace,
} from './describe'
import { bookedLessons, isWeekOf, weekExceptions } from './select'
import { coachDayTimeline, coachWeekHours } from './timeline'
import type { BookedCoachLesson, CoachDay, CoachLesson } from './types'

// The coach's Saturday 3 Oct and Sunday 4 Oct of the seed (coach-schedule §8.2;
// design/AdminSchedule.dc.html), built by hand. The hooks' and components' tests read the
// same days from the demo database.

const at = (day: string, time: string) => `${day}T${time}:00+08:00`

function lesson(
  day: string,
  from: string,
  to: string,
  fields: Partial<BookedCoachLesson> = {},
): BookedCoachLesson {
  return {
    booking_id: `booking-${day}-${from}`,
    group_id: 'group',
    account_id: 'account',
    account_name: 'Mei Ling',
    display_names: 'Aiman & Sofia',
    type_label: '1-to-2',
    size: 2,
    location: 'Palm Court',
    starts_at: at(day, from),
    ends_at: at(day, to),
    lessons: 1,
    gap_override: false,
    package_size: 4,
    unpaid: false,
    last_lesson: false,
    status: 'booked',
    travel_before: 60,
    travel_after: 60,
    used: false,
    package_no: 4,
    lesson_in_package: 2,
    ...fields,
  }
}

function cancelled(booked: BookedCoachLesson, status: 'cancelled' | 'excused'): CoachLesson {
  return {
    ...booked,
    status,
    travel_before: null,
    travel_after: null,
    used: null,
    package_no: null,
    lesson_in_package: null,
  }
}

const weekend = [
  { starts_at: '07:00', ends_at: '12:00' },
  { starts_at: '16:00', ends_at: '22:00' },
]

function coachDay(day: string, lessons: CoachLesson[], extra: Partial<CoachDay> = {}): CoachDay {
  return {
    day,
    open: weekend.map((w) => ({ starts_at: at(day, w.starts_at), ends_at: at(day, w.ends_at) })),
    closed: [],
    exceptions: [],
    lessons,
    ...extra,
  }
}

const saturday = coachDay('2026-10-03', [
  lesson('2026-10-03', '09:00', '10:00'),
  lesson('2026-10-03', '11:00', '12:00', {
    display_names: 'Adam, Alya & Amir',
    type_label: '1-to-3',
    size: 3,
    location: 'Maple Condo',
  }),
  cancelled(lesson('2026-10-03', '14:00', '15:00', { display_names: 'Gone' }), 'cancelled'),
  lesson('2026-10-03', '17:00', '18:00', {
    display_names: 'Hana',
    type_label: '1-to-1',
    size: 1,
    location: 'Sunrise Res.',
    unpaid: true,
  }),
])

function kinds(day: CoachDay) {
  const range = coachWeekHours([day])
  return coachDayTimeline(day, range).map((item) =>
    item.kind === 'lesson'
      ? `${item.lesson.display_names} ${item.start}–${item.end}`
      : `${item.kind} ${item.start}–${item.end}`,
  )
}

describe('the coach’s day as blocks (coach-schedule §3.3, §3.4)', () => {
  it('lays out Saturday 3 Oct as drawn, leaving the cancelled lesson out', () => {
    expect(kinds(saturday)).toEqual([
      'free 420–480',
      'travel 480–540',
      'Aiman & Sofia 540–600',
      'travel 600–660',
      'Adam, Alya & Amir 660–720',
      'closed 720–960',
      'travel 960–1020',
      'Hana 1020–1080',
      'travel 1080–1140',
      'free 1140–1320',
    ])
  })

  it('counts only booked lessons: excused and cancelled ones free their time', () => {
    const day = coachDay('2026-10-03', [
      cancelled(lesson('2026-10-03', '09:00', '10:00'), 'excused'),
      lesson('2026-10-03', '17:00', '19:00', { lessons: 2 }),
    ])
    expect(bookedLessons(day).map((l) => l.starts_at)).toEqual(['2026-10-03T17:00:00+08:00'])
    expect(dayLessonsLabel(day)).toBe('Saturday 3 Oct, 1 lesson')
    expect(dayLessonsLabel(saturday)).toBe('Saturday 3 Oct, 3 lessons')
    // The day strip's buttons: their own words, so the name contains what they show.
    expect(dayButtonLabel(day)).toBe('Sat 3, 1 lesson')
    expect(dayButtonLabel(saturday)).toBe('Sat 3, 3 lessons')
    expect(kinds(day)[0]).toBe('free 420–720')
  })

  it('keeps a cancelled lesson from stretching the hours', () => {
    const day = coachDay('2026-10-03', [
      cancelled(lesson('2026-10-03', '05:00', '06:00'), 'cancelled'),
    ])
    expect(coachWeekHours([day])).toEqual({ from: 420, to: 1320 })
    expect(
      coachWeekHours([coachDay('2026-10-03', [lesson('2026-10-03', '05:00', '06:00')])]),
    ).toEqual({ from: 300, to: 1320 })
  })

  it('draws no travel beside a gap-override neighbour', () => {
    const friday = {
      ...coachDay('2026-10-02', [
        lesson('2026-10-02', '19:30', '20:30', { travel_after: 0 }),
        lesson('2026-10-02', '21:00', '22:00', { travel_before: 0, gap_override: true }),
      ]),
      open: [{ starts_at: at('2026-10-02', '17:30'), ends_at: at('2026-10-02', '22:00') }],
    }
    expect(kinds(friday)).toEqual([
      'closed 420–1050',
      'free 1050–1110',
      'travel 1110–1170',
      'Aiman & Sofia 1170–1230',
      'free 1230–1260',
      'Aiman & Sofia 1260–1320',
    ])
  })
})

describe('the coach’s words for a day and a lesson', () => {
  it('summarises the open hours and blocked time before a day’s lessons', () => {
    const blocked = coachDay('2026-10-03', [], {
      open: [
        { starts_at: at('2026-10-03', '09:00'), ends_at: at('2026-10-03', '12:00') },
        { starts_at: at('2026-10-03', '16:00'), ends_at: at('2026-10-03', '22:00') },
      ],
      closed: [{ starts_at: at('2026-10-03', '07:00'), ends_at: at('2026-10-03', '09:00') }],
    })
    expect(describeCoachDay(blocked)).toBe(
      'Open 9:00 am–12:00 pm and 4:00–10:00 pm. Blocked 7:00–9:00 am.',
    )
    expect(
      describeCoachDay({
        ...saturday,
        open: [{ starts_at: at('2026-09-28', '17:30'), ends_at: at('2026-09-28', '22:00') }],
      }),
    ).toBe('Open 5:30–10:00 pm.')
    expect(describeCoachDay({ ...saturday, open: [] })).toBe('Closed all day.')
  })

  it('writes where a lesson is: the place alone for 1-to-1, the type first for a group', () => {
    const [pair, trio, , hana] = saturday.lessons
    expect(lessonPlace(pair)).toBe('1-to-2 · Palm Court')
    expect(lessonPlace(trio)).toBe('1-to-3 · Maple Condo')
    expect(lessonPlace(hana)).toBe('Sunrise Res.')
  })

  it('writes the day view’s line, with "2 lessons" for a 2-hour lesson', () => {
    expect(lessonLine(saturday.lessons[0])).toBe('9:00–10:00 am · 1-to-2 · Palm Court')
    expect(lessonLine(saturday.lessons[1])).toBe('11:00 am–12:00 pm · 1-to-3 · Maple Condo')
    const chloe = lesson('2026-10-04', '10:00', '12:00', {
      size: 1,
      type_label: '1-to-1',
      location: 'Vista Heights',
      lessons: 2,
    })
    expect(lessonLine(chloe)).toBe('10:00 am–12:00 pm · Vista Heights · 2 lessons')
  })

  it('lists a lesson’s flags in the drawing’s order, never Unpaid', () => {
    // An unpaid group's lesson: paying is the group's status, not each lesson's (Herman,
    // 2 Oct 2026).
    expect(saturday.lessons[3].unpaid).toBe(true)
    expect(lessonNotes(saturday.lessons[3])).toEqual([])
    expect(lessonNotes(saturday.lessons[0])).toEqual([])
    expect(
      lessonNotes(
        lesson('2026-10-02', '21:00', '22:00', {
          gap_override: true,
          unpaid: true,
          last_lesson: true,
        }),
      ),
    ).toEqual(['Last paid lesson', 'Gap override'])
  })
})

describe('the coach’s week', () => {
  const block = (id: string, day: string, from: string, to: string) => ({
    id,
    kind: 'closed' as const,
    starts_at: at(day, from),
    ends_at: to === '24:00' ? at('2026-10-05', '00:00') : at(day, to),
    note: null,
  })

  it('lists each exception once, in start order, though it crosses midnight', () => {
    const night = {
      ...block('b', '2026-10-04', '20:00', '24:00'),
      ends_at: at('2026-10-05', '09:00'),
    }
    const morning = block('a', '2026-10-03', '07:00', '09:00')
    const days = [
      coachDay('2026-10-03', [], { exceptions: [morning] }),
      coachDay('2026-10-04', [], { exceptions: [night] }),
      coachDay('2026-10-05', [], { exceptions: [night] }),
    ]
    expect(weekExceptions(days)).toEqual([morning, night])
  })

  it('tells the asked-for week from a week still on screen', () => {
    const days = [
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]
    const week = days.map((day) => coachDay(day, []))
    expect(isWeekOf(week, '2026-09-28')).toBe(true)
    expect(isWeekOf(week, '2026-10-05')).toBe(false)
    expect(isWeekOf(week.slice(1), '2026-09-29')).toBe(false)
  })
})
