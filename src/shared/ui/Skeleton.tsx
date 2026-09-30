import { cn } from '@/shared/lib/cn'

type SkeletonShape = 'block' | 'frame' | 'line' | 'circle'

type SkeletonProps = {
  /**
   * The size of what it stands in for, and layout: "h-12" (an option row), "h-11" (a
   * time chip), "h-3.5 w-40" (a line of text).
   */
  className?: string
  /** The corners of what it stands in for: block 10 px (default), frame 12 px, line 4 px, circle. */
  shape?: SkeletonShape
}

// UI kit spec §3.24 (not drawn): --line rather than --subtle, which is too faint to read
// as loading (1.08:1 on white). The pulse stops under reduced motion.
const shapes: Record<SkeletonShape, string> = {
  block: 'rounded-control',
  frame: 'rounded-frame',
  line: 'rounded-sm',
  circle: 'rounded-full',
}

/**
 * A grey placeholder that keeps the layout still while data loads. Hidden from screen
 * readers: the region being loaded carries aria-busy="true" and one visually hidden
 * "Loading…" (role="status").
 */
export function Skeleton({ className, shape = 'block' }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-pulse bg-line motion-reduce:animate-none',
        shapes[shape],
        className,
      )}
    />
  )
}
