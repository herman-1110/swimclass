import { SegmentBar } from '@/shared/ui/SegmentBar'

import { packageBarLabel, packageUsage } from '../model/packages'
import type { GroupBalance } from '../model/types'

type PackageProgressProps = {
  balance: GroupBalance
  /**
   * table: the Students table's Package cell ("Package 6" over a 113 px bar over "0 used ·
   * 2 booked"). card: the phone card's line ("Package 6" and the counts on one line, the bar
   * across the card under them).
   */
  variant: 'table' | 'card'
}

/**
 * A group's current package on the coach's Students screen: number, 6 px bar and counts
 * (AdminStudents.dc.html:119, :197-200). The bar is named for screen readers ("0 used,
 * 2 booked, 2 left of 4"), since the counts beside it leave out what's left.
 */
export function PackageProgress({ balance, variant }: PackageProgressProps) {
  const title = <span className="text-label font-semibold">Package {balance.package_no}</span>
  const usage = <span className="text-small text-muted">{packageUsage(balance)}</span>
  const bar = (
    <SegmentBar
      total={balance.package_size}
      used={balance.used_in_package}
      booked={balance.booked_in_package}
      size="md"
      width={variant === 'table' ? 'fixed' : 'fill'}
      label={packageBarLabel(balance)}
    />
  )

  if (variant === 'table') {
    return (
      <div className="flex flex-col gap-[5px]">
        {title}
        {bar}
        {usage}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        {title}
        {usage}
      </div>
      {bar}
    </div>
  )
}
