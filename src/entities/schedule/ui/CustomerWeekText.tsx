import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import type { DateKey } from '@/shared/lib/time'

import { describeCustomerDay } from '../model/describe'
import { formatWeekLabel } from '../model/labels'
import type { GridHours } from '../model/timeline'
import type { CustomerWeek } from '../model/types'
import { scheduleWords } from '../model/words'

type CustomerWeekTextProps = {
  weekStart: DateKey
  week: CustomerWeek
  hours: GridHours
}

/**
 * The customer grid in words (customer-schedule §7.4; DESIGN §5): one item per day with its
 * free times and the viewer's own lessons. WeekGrid shows it to screen readers only.
 */
export function CustomerWeekText({ weekStart, week, hours }: CustomerWeekTextProps) {
  const language = useLanguage()
  const w = wordsIn(scheduleWords, language)
  return (
    // role="list": Safari drops list semantics, and with them this name, from lists without
    // bullets.
    <ul role="list" aria-label={w.weekText(formatWeekLabel(weekStart, language))}>
      {week.map((day) => (
        <li key={day.day}>{describeCustomerDay(day, hours, language)}</li>
      ))}
    </ul>
  )
}
