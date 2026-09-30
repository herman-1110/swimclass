import { queryOptions, useQuery } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'
import type { Instant } from '@/shared/lib/time'

import { excusableLessons } from '../model/lists'
import { positionOf } from '../model/position'
import type { GroupLessons, LedgerEntry } from '../model/types'
import { bookingKeys } from './keys'

/**
 * How many of a group's lessons the coach's History reads, newest first: years of lessons,
 * and well under the 1000 rows Supabase returns at most (data-contracts §2.3: history lists
 * need a limit).
 */
export const GROUP_LESSON_LIMIT = 200

/**
 * The newest `limit` lessons of one group, newest first (coach-students spec §5.1 R7, R8): the
 * bookings rows, any status, joined with booking_ledger's numbers for the booked ones. Both
 * reads take the newest rows in the same order, so every booked lesson kept has its ledger
 * row. One more than the limit is read, which says whether older ones exist. Exported for its
 * test; pages use useGroupLessons.
 */
export async function readGroupLessons(
  groupId: string,
  limit: number = GROUP_LESSON_LIMIT,
): Promise<GroupLessons> {
  const [bookings, ledger] = await Promise.all([
    readRows('bookings', {
      eq: { group_id: groupId },
      columns: [
        'id',
        'group_id',
        'starts_at',
        'ends_at',
        'location',
        'status',
        'gap_override',
        'cancelled_at',
        'cancelled_by',
        'cancel_reason',
      ],
      order: [
        { column: 'starts_at', ascending: false },
        { column: 'id', ascending: false },
      ],
      limit: limit + 1,
    }),
    readRows('booking_ledger', {
      eq: { group_id: groupId },
      columns: ['booking_id', 'package_no', 'lesson_in_package', 'lessons', 'used'],
      order: [
        { column: 'starts_at', ascending: false },
        { column: 'booking_id', ascending: false },
      ],
      limit: limit + 1,
    }) as Promise<LedgerEntry[]>,
  ])
  const entries = new Map(ledger.map((entry) => [entry.booking_id, entry]))
  const lessons = bookings.slice(0, limit).map((booking) => {
    const entry = booking.status === 'booked' ? entries.get(booking.id) : undefined
    return {
      id: booking.id,
      group_id: booking.group_id,
      starts_at: booking.starts_at,
      ends_at: booking.ends_at,
      location: booking.location,
      status: booking.status,
      gap_override: booking.gap_override,
      cancelled_at: booking.cancelled_at,
      cancelled_by: booking.cancelled_by,
      cancel_reason: booking.cancel_reason,
      position: entry ? positionOf(entry) : null,
      used: entry ? entry.used : null,
    }
  })
  return { lessons, hasMore: bookings.length > limit }
}

function groupLessons(groupId: string | null) {
  return queryOptions({
    queryKey: bookingKeys.group(groupId),
    queryFn: () => readGroupLessons(groupId ?? ''),
    enabled: groupId !== null,
  })
}

/**
 * One group's latest GROUP_LESSON_LIMIT lessons, newest first, and whether older ones exist,
 * for the coach's History: booked ones with their lesson numbers and whether they have ended,
 * cancelled and excused ones with their details. Waits while no group is chosen.
 */
export function useGroupLessons(groupId: string | null) {
  return useQuery(groupLessons(groupId))
}

/**
 * The group's lessons the coach may mark as excused (the Record payment panel's "Excuse a
 * missed lesson"): booked ones that have started by `now`, newest first, at most 10. The same
 * request as useGroupLessons. The database has the final say (`not_started`).
 */
export function useExcusableLessons(groupId: string | null, now: Instant) {
  return useQuery({
    ...groupLessons(groupId),
    select: (data) => excusableLessons(data.lessons, now),
  })
}
