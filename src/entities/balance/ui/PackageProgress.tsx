import type { ReactNode } from 'react'

import { SegmentBar } from '@/shared/ui/SegmentBar'

import {
  type LaterPackage,
  laterPackageBarLabel,
  laterPackages,
  laterPackageUsage,
  packageBarLabel,
  packageUsage,
} from '../model/packages'
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
 * 2 booked, 2 left of 4"), since the counts beside it leave out what's left. Each later
 * package with lessons booked in it follows, drawn the same way ("Package 2", "1 booked · 3
 * left"; Herman, 7 Oct 2026).
 */
export function PackageProgress({ balance, variant }: PackageProgressProps) {
  const later = laterPackages(balance)
  const current = (
    <PackageLine
      variant={variant}
      packageNo={balance.package_no}
      counts={packageUsage(balance)}
      bar={
        <SegmentBar
          total={balance.package_size}
          used={balance.used_in_package}
          booked={balance.booked_in_package}
          size="md"
          width={variant === 'table' ? 'fixed' : 'fill'}
          label={packageBarLabel(balance)}
        />
      }
    />
  )
  if (later.length === 0) return current

  return (
    <div className="flex flex-col gap-3">
      {current}
      {later.map((next) => (
        <LaterLine key={next.package_no} later={next} variant={variant} />
      ))}
    </div>
  )
}

function LaterLine({ later, variant }: { later: LaterPackage; variant: 'table' | 'card' }) {
  return (
    <PackageLine
      variant={variant}
      packageNo={later.package_no}
      counts={laterPackageUsage(later)}
      bar={
        <SegmentBar
          total={later.package_size}
          used={0}
          booked={later.booked}
          size="md"
          width={variant === 'table' ? 'fixed' : 'fill'}
          label={laterPackageBarLabel(later)}
        />
      }
    />
  )
}

type PackageLineProps = {
  variant: 'table' | 'card'
  packageNo: number
  counts: string
  bar: ReactNode
}

function PackageLine({ variant, packageNo, counts, bar }: PackageLineProps) {
  const title = <span className="text-label font-semibold">Package {packageNo}</span>
  const usage = <span className="text-small text-muted">{counts}</span>

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
