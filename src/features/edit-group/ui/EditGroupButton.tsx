import { useState } from 'react'

import { Button } from '@/shared/ui/Button'

import { EDIT_GROUP } from '../model/copy'
import type { EditableGroup } from '../model/types'
import { EditGroupDialog } from './EditGroupDialog'

type EditGroupButtonProps = {
  group: EditableGroup
  /** The account holder ("Farah"), for the dialog's subtitle. */
  accountName: string
  /** Saved: show this notice ("Changes saved") in the History drawer. */
  onSaved?: (notice: string) => void
}

/**
 * "Edit group" in the History drawer's Group section (coach-add-students §1, §2.7): it opens
 * the Edit group dialog. Focus comes back to it when the dialog closes.
 */
export function EditGroupButton({ group, accountName, onSaved }: EditGroupButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="link" flush aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {EDIT_GROUP}
      </Button>
      {open && (
        <EditGroupDialog
          group={group}
          accountName={accountName}
          onClose={() => setOpen(false)}
          onSaved={(notice) => {
            setOpen(false)
            onSaved?.(notice)
          }}
        />
      )}
    </>
  )
}
