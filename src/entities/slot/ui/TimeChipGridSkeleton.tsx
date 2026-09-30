import { cn } from '@/shared/lib/cn'
import { Skeleton } from '@/shared/ui/Skeleton'

import { CHIP_GRID } from './chipGrid'

// Book asks for two rows of chip blocks (book.md §6.1), but the grid fits 3 to 11 chips a
// row depending on the width (4 at 360 px, 3 in Book's left column at 768–1279 px, 7 at
// 1440 px, 11 in a 727 px column just under 768 px). So it draws enough blocks for two
// full rows of 12 and clips the grid to two 44 px rows and the gap between them: 94 px
// (6 px gap), 96 px from 768 px (8 px gap).
const BLOCKS = 24

/**
 * Two rows of grey 44 px chips in TimeChipGrid's grid, at every width, while a week's
 * start times load (book.md §6.1: the first load, and a week, length or group change).
 * Hidden from screen readers: the loading region carries aria-busy and its own "Loading
 * start times…" status.
 */
export function TimeChipGridSkeleton() {
  return (
    <div className={cn(CHIP_GRID, 'max-h-23.5 overflow-hidden md:max-h-24')}>
      {Array.from({ length: BLOCKS }, (_, index) => (
        <Skeleton key={index} className="h-11" />
      ))}
    </div>
  )
}
