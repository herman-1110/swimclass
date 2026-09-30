import { useQuery } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'
import { toMyt } from '@/shared/lib/time'

import { positionOf } from '../model/position'
import type { LedgerEntry, PastLesson, PastLessons } from '../model/types'
import { bookingKeys } from './keys'

/** How many past lessons My classes lists (prompt 07: "last 20"). */
export const PAST_LESSON_LIMIT = 20

/** Newest start first; the same start (never in one group) by id, as Postgres orders them. */
function newestFirst(a: PastLesson, b: PastLesson): number {
  const byStart = toMyt(b.starts_at).getTime() - toMyt(a.starts_at).getTime()
  return byStart !== 0 ? byStart : b.id < a.id ? -1 : b.id > a.id ? 1 : 0
}

/**
 * The latest lessons that aren't upcoming (my-classes spec §2.7, §5.1): the ones that have
 * ended (booking_ledger `used`, so the database clock decides, with their lesson numbers) and
 * the cancelled or excused ones (bookings), merged newest first. One more than the limit of
 * each is read, which says whether older ones exist.
 */
async function readPast(groupIds: readonly string[]): Promise<PastLessons> {
  if (groupIds.length === 0) return { lessons: [], hasMore: false }
  const [done, other] = await Promise.all([
    readRows('booking_ledger', {
      in: { group_id: groupIds },
      eq: { used: true },
      columns: [
        'booking_id',
        'group_id',
        'starts_at',
        'ends_at',
        'package_no',
        'lesson_in_package',
        'lessons',
      ],
      order: [
        { column: 'starts_at', ascending: false },
        { column: 'booking_id', ascending: false },
      ],
      limit: PAST_LESSON_LIMIT + 1,
    }) as Promise<LedgerEntry[]>,
    readRows('bookings', {
      in: { group_id: groupIds },
      neq: { status: 'booked' },
      columns: [
        'id',
        'group_id',
        'starts_at',
        'ends_at',
        'location',
        'status',
        'cancelled_at',
        'cancelled_by',
        'cancel_reason',
      ],
      order: [
        { column: 'starts_at', ascending: false },
        { column: 'id', ascending: false },
      ],
      limit: PAST_LESSON_LIMIT + 1,
    }),
  ])

  const merged: PastLesson[] = [
    ...done.map((entry) => ({
      id: entry.booking_id,
      group_id: entry.group_id,
      starts_at: entry.starts_at,
      ends_at: entry.ends_at,
      location: '',
      status: 'done' as const,
      cancelled_at: null,
      cancelled_by: null,
      cancel_reason: null,
      position: positionOf(entry),
    })),
    ...other.map((booking) => ({
      ...booking,
      status: booking.status === 'excused' ? ('excused' as const) : ('cancelled' as const),
      position: null,
    })),
  ].sort(newestFirst)
  const lessons = merged.slice(0, PAST_LESSON_LIMIT)

  // The ledger has no location: read it for the done lessons that are shown.
  const doneIds = lessons.filter((lesson) => lesson.status === 'done').map((lesson) => lesson.id)
  if (doneIds.length > 0) {
    const places = await readRows('bookings', {
      in: { id: doneIds },
      columns: ['id', 'location'],
    })
    const locations = new Map(places.map((place) => [place.id, place.location]))
    for (const lesson of lessons) lesson.location = locations.get(lesson.id) ?? lesson.location
  }
  return { lessons, hasMore: merged.length > PAST_LESSON_LIMIT }
}

/**
 * The signed-in customer's latest 20 lessons that aren't upcoming, newest first, and whether
 * older ones exist (My classes' "Past lessons and receipts"): pass the ids of all the
 * account's groups. Cancelled lessons are listed even when they were ahead. `enabled: false`
 * waits (the Past view reads only while it is open), as do null ids.
 */
export function usePastLessons(
  groupIds: readonly string[] | null,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: bookingKeys.past(groupIds),
    queryFn: () => readPast(groupIds ?? []),
    enabled: enabled && groupIds !== null,
  })
}
