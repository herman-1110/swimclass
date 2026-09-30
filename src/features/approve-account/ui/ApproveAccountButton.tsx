import { useId } from 'react'

import type { PendingAccount } from '@/entities/account'
import { messageFor } from '@/shared/config/messages'
import { Button } from '@/shared/ui/Button'

import { useApproveAccount } from '../api/useApproveAccount'
import { approvedNotice } from '../model/copy'

type ApproveAccountButtonProps = {
  /** A waiting account (`usePendingAccounts`). */
  account: Pick<PendingAccount, 'id' | 'display_name'>
  /**
   * link (default): the schedule's Needs attention, like its "Record payment" link
   * (AdminSchedule.dc.html). compact: the Waiting for approval table on Students &
   * payments, like a row's "Record payment" button (AdminStudents.dc.html).
   */
  look?: 'link' | 'compact'
  /** Approved: show this as a notice ("Siti Rahman approved"). The row then leaves the
   *  waiting list when the accounts refresh. */
  onApproved?: (notice: string) => void
}

/**
 * "Approve" for an account waiting for approval (DESIGN §4; the Schedule spec §7.4: at once,
 * no confirmation). Its name includes the account ("Approve Siti Rahman"); it keeps its
 * label while the call runs, and a refusal shows under it.
 */
export function ApproveAccountButton({
  account,
  look = 'link',
  onApproved,
}: ApproveAccountButtonProps) {
  const errorId = useId()
  const approve = useApproveAccount({
    onApproved: () => onApproved?.(approvedNotice(account.display_name)),
  })

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        {...(look === 'compact'
          ? { size: 'compact' as const }
          : { variant: 'link' as const, textSize: 'label' as const })}
        className="whitespace-nowrap"
        pending={approve.isPending}
        aria-describedby={approve.isError ? errorId : undefined}
        onClick={() => approve.mutate({ accountId: account.id })}
      >
        {/* The space stays outside the hidden part, so every browser keeps it in the name. */}
        <span>
          Approve <span className="sr-only">{account.display_name}</span>
        </span>
      </Button>
      {approve.isError && (
        <span
          id={errorId}
          role="alert"
          className="max-w-64 text-right text-small leading-[1.4] text-warn"
        >
          {messageFor(approve.error, { audience: 'coach' })}
        </span>
      )}
    </span>
  )
}
