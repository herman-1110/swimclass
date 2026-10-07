import type { Language } from '@/shared/i18n/language'
import { type DateKey, formatDay, mytInstant } from '@/shared/lib/time'

import { joinWithAnd } from './joinWithAnd'

/**
 * MYT dates ("yyyy-MM-dd", as `repeat_conflict` sends them) as a readable list (DESIGN §6
 * `{dates}`): "Sun 4 Oct", "Tue 13 Oct and Tue 20 Oct", "Tue 29 Sep, Tue 6 Oct and
 * Tue 13 Oct"; Chinese "10月13日 周二、10月20日 周二". Throws a RangeError for anything that
 * isn't a real date.
 */
export function formatDateList(dates: readonly DateKey[], language: Language = 'en'): string {
  // Noon MYT names the right day whatever the device's time zone (a bare date would be
  // read as UTC midnight).
  const days = dates.map((date) => formatDay(mytInstant(date, '12:00'), language))
  return language === 'zh' ? days.join('、') : joinWithAnd(days)
}
