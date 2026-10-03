import { BalanceStatus, PackageProgress } from '@/entities/balance'
import { LastPaid } from '@/entities/payment'
import type { Instant } from '@/shared/lib/time'
import { Table, type TableColumn } from '@/shared/ui/Table'
import { Tag } from '@/shared/ui/Tag'

import type { PackageRow } from '../model/rows'
import { GroupName } from './GroupName'
import { RowAction } from './RowAction'
import { rowActionId } from './rowFocus'

// AdminStudents.dc.html:107-112: the first five columns as wide as drawn (their content,
// without the cell padding); Action takes the rest.
const COLUMNS: readonly TableColumn[] = [
  { key: 'students', header: 'Students', width: 'w-50', rowHeader: true },
  { key: 'type', header: 'Type', width: 'w-18' },
  { key: 'package', header: 'Package', width: 'w-40' },
  { key: 'status', header: 'Status', width: 'w-[118px]' },
  { key: 'paid', header: 'Last paid', width: 'w-24' },
  { key: 'action', header: 'Action', align: 'end' },
]

type PackagesTableProps = {
  rows: readonly PackageRow[]
  /** Rows on --accent-soft: the payment panel's group, a group just added. */
  highlighted: ReadonlySet<string>
  now: Instant
  onRecordPayment: (groupId: string) => void
  onHistory: (groupId: string) => void
}

/** The packages table, from 768 px (AdminStudents.dc.html:103-190). */
export function PackagesTable({
  rows,
  highlighted,
  now,
  onRecordPayment,
  onHistory,
}: PackagesTableProps) {
  return (
    <div className="max-md:hidden">
      <Table
        caption="Packages, needs action first"
        columns={COLUMNS}
        rows={rows.map((row) => {
          const { group, balance } = row
          return {
            key: group.group_id,
            selected: highlighted.has(group.group_id),
            cells: {
              students: <GroupName row={row} variant="table" />,
              type: <Tag>{group.type_label}</Tag>,
              package: <PackageProgress balance={balance} variant="table" />,
              status: <BalanceStatus balance={balance} now={now} active={group.active} />,
              paid: (
                <LastPaid
                  paidOn={balance.last_paid_on}
                  method={balance.last_payment_method}
                  openingPaid={group.opening_paid_lessons}
                  variant="cell"
                  now={now}
                />
              ),
              action: (
                <RowAction
                  row={row}
                  id={rowActionId('table', group.group_id)}
                  onRecordPayment={onRecordPayment}
                  onHistory={onHistory}
                />
              ),
            },
          }
        })}
      />
    </div>
  )
}
