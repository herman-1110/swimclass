import { useQuery } from '@tanstack/react-query'

import { AppError, rpc } from '@/shared/api/rpc'

import type { PublicSettings } from '../model/types'
import { settingsKeys } from './keys'

// Settings change rarely, and only when the coach saves them, which refreshes settingsKeys.all
// (the auth spec's R3: 5 minutes).
const FIVE_MINUTES = 5 * 60_000

/**
 * get_public_settings (TECH_SPEC §5.4): the business name, lesson lengths, prices and rules,
 * one row. Every signed-in account may read it, waiting accounts too; signed out it fails
 * (anon may not call it), so signed-out pages use DEFAULT_BUSINESS_NAME instead.
 */
export function usePublicSettings() {
  return useQuery({
    queryKey: settingsKeys.public(),
    queryFn: async (): Promise<PublicSettings> => {
      const [settings] = await rpc('get_public_settings')
      if (!settings) throw new AppError('not_found')
      return settings
    },
    staleTime: FIVE_MINUTES,
  })
}
