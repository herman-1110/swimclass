import { GroupIdentity } from '@/entities/group'

import type { PackageRow } from '../model/rows'

type GroupNameProps = {
  row: PackageRow
  variant: 'table' | 'card'
}

/**
 * Who a package is for: the names over "Farah’s account · Sunrise Res.", and a muted
 * "Inactive" line for a group the coach has deactivated (coach-students Q7).
 */
export function GroupName({ row, variant }: GroupNameProps) {
  const identity = (
    <GroupIdentity group={row.group} accountName={row.accountName} variant={variant} />
  )
  if (row.group.active) return identity
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      {identity} <span className="text-small text-muted">Inactive</span>
    </div>
  )
}
