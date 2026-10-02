import { accountLine } from '../model/accountLabel'
import type { Group } from '../model/types'

type GroupIdentityProps = {
  group: Pick<Group, 'display_names' | 'size' | 'location'>
  /** The account's display name ("Farah"); the line says "Own account" when it is theirs. */
  accountName: string
  /** table (default): the Students table's cell. card: the phone card's head (15 px name). */
  variant?: 'table' | 'card'
}

// AdminStudents.dc.html:117 (table cell) and :194 (card): a column 2 px apart, the names
// in 600 over a 12 px muted account line. The drawings set no line height (Figtree's own).
// Names and locations of any length wrap, even inside a word, so the Students column can
// shrink and the table keeps its other columns in its frame (coach-students §6).
const names = {
  table: 'text-sm leading-[normal] font-semibold',
  card: 'text-body font-semibold',
}

/**
 * Who a package belongs to on the coach's Students & payments: the group's names, then
 * "Farah’s account · Sunrise Res." (coach-students §3.5, §3.6, §5.2.5). Put it in the
 * table's row-header cell, or at the top left of a card beside the type tag.
 */
export function GroupIdentity({ group, accountName, variant = 'table' }: GroupIdentityProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 wrap-anywhere">
      {/* The space keeps the two lines apart when the cell is read out as one name. */}
      <span className={names[variant]}>{group.display_names}</span>{' '}
      <span className="text-small text-muted">{accountLine(group, accountName)}</span>
    </div>
  )
}
