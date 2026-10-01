import type { Group } from '@/entities/group'

import { summaryGroup, summaryRepeat, summaryWhen } from '../model/copy'

type BookingSummaryProps = {
  group: Pick<Group, 'display_names' | 'type_label' | 'location'>
  start: Date
  end: Date
  /** Weeks to book: 1, or 2 to 52. */
  weeks: number
  /** The last week's start, when repeating. */
  lastStart: Date | null
}

/**
 * What will be booked (the Schedule spec §7.4, proposed): "Tue 29 Sep · 7:30–8:30 pm", then
 * "Aiman & Sofia · 1-to-2 · Palm Court", and "Every week for 3 weeks, until Tue 13 Oct"
 * when repeating.
 */
export function BookingSummary({ group, start, end, weeks, lastStart }: BookingSummaryProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-sm leading-[normal] font-semibold">{summaryWhen(start, end)}</p>
      <p className="text-label leading-[1.45] text-muted">{summaryGroup(group)}</p>
      {weeks > 1 && lastStart && (
        <p className="text-label leading-[1.45] text-muted">{summaryRepeat(weeks, lastStart)}</p>
      )}
    </div>
  )
}
