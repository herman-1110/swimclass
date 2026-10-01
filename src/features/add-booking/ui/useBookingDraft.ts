import { useState } from 'react'

import { useCoachGroups } from '@/entities/group'
import { usePublicSettings } from '@/entities/settings'
import { useCoachSlotCheck } from '@/entities/slot'
import { useNow } from '@/shared/lib/hooks/useNow'
import type { DateKey } from '@/shared/lib/time'

import type { CoachBookInput } from '../api/useCoachBook'
import { bookBlocker, checkArgs, newDraft, startOf, weeksOf } from '../model/draft'

/**
 * The Add booking form's state and what follows from it: the chosen (active) group, the
 * start, the length (the first of the settings' lengths until one is chosen), the weeks, the
 * live check of the first week (`coach_slot_check`, a preview), what still keeps it from
 * booking, and what to book once nothing does.
 */
export function useBookingDraft(defaultDate: DateKey) {
  const now = useNow()
  const [draft, setDraft] = useState(() => newDraft(defaultDate))
  const settings = usePublicSettings()
  const groups = useCoachGroups()
  const group = groups.data?.find((each) => each.active && each.group_id === draft.groupId)
  const minutes = draft.minutes ?? settings.data?.lesson_lengths[0] ?? null
  const check = useCoachSlotCheck(checkArgs(draft, minutes))
  const start = startOf(draft)
  const weeks = weeksOf(draft)
  // The answer for the latest input only: while it is checked the last one is out of date.
  const answer = check.isChecking ? undefined : check.data
  const blocker = bookBlocker({
    hasGroup: group !== undefined,
    start,
    minutes,
    weeks,
    clash: answer !== undefined && !answer.ok,
  })
  // What `coach_book` is asked once nothing blocks it ("Book anyway" adds ignoreCredit).
  const input: Omit<CoachBookInput, 'ignoreCredit'> | null =
    blocker === null && group && start && minutes !== null && weeks !== null
      ? {
          groupId: group.group_id,
          startsAt: start.toISOString(),
          minutes,
          repeatWeeks: weeks,
          ignoreOpenHours: draft.ignoreOpenHours,
          gapOverride: draft.gapOverride,
        }
      : null

  return {
    draft,
    setDraft,
    settings,
    group: group ?? null,
    /** A group's names by its id: the notice names the group that was booked. */
    namesOf: (groupId: string) =>
      groups.data?.find((each) => each.group_id === groupId)?.display_names ?? '',
    start,
    minutes,
    weeks,
    gapMinutes: settings.data?.travel_gap_minutes ?? null,
    check,
    answer,
    past: start !== null && start.getTime() < now.getTime(),
    blocker,
    input,
  }
}

/** The Add booking form's state, as useBookingDraft gives it. */
export type BookingDraftState = ReturnType<typeof useBookingDraft>
