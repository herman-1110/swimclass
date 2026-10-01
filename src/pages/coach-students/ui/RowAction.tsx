import { Button } from '@/shared/ui/Button'

import type { PackageRow } from '../model/rows'

type RowActionProps = {
  row: PackageRow
  /** The button's id: the page moves focus to it after "Show all". */
  id: string
  onRecordPayment: (groupId: string) => void
  onHistory: (groupId: string) => void
}

/**
 * A row's action (DESIGN §4): "Record payment" while the package is unpaid, otherwise
 * "History" (AdminStudents.dc.html:122, 138). The names follow the visible words for screen
 * readers: "Record payment for Hana", "History for Priya".
 */
export function RowAction({ row, id, onRecordPayment, onHistory }: RowActionProps) {
  const { group_id: groupId, display_names: names } = row.group
  if (row.balance.unpaid) {
    return (
      <Button id={id} size="compact" className="shrink-0" onClick={() => onRecordPayment(groupId)}>
        <span>
          Record payment <span className="sr-only">for {names}</span>
        </span>
      </Button>
    )
  }
  return (
    <Button
      id={id}
      variant="underline"
      className="shrink-0"
      aria-haspopup="dialog"
      onClick={() => onHistory(groupId)}
    >
      <span>
        History <span className="sr-only">for {names}</span>
      </span>
    </Button>
  )
}
