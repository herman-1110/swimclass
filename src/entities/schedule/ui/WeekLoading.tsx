import { cn } from '@/shared/lib/cn'
import { Skeleton } from '@/shared/ui/Skeleton'

type WeekLoadingProps = {
  /** The grid it covers: its blocks' side insets (2 px compact, 3 px comfortable). */
  size: 'compact' | 'comfortable'
  /** What a screen reader hears: "Loading the timetable", "Loading the week". */
  status: string
}

/**
 * A week grid's loading look (customer-schedule §6.1, coach-schedule §6.1): one full-height
 * grey block per day column, so an empty week can't be mistaken for an all-free one.
 * WeekGrid lays it over the day columns; the grid itself carries aria-busy.
 */
export function WeekLoading({ size, status }: WeekLoadingProps) {
  return (
    <div className="grid h-full grid-cols-7">
      {Array.from({ length: 7 }, (_, index) => (
        <div
          key={index}
          // After the column's 1 px border, the blocks' own insets.
          className={cn('flex py-px', size === 'compact' ? 'pr-0.5 pl-0.75' : 'pr-0.75 pl-1')}
        >
          <Skeleton shape="line" className="flex-1" />
        </div>
      ))}
      <p role="status" className="sr-only">
        {status}
      </p>
    </div>
  )
}
