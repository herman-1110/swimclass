import { BalanceStatus, PackageProgress } from '@/entities/balance'
import { lastPaidPhrase } from '@/entities/payment'
import type { Instant } from '@/shared/lib/time'
import { Card } from '@/shared/ui/Card'
import { Tag } from '@/shared/ui/Tag'

import type { PackageRow } from '../model/rows'
import { GroupName } from './GroupName'
import { RowAction } from './RowAction'
import { rowActionId } from './rowFocus'

type PackageCardsProps = {
  rows: readonly PackageRow[]
  /** Cards on --accent-soft: the payment panel's group, a group just added. */
  highlighted: ReadonlySet<string>
  now: Instant
  onRecordPayment: (groupId: string) => void
  onHistory: (groupId: string) => void
}

/**
 * The packages as cards, under 768 px (AdminStudents.dc.html:191-262): names and tag, the
 * package with its bar, then the status with the last payment and the action.
 */
export function PackageCards({
  rows,
  highlighted,
  now,
  onRecordPayment,
  onHistory,
}: PackageCardsProps) {
  return (
    <ul
      role="list"
      aria-label="Packages, needs action first"
      className="flex flex-col gap-3 md:hidden"
    >
      {rows.map((row) => {
        const { group, balance } = row
        const chosen = highlighted.has(group.group_id)
        const lastPaid = lastPaidPhrase(
          {
            paidOn: balance.last_paid_on,
            method: balance.last_payment_method,
            openingPaid: group.opening_paid_lessons,
          },
          now,
        )
        return (
          <li key={group.group_id} aria-current={chosen ? 'true' : undefined}>
            <Card padding="sm" selected={chosen} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <GroupName row={row} variant="card" />
                <Tag>{group.type_label}</Tag>
              </div>
              <PackageProgress balance={balance} variant="card" />
              <div className="flex items-center justify-between gap-3">
                <BalanceStatus balance={balance} now={now} lastPaid={lastPaid} />
                <RowAction
                  row={row}
                  id={rowActionId('card', group.group_id)}
                  onRecordPayment={onRecordPayment}
                  onHistory={onHistory}
                />
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
