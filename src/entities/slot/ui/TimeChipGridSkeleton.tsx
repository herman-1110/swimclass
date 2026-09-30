import { Skeleton } from '@/shared/ui/Skeleton'

import { CHIP_GRID } from './chipGrid'

type TimeChipGridSkeletonProps = {
  /** How many chip blocks: 10 fills two rows on a phone (book.md §6.1). */
  count?: number
}

/**
 * Grey 44 px chips in TimeChipGrid's grid while a week's start times load, so the layout
 * stays still (book.md §6.1). Hidden from screen readers: the loading region carries
 * aria-busy and its own "Loading start times…" status.
 */
export function TimeChipGridSkeleton({ count = 10 }: TimeChipGridSkeletonProps) {
  return (
    <div className={CHIP_GRID}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-11" />
      ))}
    </div>
  )
}
