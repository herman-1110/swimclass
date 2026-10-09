import { useEffect, useRef } from 'react'

import type { Group } from '@/entities/group'
import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'

import { useDeleteGroup } from '../api/useDeleteGroup'
import {
  DELETE_GROUP,
  deleteGroupDescription,
  deleteGroupTitle,
  groupDeleted,
  KEEP_GROUP,
} from '../model/copy'

type DeleteGroupDialogProps = {
  group: Pick<Group, 'group_id' | 'display_names' | 'type_label'>
  /** The account's name: "Mei Ling’s account stays". */
  accountName: string
  /** "Keep group" and Esc. */
  onClose: () => void
  /**
   * Gone: the page closes History and shows the notice ("Aiman & Sofia’s 1-to-2 group
   * deleted."). Called before the refresh, and this dialog goes with History.
   */
  onDeleted: (notice: string) => void
}

/**
 * "Delete Aiman & Sofia’s 1-to-2 group?" (Herman, 9 Oct 2026; like Remove payment's
 * confirmation): an alertdialog saying what goes and that the account stays, with focus on
 * the safe "Keep group". The database refuses while the group has lessons ahead
 * (`group_has_upcoming_lessons`, as every seed group has): the message shows above the
 * buttons and "Keep group" reads "Close". Only a network failure can be tried again.
 * Mounted only while open, so each opening starts fresh.
 */
export function DeleteGroupDialog({
  group,
  accountName,
  onClose,
  onDeleted,
}: DeleteGroupDialogProps) {
  const keep = useRef<HTMLButtonElement>(null)
  const remove = useDeleteGroup({ onDeleted: () => onDeleted(groupDeleted(group)) })
  const final = remove.isError && toAppError(remove.error).code !== 'network'

  // The focused "Delete group" goes after a final refusal: keep focus in the dialog.
  useEffect(() => {
    if (final) keep.current?.focus()
  }, [final])

  return (
    <Dialog
      open
      onClose={onClose}
      role="alertdialog"
      size="sm"
      hideClose
      busy={remove.isPending}
      initialFocus={keep}
      title={deleteGroupTitle(group)}
      description={deleteGroupDescription(accountName)}
      actions={
        <>
          {!final && (
            <Button
              className="flex-1"
              pending={remove.isPending}
              aria-disabled={remove.isPending || undefined}
              onClick={() => remove.mutate({ groupId: group.group_id })}
            >
              {remove.isPending ? 'Deleting…' : DELETE_GROUP}
            </Button>
          )}
          <Button
            ref={keep}
            variant="quiet"
            tone="muted"
            aria-disabled={remove.isPending || undefined}
            onClick={onClose}
          >
            {final ? 'Close' : KEEP_GROUP}
          </Button>
        </>
      }
    >
      {remove.isError && (
        <p role="alert" className="text-label leading-normal text-warn">
          {messageFor(remove.error, { audience: 'coach' })}
        </p>
      )}
    </Dialog>
  )
}
