import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'

import { balanceKeys } from '@/entities/balance'
import { bookingKeys } from '@/entities/booking'
import { emailLogKeys } from '@/entities/email-log'
import { openHoursKeys } from '@/entities/open-hours'
import { scheduleKeys } from '@/entities/schedule'
import { type CoachSettings, settingsKeys } from '@/entities/settings'
import { slotKeys } from '@/entities/slot'
import { AppError, rpc, toAppError } from '@/shared/api/rpc'

import type { SaveRequest } from '../model/types'

/** What a save did. */
export type SaveSettingsResult = {
  /** set_open_hours replaced the week. */
  hoursSaved: boolean
  /** The row update_settings saved and returned (trimmed, sorted), or null when no setting was sent. */
  settings: CoachSettings | null
}

/**
 * update_settings refused after set_open_hours had saved the hours: the hours are saved,
 * the other changes aren't (two calls, two transactions; coach-settings §5.4). Its code and
 * detail are update_settings' own.
 */
export class HoursOnlySavedError extends AppError {
  constructor(refusal: AppError) {
    super(refusal.code, { ...refusal.detail }, refusal)
    this.name = 'HoursOnlySavedError'
  }
}

// What each change refreshes (data-contracts §8; coach-settings §5.5). The open hours move
// Book's start times and both week views; the settings also move the travel gaps, the
// customers' copy of the settings and every package count. The email log after any save
// (§5.7). Only the queries on screen refetch; the rest are marked stale.
const AFTER_HOURS = [openHoursKeys.all, slotKeys.all, scheduleKeys.all]
const AFTER_SETTINGS = [
  settingsKeys.all,
  slotKeys.all,
  scheduleKeys.all,
  balanceKeys.all,
  bookingKeys.all,
]

function refresh(queryClient: QueryClient, keys: readonly (readonly unknown[])[]) {
  const unique = [...new Map(keys.map((key) => [JSON.stringify(key), key])).values()]
  return Promise.all(
    [...unique, emailLogKeys.all].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  )
}

/**
 * Save (prompt 10 TASK 7): set_open_hours first, when the hours changed (the whole week),
 * then update_settings with only the changed settings. If set_open_hours refuses, nothing
 * is saved and update_settings isn't asked. If update_settings refuses after the hours were
 * saved, it throws HoursOnlySavedError.
 */
export async function saveSettings({ rules, patch }: SaveRequest): Promise<SaveSettingsResult> {
  if (rules) await rpc('set_open_hours', { p_rules: rules })
  const hoursSaved = rules !== null
  if (!patch) return { hoursSaved, settings: null }
  try {
    return { hoursSaved, settings: await rpc('update_settings', { p_settings: patch }) }
  } catch (error) {
    throw hoursSaved ? new HoursOnlySavedError(toAppError(error)) : error
  }
}

/**
 * The Settings form's Save (`saveSettings`). On success the saved row goes straight into
 * the coach's settings, so the form shows what the database kept (prompt 10: "It returns
 * the saved row, which the form then shows"); then everything the change affects is
 * refreshed, and the mutation stays pending until what's on screen has the fresh data.
 * After HoursOnlySavedError it refreshes what the saved hours affect.
 */
export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: (result, request) => {
      if (result.settings) queryClient.setQueryData(settingsKeys.coach(), result.settings)
      return refresh(queryClient, [
        ...(request.rules ? AFTER_HOURS : []),
        ...(request.patch ? AFTER_SETTINGS : []),
      ])
    },
    onError: (error) =>
      error instanceof HoursOnlySavedError ? refresh(queryClient, AFTER_HOURS) : undefined,
  })
}
