import { Skeleton } from '@/shared/ui/Skeleton'

/**
 * The day view's list while the week loads (coach-schedule §6.1): a few grey rows in the
 * blocks' place, and "Loading the week" for screen readers.
 */
export function DayViewLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-1.5">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex gap-3">
          <span className="w-15 shrink-0" />
          <Skeleton className="h-11 flex-1" />
        </div>
      ))}
      <p role="status" className="sr-only">
        Loading the week
      </p>
    </div>
  )
}
