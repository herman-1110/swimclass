import { cn } from '@/shared/lib/cn'

const sizes = {
  // 4 px: Book and My classes (design/Main.dc.html, MyClasses.dc.html)
  sm: { bar: 'gap-1', segment: 'h-1 rounded-xs', free: 'bg-seg-free' },
  // 6 px: the Students table and cards (design/AdminStudents.dc.html:119, :199), whose free
  // segments are a shade darker so they still show on the selected row (coach-students C4)
  md: { bar: 'gap-[3px]', segment: 'h-1.5 rounded-[3px]', free: 'bg-seg-free-table' },
}

type SegmentBarProps = {
  /** Lessons per package: one segment each. */
  total: number
  /** Lessons used (accent). */
  used: number
  /** Lessons booked, not used yet (--seg-booked). The rest are free (--seg-free, and
   *  --seg-free-table at md). */
  booked: number
  /** sm 4 px tall; md 6 px. */
  size?: keyof typeof sizes
  /** fill the width, or fixed: the table's 113 px (4 × 26 px segments, 3 px gaps), which any
   *  number of segments shares (ui-kit §3.14). */
  width?: 'fill' | 'fixed'
  /** A name for screen readers ("0 used, 2 booked, 2 left of 4"). Without it the bar is
   *  hidden from them, and the text beside it must say the same (DESIGN §3). */
  label?: string
}

/** A package as a row of segments: used, booked, then free (DESIGN §3 package bar). */
export function SegmentBar({
  total,
  used,
  booked,
  size = 'sm',
  width = 'fill',
  label,
}: SegmentBarProps) {
  if (total <= 0) return null
  const usedCount = Math.min(Math.max(used, 0), total)
  const bookedCount = Math.min(Math.max(booked, 0), total - usedCount)
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('grid', sizes[size].bar, width === 'fixed' && 'w-[113px]')}
      // As many columns as the package has lessons (a computed layout, ARCHITECTURE §3.7).
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            sizes[size].segment,
            index < usedCount
              ? 'bg-accent'
              : index < usedCount + bookedCount
                ? 'bg-seg-booked'
                : sizes[size].free,
          )}
        />
      ))}
    </div>
  )
}
