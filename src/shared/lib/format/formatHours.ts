import type { Language } from '@/shared/i18n/language'

import { plural } from './plural'

/**
 * A number of hours: "1 hour", "6 hours", "0 hours" (DESIGN §6 `{cutoff}`, and the cancel
 * notes: "Free to cancel or reschedule up to 6 hours before."); Chinese "6 小时".
 */
export function formatHours(hours: number, language: Language = 'en'): string {
  if (!Number.isInteger(hours) || hours < 0) {
    throw new RangeError(`Expected a whole number of hours, got ${hours}.`)
  }
  return language === 'zh' ? `${hours} 小时` : plural(hours, 'hour')
}
