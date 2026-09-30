import type { DateKey } from '@/shared/lib/time'

import type { CoachSlotCheckArgs } from '../model/types'

/** Query keys for start times (week_slots) (ARCHITECTURE §3.6): features refresh them after a change. */
export const slotKeys = {
  all: ['slot'] as const,
  /** Book's week of start times for one length and group (`week_slots`). */
  week: (weekStart: DateKey | null, minutes: number | null, groupId: string | null) =>
    [...slotKeys.all, 'week', weekStart, minutes, groupId] as const,
  /** Add booking's check of one start time (`coach_slot_check`). */
  check: (args: CoachSlotCheckArgs | null) => [...slotKeys.all, 'check', args] as const,
}
