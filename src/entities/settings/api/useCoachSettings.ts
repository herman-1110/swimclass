import { useQuery } from '@tanstack/react-query'

import { AppError, readRows } from '@/shared/api/rpc'

import type { CoachSettings } from '../model/types'
import { settingsKeys } from './keys'

/**
 * The whole settings row (TECH_SPEC §3), which only the coach may read (RLS; TECH_SPEC §6):
 * Settings shows and edits it, and Add students reads the students per lesson, the package
 * size and the prices from it (one read, so both pages share it; coach-settings §4.2). A
 * customer gets no row (no error from the database), so this fails with `not_found`.
 * After `update_settings` the feature may put the saved row into settingsKeys.coach(), then
 * refreshes settingsKeys.all, which covers usePublicSettings too.
 */
export function useCoachSettings() {
  return useQuery({
    queryKey: settingsKeys.coach(),
    queryFn: async (): Promise<CoachSettings> => {
      const [settings] = await readRows('settings', { eq: { id: 1 } })
      if (!settings) throw new AppError('not_found')
      return settings
    },
  })
}
