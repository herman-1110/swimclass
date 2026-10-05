import type { PendingAccount } from '@/entities/account'
import { ApproveAccountButton, RemoveSignUpButton } from '@/features/approve-account'
import { formatDayMonth, formatTime, type Instant } from '@/shared/lib/time'
import { Card } from '@/shared/ui/Card'
import { Table, type TableColumn } from '@/shared/ui/Table'

import { type RowLayout, waitingActionsId, type WaitingPlace } from './rowFocus'

type WaitingAccountsProps = {
  accounts: readonly PendingAccount[]
  now: Instant
  /** Approved or removed: where the account was, and the notice ("Siti Rahman approved"). */
  onLeave: (place: WaitingPlace, notice: string) => void
}

const name = 'text-sm leading-[normal] font-semibold'
const small = 'text-small text-muted'

const columns: TableColumn[] = [
  { key: 'name', header: 'Name', width: 'w-50', rowHeader: true },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone', width: 'w-35' },
  { key: 'signedUp', header: 'Signed up', width: 'w-30' },
  { key: 'action', header: 'Action', align: 'end' },
]

/**
 * Accounts waiting for approval (coach-students §3.9, proposed; not drawn): a table from
 * 768 px (name and username, email with "Not confirmed" until they confirm it, phone, when
 * they signed up, Remove and Approve) and cards on phones.
 */
export function WaitingAccounts({ accounts, now, onLeave }: WaitingAccountsProps) {
  const actions = (account: PendingAccount, index: number, layout: RowLayout) => {
    const leave = (notice: string) => onLeave({ id: account.id, index, layout }, notice)
    return (
      <span
        id={waitingActionsId(layout, account.id)}
        className="flex shrink-0 items-start justify-end gap-2"
      >
        <RemoveSignUpButton account={account} onRemoved={leave} />
        <ApproveAccountButton account={account} look="compact" onApproved={leave} />
      </span>
    )
  }
  return (
    <>
      <div className="max-md:hidden">
        <Table
          caption="Accounts waiting for approval"
          columns={columns}
          rows={accounts.map((account, index) => ({
            key: account.id,
            cells: {
              name: (
                <span className="flex flex-col gap-0.5">
                  <span className={name}>{account.display_name}</span>{' '}
                  <span className={small}>{account.username}</span>
                </span>
              ),
              email: (
                <span className="flex flex-col gap-0.5 text-label">
                  {account.email}
                  {!account.email_confirmed && <span className={small}>Not confirmed</span>}
                </span>
              ),
              phone: <span className="text-label">{account.phone}</span>,
              signedUp: (
                <span className="flex flex-col gap-0.5">
                  <span className="text-label">{formatDayMonth(account.created_at, now)}</span>{' '}
                  <span className={small}>{formatTime(account.created_at)}</span>
                </span>
              ),
              action: actions(account, index, 'table'),
            },
          }))}
        />
      </div>
      <ul
        role="list"
        aria-label="Accounts waiting for approval"
        className="flex flex-col gap-3 md:hidden"
      >
        {accounts.map((account, index) => (
          <li key={account.id}>
            <Card padding="sm" className="flex flex-col gap-3 break-words">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body font-semibold">{account.display_name}</span>{' '}
                <span className={small}>{account.username}</span>
              </span>
              <span className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  {account.email && <span className={small}>{account.email}</span>}{' '}
                  {!account.email_confirmed && <span className={small}>Not confirmed</span>}{' '}
                  {account.phone && <span className={small}>{account.phone}</span>}{' '}
                  <span className={small}>
                    {`Signed up ${formatDayMonth(account.created_at, now)}`}
                  </span>
                </span>
                {actions(account, index, 'card')}
              </span>
            </Card>
          </li>
        ))}
      </ul>
    </>
  )
}
