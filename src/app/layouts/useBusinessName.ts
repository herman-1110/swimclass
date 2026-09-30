import { usePublicSettings } from '@/entities/settings'
import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'

/**
 * The business name on signed-in layouts: the settings' business_name (prompt 05 TASK 3).
 * Empty while the settings load, so a different name never flashes up first (the line
 * keeps its height), and DEFAULT_BUSINESS_NAME if they fail (auth spec §2.6, §6.5).
 */
export function useBusinessName(): string {
  const settings = usePublicSettings()
  if (settings.data) return settings.data.business_name
  return settings.isError ? DEFAULT_BUSINESS_NAME : ''
}
