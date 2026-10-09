import { useState } from 'react'

import { DeleteGroupButton, EditGroupButton, GroupActiveButton } from '@/features/edit-group'

import type { PackageRow } from '../model/rows'
import { HistorySection } from './HistorySection'

type HistoryGroupProps = {
  row: PackageRow
  /** Deleted (Herman, 9 Oct 2026): the page closes History and shows this notice. */
  onDeleted: (notice: string) => void
}

const line = 'flex items-baseline justify-between gap-3 border-b border-line py-3'

/**
 * History's Group section (coach-add-students §2.7; coach-students §3.9): the pool and the
 * starting balance, "Edit group", "Deactivate group" or "Reactivate group", and "Delete group"
 * for one added by mistake. What the first two did is said in a polite live region under them
 * ("Changes saved", "Group deactivated"); a deleted group's notice is the page's, as History closes.
 */
export function HistoryGroup({ row, onDeleted }: HistoryGroupProps) {
  const [notice, setNotice] = useState('')
  const { group } = row
  return (
    <HistorySection title="Group">
      <dl>
        <div className={line}>
          <dt className="text-label text-muted">Pool location</dt>
          <dd className="min-w-0 text-right text-sm wrap-anywhere">{group.location}</dd>
        </div>
        <div className={line}>
          <dt className="text-label text-muted">Starting balance</dt>
          <dd className="text-right text-sm">
            {`${group.opening_used_lessons} used · ${group.opening_paid_lessons} paid`}
          </dd>
        </div>
      </dl>
      <div className="flex flex-col items-start pt-2">
        <EditGroupButton group={group} accountName={row.accountName} onSaved={setNotice} />
        <GroupActiveButton group={group} onChanged={setNotice} />
        <DeleteGroupButton group={group} accountName={row.accountName} onDeleted={onDeleted} />
      </div>
      {/* Always there (empty, it takes no room), so each notice is read out. */}
      <p role="status" className="text-label leading-normal">
        {notice}
      </p>
    </HistorySection>
  )
}
