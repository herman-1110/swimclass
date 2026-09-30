import { useState } from 'react'

import type { PendingAccount } from '@/entities/account'
import { possessive } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'

import { REMOVE_SIGN_UP_AVAILABLE } from '../api/useRemoveSignUp'
import { RemoveSignUpConfirm } from './RemoveSignUpConfirm'

type RemoveSignUpButtonProps = {
  /** A waiting account (`usePendingAccounts`). */
  account: Pick<PendingAccount, 'id' | 'display_name' | 'username'>
  /** Removed: show this as a notice ("Sign-up removed"). */
  onRemoved?: (notice: string) => void
}

/**
 * "Remove" beside Approve in Waiting for approval (the Students spec §3.9: styled like a
 * row's "History"), with its confirmation. It needs `admin-accounts`' `delete_account`
 * (prompt 09), which doesn't exist yet: until REMOVE_SIGN_UP_AVAILABLE it renders nothing,
 * as the spec recommends, so the page can place it today.
 */
export function RemoveSignUpButton({ account, onRemoved }: RemoveSignUpButtonProps) {
  const [open, setOpen] = useState(false)
  if (!REMOVE_SIGN_UP_AVAILABLE) return null

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
