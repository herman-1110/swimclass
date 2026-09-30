import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query'

import { AppError, rpc } from '@/shared/api/rpc'

import type { CoachSlotCheckArgs, SlotCheck } from '../model/types'
import { slotKeys } from './keys'
import { useDebouncedValue } from './useDebouncedValue'

/** How long the dialog's input must stay still before it is checked (coach-schedule R8). */
const CHECK_DELAY_MS = 300

/**
 * Add booking's live clash reason (`coach_slot_check`, data-contracts §3.11): whether the
 * group can have that start with the coach's rules (past dates and dates beyond the window
 * allowed; "Outside open hours" and "Skip travel gap" as passed). First week only, and no
 * credit check: `coach_book` reports those.
 *
 * Pass null until the group, date, start and length are all chosen. The check runs once
 * the input has stayed the same for 300 ms, and the last answer stays on screen while the
 * next one runs. `isChecking` is true from a change until its answer arrives: show
 * "Checking…" then, not the older answer. Put the reason into words with `clashMessage`
 * (`{ audience: 'coach', gapMinutes }`). Errors: `not_coach`, `not_found`.
 */
export function useCoachSlotCheck(args: CoachSlotCheckArgs | null) {
  // Compared as text, so a new object with the same values is the same input.
  const input = args === null ? null : JSON.stringify(args)
  const settledInput = useDebouncedValue(input, CHECK_DELAY_MS)
  const settled = input === null || settledInput === null ? null : parseArgs(settledInput)

  const query = useQuery({
    queryKey: slotKeys.check(settled),
    queryFn:
      settled === null
        ? skipToken
        : async (): Promise<SlotCheck> => {
            const [check] = await rpc('coach_slot_check', settled)
            if (!check) throw new AppError('unknown')
            return check as SlotCheck
          },
    // Keep the last answer while the next input is checked, but none once the input is gone.
    placeholderData: settled === null ? undefined : keepPreviousData,
  })

  const isChecking = input !== null && (input !== settledInput || query.isFetching)
  return { ...query, isChecking }
}

function parseArgs(text: string): CoachSlotCheckArgs {
  const args: unknown = JSON.parse(text)
  return args as CoachSlotCheckArgs
}
