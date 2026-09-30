import type { DateKey } from '@/shared/lib/time'

import { describeCustomerDay } from '../model/describe'
import { formatWeekLabel } from '../model/labels'
import type { GridHours } from '../model/timeline'
import type { CustomerWeek } from '../model/types'

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
  return (
    <ul aria-label={`Free times and your lessons, ${formatWeekLabel(weekStart)}`}>
      {week.map((day) => (
        <li key={day.day}>{describeCustomerDay(day, hours)}</li>
      ))}
    </ul>
  )
}
