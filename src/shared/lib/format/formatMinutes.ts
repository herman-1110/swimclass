import type { Language } from '@/shared/i18n/language'

import { formatHours } from './formatHours'
import { plural } from './plural'

/**
 * A number of minutes as people say it (DESIGN §6 `{gap}`, and the lesson lengths): whole
 * hours in hours ("1 hour", "2 hours"), anything else in minutes ("90 minutes",
 * "45 minutes", "0 minutes"); Chinese "1 小时", "90 分钟".
 */
export function formatMinutes(minutes: number, language: Language = 'en'): string {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new RangeError(`Expected a whole number of minutes, got ${minutes}.`)
  }
  if (minutes > 0 && minutes % 60 === 0) return formatHours(minutes / 60, language)
  return language === 'zh' ? `${minutes} 分钟` : plural(minutes, 'minute')
}
