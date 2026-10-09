import { useState } from 'react'

import type { Group } from '@/entities/group'
import { Button } from '@/shared/ui/Button'

import { DELETE_GROUP } from '../model/copy'
import { DeleteGroupDialog } from './DeleteGroupDialog'

type DeleteGroupButtonProps = {
  group: Pick<Group, 'group_id' | 'display_names' | 'type_label'>
  /** The account's name, for the confirmation. */
  accountName: string
  /** Deleted: the page closes History and shows this notice. */
  onDeleted: (notice: string) => void
}

/**
 * History's "Delete group", for a group added by mistake (Herman, 9 Oct 2026): a quiet
 * button under "Deactivate group" that opens the confirmation.
 */
export function DeleteGroupButton({ group, accountName, onDeleted }: DeleteGroupButtonProps) {
  const [confirming, setConfirming] = useState(false)
  return (
    <>
      <Button
        variant="quiet"
        size="sm"
        // Its words line up with the text of the drawer's group block, as the buttons above.
        className="-ml-3.5"
        aria-haspopup="dialog"
        onClick={() => setConfirming(true)}
      >
        {DELETE_GROUP}
      </Button>
      {confirming && (
        <DeleteGroupDialog
          group={group}
          accountName={accountName}
          onClose={() => setConfirming(false)}
          onDeleted={onDeleted}
        />
      )}
    </>
  )
}
