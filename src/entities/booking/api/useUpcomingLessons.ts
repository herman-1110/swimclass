import { useQuery } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'

import { positionOf } from '../model/position'
import type { LedgerEntry, UpcomingLesson } from '../model/types'
import { bookingKeys } from './keys'

/**
 * The account's booked lessons that haven't ended, in start order (my-classes spec §5.1 R6,
 * R7): booking_ledger's `used = false` is "not ended yet" by the database clock, so the
 * boundary never depends on the device's clock. The locations come from bookings.
 */
async function readUpcoming(groupIds: readonly string[]): Promise<UpcomingLesson[]> {
  if (groupIds.length === 0) return []
  const ledger = (await readRows('booking_ledger', {
    in: { group_id: groupIds },
    eq: { used: false },
    columns: [
      'booking_id',
      'group_id',
      'starts_at',
      'ends_at',
      'package_no',
      'lesson_in_package',
      'lessons',
    ],
    order: [{ column: 'starts_at' }, { column: 'booking_id' }],
  })) as LedgerEntry[]
  if (ledger.length === 0) return []
  const places = await readRows('bookings', {
    in: { id: ledger.map((entry) => entry.booking_id) },
    columns: ['id', 'location'],
  })
  const locations = new Map(places.map((place) => [place.id, place.location]))
  return ledger.map((entry) => ({
    id: entry.booking_id,
    group_id: entry.group_id,
    starts_at: entry.starts_at,
    ends_at: entry.ends_at,
    location: locations.get(entry.booking_id) ?? '',
    position: positionOf(entry),
  }))
}

/**
 * The signed-in customer's upcoming lessons (My classes): pass the ids of all the account's
 * groups (useAccountGroups), paused ones too. Filtering by them keeps the coach's "View as
 * customer" empty: RLS would show him everyone's (TECH_SPEC §6). Waits while the ids are
 * null; no groups gives an empty list. Rows can end while the page is open: hide them with
 * notEnded(lessons, now).
 */
export function useUpcomingLessons(groupIds: readonly string[] | null) {
  return useQuery({
    queryKey: bookingKeys.upcoming(groupIds),
    queryFn: () => readUpcoming(groupIds ?? []),
    enabled: groupIds !== null,
  })
}
