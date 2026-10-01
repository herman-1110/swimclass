import { Skeleton } from '@/shared/ui/Skeleton'

/**
 * The open hours frame while it loads (coach-settings §6.2): the table's header at its own
 * height, then seven 48 px rows striped like the table's (Tue, Thu and Sat).
 */
export function OpenHoursRowsSkeleton() {
  return (
    <>
      <div className="flex border-b border-frame bg-table-head px-3 py-2.5 text-small font-semibold text-tag-ink md:px-4">
        <span className="w-16 md:w-26">Day</span>
        <span>Hours</span>
      </div>
      {/* Their own box, so even: counts the rows only, as the table's tbody does. */}
      <div>
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className="flex h-12 items-center gap-6 border-b border-line-row px-3 last:border-b-0 even:bg-zebra md:gap-12 md:px-4"
          >
            <Skeleton shape="line" className="h-3 w-8" />
            <Skeleton shape="line" className="h-3 w-28" />
          </div>
        ))}
      </div>
    </>
  )
}
