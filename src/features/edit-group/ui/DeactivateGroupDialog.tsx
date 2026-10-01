import { useEffect, useRef } from 'react'

import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'

import { useSetGroupActive } from '../api/useSetGroupActive'
import {
  DEACTIVATE_DESCRIPTION,
  DEACTIVATE_GROUP,
  deactivateTitle,
  GROUP_DEACTIVATED,
} from '../model/copy'
import type { EditableGroup } from '../model/types'

type DeactivateGroupDialogProps = {
  group: Pick<EditableGroup, 'group_id' | 'display_names'>
  onClose: () => void
  /** Deactivated and refreshed: the owner closes the dialog and shows the notice. */
  onDeactivated: (notice: string) => void
}

/**
 * The confirmation before a group is deactivated (coach-add-students §2.7, §7; proposed).
 * The database refuses while the group has lessons ahead (`has_upcoming_lessons`, which every
 * seed group has): the message shows above the buttons and only Cancel stays active. Only a
 * network failure can be tried again.
 */
export function DeactivateGroupDialog({
  group,
  onClose,
  onDeactivated,
}: DeactivateGroupDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const deactivate = useSetGroupActive()
  const final = deactivate.isError && toAppError(deactivate.error).code !== 'network'
  // "Deactivate group" stops working after a final refusal: keep focus on Cancel.
  useEffect(() => {
    if (final) cancelRef.current?.focus()
  }, [final])

  return (
    <Dialog
      open
      onClose={onClose}
      role="alertdialog"
      size="sm"
      hideClose
      busy={deactivate.isPending}
      initialFocus={cancelRef}
      title={deactivateTitle(group)}
      description={DEACTIVATE_DESCRIPTION}
      actions={
        <>
          <Button
            className="flex-1"
            pending={deactivate.isPending}
            aria-disabled={deactivate.isPending || final || undefined}
            onClick={() =>
              deactivate.mutate(
                { groupId: group.group_id, active: false },
                { onSuccess: () => onDeactivated(GROUP_DEACTIVATED) },
              )
            }
          >
            {DEACTIVATE_GROUP}
          </Button>
          <Button
            ref={cancelRef}
            variant="quiet"
            tone="muted"
            aria-disabled={deactivate.isPending || undefined}
            onClick={onClose}
          >
            Cancel
          </Button>
        </>
      }
    >
      {deactivate.isError && (
        <p role="alert" className="text-label leading-normal text-warn">
          {messageFor(deactivate.error, { audience: 'coach' })}
        </p>
      )}
    </Dialog>
  )
}
