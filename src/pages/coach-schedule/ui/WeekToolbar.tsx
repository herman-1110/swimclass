import { CoachScheduleLegend, formatCoachWeekLabel } from '@/entities/schedule'
import type { DateKey } from '@/shared/lib/time'
import { WeekNav } from '@/shared/ui/WeekNav'

type WeekToolbarProps = {
  /** The Monday of the week shown. */
  weekStart: DateKey
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

/**
 * The week navigation and the legend (design/AdminSchedule.dc.html L76-92; the Schedule spec
 * §3.2): ‹ "28 Sep – 4 Oct 2026" › and "Today"; the legend (Lesson, Travel gap, Closed) from
 * 768 px only, at the right. The week label is read out when it changes. The coach may go
 * back and forward without limit.
 */
export function WeekToolbar({ weekStart, onPrevious, onNext, onToday }: WeekToolbarProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <WeekNav
        label={formatCoachWeekLabel(weekStart)}
        onPrevious={onPrevious}
        onNext={onNext}
        onToday={onToday}
      />
      <CoachScheduleLegend />
    </div>
  )
}
