import { Tag } from '@/shared/ui/Tag'

import { formatHoursRange, timeOfDayMinutes } from '../model/hours'
import type { WeeklyRange } from '../model/types'

type HoursChipsProps = {
  /** One day's ranges (rangesByWeekday), or the ranges being edited ("HH:MM" works too). */
  ranges: readonly Pick<WeeklyRange, 'opens_at' | 'closes_at'>[]
}

/**
 * A day's open hours as range chips, in opening order (design/AdminSettings.dc.html, the
 * open hours table's Hours cell; coach-settings §3.3): "5:30–10:00 pm". They wrap onto more
 * lines when the cell is narrow. A day with no hours says "Closed" (coach-settings §3.3,
 * proposed). Display only: the Edit button belongs to the Settings form.
 */
export function HoursChips({ ranges }: HoursChipsProps) {
  if (ranges.length === 0) return <span className="text-label text-muted">Closed</span>
  const sorted = ranges.toSorted(
    (a, b) => timeOfDayMinutes(a.opens_at) - timeOfDayMinutes(b.opens_at),
  )
  return (
    // role="list": Safari drops list semantics from lists without bullets.
    <ul role="list" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {sorted.map((range) => (
        <li key={`${range.opens_at}-${range.closes_at}`} className="flex">
          <Tag tone="accent">{formatHoursRange(range.opens_at, range.closes_at)}</Tag>
        </li>
      ))}
    </ul>
  )
}
