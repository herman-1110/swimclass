import { formatWeekLabel } from '@/entities/schedule'
import type { BookableWindow } from '@/entities/slot'
import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import type { DateKey } from '@/shared/lib/time'
import { DayStrip } from '@/shared/ui/DayStrip'
import { WeekNav } from '@/shared/ui/WeekNav'

import { dayStripDays } from '../model/days'
import { bookPageWords } from '../model/words'

type DaySectionProps = {
  /** The Monday of the week shown. */
  weekStart: DateKey
  /** The chosen day, or null while the opening day is worked out. */
  selected: DateKey | null
  today: DateKey
  /** Free starts per day; null while the week's start times load or if they failed. */
  counts: ReadonlyMap<DateKey, number> | null
  /** The weeks the navigation offers: this week to the last bookable one. */
  bookable: Pick<BookableWindow, 'thisWeek' | 'lastWeek'>
  onSelect: (day: DateKey) => void
  /** -1 for the week before, 1 for the week after. */
  onMoveWeek: (weeks: number) => void
  /** Layout only: the page's grid area. */
  className?: string
}

/**
 * "Day" (design/Main.dc.html:100-114): the week's range between the previous and next
 * week buttons (not drawn on Book: the Schedule drawing's 44 px chevrons, book spec C5),
 * then the seven days. The navigation stays within the booking window (TECH_SPEC §5.1).
 */
export function DaySection({
  weekStart,
  selected,
  today,
  counts,
  bookable,
  onSelect,
  onMoveWeek,
  className,
}: DaySectionProps) {
  const language = useLanguage()
  return (
    <div className={className}>
      <DayStrip
        days={dayStripDays(weekStart, today, counts, language)}
        selected={selected ?? ''}
        onSelect={onSelect}
        heading={{
          label: wordsIn(bookPageWords, language).day,
          range: (
            <WeekNav
              size="sm"
              label={formatWeekLabel(weekStart, language)}
              previousDisabled={weekStart <= bookable.thisWeek}
              nextDisabled={weekStart >= bookable.lastWeek}
              onPrevious={() => onMoveWeek(-1)}
              onNext={() => onMoveWeek(1)}
            />
          ),
        }}
      />
    </div>
  )
}
