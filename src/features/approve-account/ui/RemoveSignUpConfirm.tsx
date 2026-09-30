import { useEffect, useRef } from 'react'

import type { PendingAccount } from '@/entities/account'
import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'

import { useRemoveSignUp } from '../api/useRemoveSignUp'
import { removeDescription, removeTitle, SIGN_UP_REMOVED } from '../model/copy'

type RemoveSignUpConfirmProps = {
  account: Pick<PendingAccount, 'id' | 'display_name' | 'username'>
  onClose: () => void
  onRemoved: (notice: string) => void
}

/**
 * The open "Remove sign-up" confirmation (the Students spec §5.3 W7, proposed): mounted only
 * while open, so every opening starts fresh. Focus starts on "Cancel", the safe action.
 */
export function RemoveSignUpConfirm({ account, onClose, onRemoved }: RemoveSignUpConfirmProps) {
  const cancel = useRef<HTMLButtonElement>(null)
  const remove = useRemoveSignUp({ onRemoved: () => onRemoved(SIGN_UP_REMOVED) })
  // Only a network failure is worth trying again; after anything else "Cancel" reads "Close".
  const final = remove.isError && toAppError(remove.error).code !== 'network'

  useEffect(() => {
    if (final) cancel.current?.focus()
  }, [final])

  return (
    <Dialog
      open
      onClose={onClose}
      role="alertdialog"
      size="sm"
      hideClose
      busy={remove.isPending}
      initialFocus={cancel}
      title={removeTitle(account.display_name)}
      description={removeDescription(account.username)}
      actions={
        <>
          {!final && (
            <Button
              className="flex-1"
              pending={remove.isPending}
              aria-disabled={remove.isPending || undefined}
              onClick={() => remove.mutate({ accountId: account.id })}
            >
              Remove sign-up
            </Button>
          )}
          <Button
            ref={cancel}
            variant="quiet"
            tone="muted"
            aria-disabled={remove.isPending || undefined}
            onClick={onClose}
          >
            {final ? 'Close' : 'Cancel'}
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
