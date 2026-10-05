import { useState } from 'react'

import type { PendingAccount } from '@/entities/account'
import { possessive } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'

import { RemoveSignUpConfirm } from './RemoveSignUpConfirm'

type RemoveSignUpButtonProps = {
  /** A waiting account (`usePendingAccounts`). */
  account: Pick<PendingAccount, 'id' | 'display_name' | 'username'>
  /** Removed: show this as a notice ("Sign-up removed"). */
  onRemoved?: (notice: string) => void
}

/**
 * "Remove" beside Approve in Waiting for approval (the Students spec §3.9: styled like a
 * row's "History"), with its confirmation (`admin-accounts` `delete_account`).
 */
export function RemoveSignUpButton({ account, onRemoved }: RemoveSignUpButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="underline" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span>
          Remove <span className="sr-only">{possessive(account.display_name)} sign-up</span>
        </span>
      </Button>
      {open && (
        <RemoveSignUpConfirm
          account={account}
          onClose={() => setOpen(false)}
          onRemoved={(notice) => {
            setOpen(false)
            onRemoved?.(notice)
          }}
        />
      )}
    </>
  )
}
