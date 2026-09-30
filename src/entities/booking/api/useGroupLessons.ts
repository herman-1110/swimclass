import { queryOptions, useQuery } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'
import type { Instant } from '@/shared/lib/time'

import { excusableLessons } from '../model/lists'
import { positionOf } from '../model/position'
import type { GroupLesson, LedgerEntry } from '../model/types'
import { bookingKeys } from './keys'

/**
 * Every lesson of one group, newest first (coach-students spec §5.1 R7, R8): the bookings
 * rows, any status, joined with booking_ledger's numbers for the booked ones.
 */
async function readGroupLessons(groupId: string): Promise<GroupLesson[]> {
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
    }),
    readRows('booking_ledger', {
      eq: { group_id: groupId },
      columns: ['booking_id', 'package_no', 'lesson_in_package', 'lessons', 'used'],
    }) as Promise<LedgerEntry[]>,
  ])
  const entries = new Map(ledger.map((entry) => [entry.booking_id, entry]))
  return bookings.map((booking) => {
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
}

function groupLessons(groupId: string | null) {
  return queryOptions({
    queryKey: bookingKeys.group(groupId),
    queryFn: () => readGroupLessons(groupId ?? ''),
    enabled: groupId !== null,
  })
}

/**
 * Every lesson of one group, newest first, for the coach's History: booked ones with their
 * lesson numbers and whether they have ended, cancelled and excused ones with their details.
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
    select: (lessons) => excusableLessons(lessons, now),
  })
}
