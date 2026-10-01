import { PackageSummarySkeleton } from '@/entities/balance'
import { TimeChipGridSkeleton } from '@/entities/slot'
import { BookingSummaryPlaceholder } from '@/features/book-lesson'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Skeleton'

import { AREA, BOOK_GRID } from './bookGrid'

type BookSkeletonProps = {
  /** settings' cancel_cutoff_hours once known, for the summary's note. */
  cutoffHours: number | null
}

/**
 * The screen while the settings, groups and balances load (book spec §6.1): grey blocks
 * where the option rows, package, days, length and start times will be, and the summary
 * in state A, all in the real grid so nothing moves when the data arrives.
 */
export function BookSkeleton({ cutoffHours }: BookSkeletonProps) {
  return (
    <div aria-busy="true" className={BOOK_GRID}>
      <p role="status" className="sr-only">
        Loading…
      </p>
      {/* The legend, the option rows and the help line, which takes two lines below 1280 px. */}
      <div className={cn(AREA.group, 'flex flex-col gap-2')}>
        <Skeleton shape="line" className="h-4 w-40" />
        <div className="flex flex-col gap-2 md:grid md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton shape="line" className="h-3 w-full xl:w-96" />
          <Skeleton shape="line" className="h-3 w-24 xl:hidden" />
        </div>
      </div>
      <Card framedFrom="md" className={AREA.package}>
        <PackageSummarySkeleton />
      </Card>
      <div className={cn(AREA.day, 'flex flex-col gap-1.5')}>
        <div className="flex h-11 items-center justify-between">
          <Skeleton shape="line" className="h-4 w-8" />
          <Skeleton shape="line" className="h-4 w-36" />
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="flex h-19 flex-col items-center justify-center gap-1">
              <Skeleton shape="line" className="h-3.5 w-6" />
              <Skeleton shape="circle" className="size-9" />
              <span className="size-1" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className={cn(AREA.length, 'h-12.5 max-w-[426px]')} />
      <div className={cn(AREA.times, 'flex flex-col gap-3.5')}>
        <div className="flex h-11 items-center">
          <Skeleton shape="line" className="h-4 w-40" />
        </div>
        <TimeChipGridSkeleton />
      </div>
      <BookingSummaryPlaceholder cutoffHours={cutoffHours} className={AREA.summary} />
    </div>
  )
}
