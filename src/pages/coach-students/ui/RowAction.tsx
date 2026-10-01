import { Button } from '@/shared/ui/Button'

import type { PackageRow } from '../model/rows'

type RowActionProps = {
  row: PackageRow
  /** The button's id (rowActionId): the page moves focus to it. */
  id: string
  onRecordPayment: (groupId: string) => void
  onHistory: (groupId: string) => void
}

// Below 1024 px the tab bar (73 px) is stuck to the bottom of the window: a button that takes
// focus scrolls clear of it (the browser keeps this margin free when it scrolls to focus).
const clearOfTabBar = 'shrink-0 scroll-mb-24 lg:scroll-mb-0'

/**
 * A row's action (DESIGN §4): "Record payment" while the package is unpaid, otherwise
 * "History" (AdminStudents.dc.html:122, 138). The names follow the visible words for screen
 * readers: "Record payment for Hana", "History for Priya".
 */
export function RowAction({ row, id, onRecordPayment, onHistory }: RowActionProps) {
  const { group_id: groupId, display_names: names } = row.group
  if (row.balance.unpaid) {
    return (
      <Button
        id={id}
        size="compact"
        className={clearOfTabBar}
        onClick={() => onRecordPayment(groupId)}
      >
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
      className={clearOfTabBar}
      aria-haspopup="dialog"
      onClick={() => onHistory(groupId)}
    >
      <span>
        History <span className="sr-only">for {names}</span>
      </span>
    </Button>
  )
}
