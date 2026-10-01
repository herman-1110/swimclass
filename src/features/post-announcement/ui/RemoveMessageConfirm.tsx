import { useRef } from 'react'

import type { PinnedAnnouncement } from '@/entities/announcement'
import { messageFor } from '@/shared/config/messages'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'

import { useRemoveAnnouncement } from '../api/useRemoveAnnouncement'
import { REMOVE_DESCRIPTION, REMOVE_TITLE, REMOVED_NOTICE } from '../model/copy'

type RemoveMessageConfirmProps = {
  announcement: Pick<PinnedAnnouncement, 'id'>
  /** "Keep message" and Esc. */
  onClose: () => void
  /** Removed: close this and show the notice ("Message removed."). */
  onRemoved: (notice: string) => void
}

/**
 * "Remove this message?" (the Schedule spec §7.4, proposed): an alertdialog with focus on
 * the safe "Keep message", "Remove message" → "Removing…" while the call runs, and the
 * refusal's words above the buttons. Mounted only while open, so each opening starts fresh.
 */
export function RemoveMessageConfirm({
  announcement,
  onClose,
  onRemoved,
}: RemoveMessageConfirmProps) {
  const keep = useRef<HTMLButtonElement>(null)
  const remove = useRemoveAnnouncement({ onRemoved: () => onRemoved(REMOVED_NOTICE) })

  return (
    <Dialog
      open
      onClose={onClose}
      role="alertdialog"
      size="sm"
      hideClose
      busy={remove.isPending}
      initialFocus={keep}
      title={REMOVE_TITLE}
      description={REMOVE_DESCRIPTION}
      actions={
        <>
          <Button
            className="flex-1"
            pending={remove.isPending}
            aria-disabled={remove.isPending || undefined}
            onClick={() => remove.mutate({ id: announcement.id })}
          >
            {remove.isPending ? 'Removing…' : 'Remove message'}
          </Button>
          <Button
            ref={keep}
            variant="quiet"
            tone="muted"
            aria-disabled={remove.isPending || undefined}
            onClick={onClose}
          >
            Keep message
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
