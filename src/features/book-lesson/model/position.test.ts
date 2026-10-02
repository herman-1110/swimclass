import { beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { type BookedLesson, lessonsBookedBefore, newLessonPosition } from './position'

// The seed at Sat 26 Sep 2026 12:00 MYT (data-contracts Appendix C).
const SOFIA = 'c0000000-0000-4000-8000-000000000002'
const AIMAN_AND_SOFIA = 'c0000000-0000-4000-8000-000000000001'
const NURUL = 'c0000000-0000-4000-8000-000000000013'

/** Upcoming lessons as useUpcomingLessons gives them: Mei Ling's, with Sat 3 Oct made 2 hours. */
const UPCOMING: BookedLesson[] = [
  {
    group_id: AIMAN_AND_SOFIA,
    starts_at: '2026-09-26T09:00:00+00:00',
    position: { package_no: 4, lesson_in_package: 1, lessons: 1 },
  },
  {
    group_id: AIMAN_AND_SOFIA,
    starts_at: '2026-10-03T01:00:00+00:00',
    position: { package_no: 4, lesson_in_package: 2, lessons: 2 },
  },
  {
    group_id: SOFIA,
    starts_at: '2026-10-04T09:00:00+00:00',
    position: { package_no: 2, lesson_in_package: 4, lessons: 1 },
  },
]

describe('lessonsBookedBefore', () => {
  it('counts the group’s booked lessons that start earlier, a 2-hour one as 2', () => {
    // Sat 3 Oct 7:00 pm MYT.
    expect(lessonsBookedBefore(UPCOMING, SOFIA, '2026-10-03T11:00:00+00:00')).toBe(0)
    expect(lessonsBookedBefore(UPCOMING, AIMAN_AND_SOFIA, '2026-10-03T11:00:00+00:00')).toBe(3)
    // Tue 6 Oct 7:30 pm MYT, written in Malaysia time.
    expect(lessonsBookedBefore(UPCOMING, SOFIA, '2026-10-06T19:30:00+08:00')).toBe(1)
    // Tue 29 Sep: only Sat 26 Sep is earlier.
    expect(lessonsBookedBefore(UPCOMING, AIMAN_AND_SOFIA, '2026-09-29T11:30:00+00:00')).toBe(1)
    expect(lessonsBookedBefore([], SOFIA, '2026-10-03T11:00:00+00:00')).toBe(0)
  })
})

describe('newLessonPosition', () => {
  const sofia = { package_size: 4, used_lessons: 7, booked_lessons: 1 }

  it('puts the lesson after the lessons used and the booked ones before it', () => {
    expect(newLessonPosition(sofia, 0, 1)).toEqual({
      package_no: 2,
      lesson_in_package: 4,
      lessons: 1,
    })
    expect(newLessonPosition(sofia, 1, 1)).toEqual({
      package_no: 3,
      lesson_in_package: 1,
      lessons: 1,
    })
    expect(newLessonPosition(sofia, 0, 2)).toEqual({
      package_no: 2,
      lesson_in_package: 4,
      lessons: 2,
    })
  })

  it('never counts more lessons before it than are booked', () => {
    expect(newLessonPosition(sofia, 5, 1)).toEqual(newLessonPosition(sofia, 1, 1))
    expect(newLessonPosition(sofia, -1, 1)).toEqual(newLessonPosition(sofia, 0, 1))
  })

  it('starts a group with nothing used at Package 1, lesson 1', () => {
    expect(
      newLessonPosition({ package_size: 4, used_lessons: 0, booked_lessons: 0 }, 0, 1),
    ).toEqual({ package_no: 1, lesson_in_package: 1, lessons: 1 })
  })
})

describe('newLessonPosition against booking_ledger (demo database)', () => {
  beforeAll(async () => {
    // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
    await logOut()
    await getSession()
  }, 60_000)

  /** Previews `minutes` at `startsAt` for the group, books it, and reads its ledger row. */
  async function previewThenBook(groupId: string, startsAt: string, minutes: number) {
    const [balance] = await readRows('group_balance', { eq: { group_id: groupId } })
    const upcoming = await readRows('booking_ledger', {
      eq: { group_id: groupId, used: false },
      columns: ['group_id', 'starts_at', 'package_no', 'lesson_in_package', 'lessons'],
    })
    const lessons: BookedLesson[] = upcoming.map((row) => ({
      group_id: row.group_id ?? '',
      starts_at: row.starts_at ?? '',
      position: {
        package_no: row.package_no ?? 0,
        lesson_in_package: row.lesson_in_package ?? 0,
        lessons: row.lessons ?? 0,
      },
    }))
    const preview = newLessonPosition(
      {
        package_size: balance.package_size ?? 0,
        used_lessons: balance.used_lessons ?? 0,
        booked_lessons: balance.booked_lessons ?? 0,
      },
      lessonsBookedBefore(lessons, groupId, startsAt),
      minutes / 60,
    )
    const [id] = await rpc('book_lesson', {
      p_group_id: groupId,
      p_starts_at: startsAt,
      p_minutes: minutes,
      p_repeat_weeks: 1,
    })
    const [row] = await readRows('booking_ledger', {
      eq: { booking_id: id },
      columns: ['package_no', 'lesson_in_package', 'lessons'],
    })
    return { preview, ledger: row }
  }

  it('numbers Sofia’s Sat 3 Oct lesson, booked before her Sun 4 Oct one, as the ledger does', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { preview, ledger } = await previewThenBook(SOFIA, '2026-10-03T11:00:00+00:00', 60)
    expect(preview).toEqual({ package_no: 2, lesson_in_package: 4, lessons: 1 })
    expect(ledger).toEqual(preview)
  })

  it('numbers Nurul’s 2-hour lesson before her Sun 4 Oct one as the ledger does', async () => {
    await logIn('nurul', DEMO_PASSWORD)
    const { preview, ledger } = await previewThenBook(NURUL, '2026-09-29T11:30:00+00:00', 120)
    expect(preview).toEqual({ package_no: 1, lesson_in_package: 3, lessons: 2 })
    expect(ledger).toEqual(preview)
  })
})
