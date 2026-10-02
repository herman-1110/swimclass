import { Skeleton } from '@/shared/ui/Skeleton'

// Seven rows (344 px): about a typical loaded day (the seed's days from today measure 144 to
// 643 px, median 305), so Today and Needs attention below move little when the week arrives;
// four rows made them jump by up to 449 px.
const ROWS = 7

/**
 * The day view's list while the week loads (coach-schedule §6.1): grey rows in the blocks'
 * place, about a day's height, and "Loading the week" for screen readers.
 */
export function DayViewLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-1.5">
      {Array.from({ length: ROWS }, (_, index) => (
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
