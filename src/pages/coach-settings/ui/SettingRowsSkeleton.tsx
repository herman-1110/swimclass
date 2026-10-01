import { Skeleton } from '@/shared/ui/Skeleton'

type SettingRowsSkeletonProps = {
  /** How many setting rows the section has. */
  count: number
}

/** A section's setting rows while they load (coach-settings §6.2): 54 px each. */
export function SettingRowsSkeleton({ count }: SettingRowsSkeletonProps) {
  return Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className="flex min-h-13.5 items-center justify-between gap-4 border-t border-line-row px-3.5 first:border-t-0 md:px-4"
    >
      <Skeleton shape="line" className="h-3 w-36" />
      <Skeleton shape="line" className="h-3 w-16" />
    </div>
  ))
}
