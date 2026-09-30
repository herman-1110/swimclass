import { Skeleton } from '@/shared/ui/Skeleton'

/**
 * A lesson row's place while the lessons load (my-classes spec §6): three lines 18, 16 and
 * 16 px tall, and a 44 px block on the right, with the row's divider. Hidden from screen
 * readers: the loading region carries aria-busy and its own "Loading…" status.
 */
export function LessonRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Skeleton shape="line" className="h-4.5 w-3/5" />
        <Skeleton shape="line" className="h-4 w-4/5" />
        <Skeleton shape="line" className="h-4 w-[35%]" />
      </div>
      <Skeleton className="h-11 w-13 shrink-0" />
    </div>
  )
}
