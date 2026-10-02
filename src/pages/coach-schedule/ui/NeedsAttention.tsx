import { useId, useRef } from 'react'

import { usePendingAccounts } from '@/entities/account'
import { lastLessonLabel, unpaidPackageLabel, useCoachBalances } from '@/entities/balance'
import { useCoachGroups } from '@/entities/group'
import { ApproveAccountButton } from '@/features/approve-account'
import { coachStudentsPay } from '@/shared/config/routes'
import { formatDay } from '@/shared/lib/time'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { SectionTitle } from '@/shared/ui/SectionTitle'
import { Skeleton } from '@/shared/ui/Skeleton'

import { attentionGroups } from '../model/attention'
import { LoadError } from './LoadError'

type NeedsAttentionProps = {
  /** An account was approved: show the notice ("Siti Aminah approved"); its row goes. */
  onApproved: (notice: string) => void
}

const row = 'flex min-h-13 items-center justify-between gap-3'
const name = 'text-sm leading-[normal] font-medium break-words'

/**
 * "Needs attention" (design/AdminSchedule.dc.html L219-230; the Schedule spec §3.6): groups
 * that owe ("Package 6 unpaid", with "Record payment" to Students & payments' panel), then
 * groups on their last paid lesson ("Last lesson of Package 4 on Thu 1 Oct"), then accounts
 * waiting for approval, with "Approve".
 */
export function NeedsAttention({ onApproved }: NeedsAttentionProps) {
  const titleId = useId()
  const section = useRef<HTMLElement>(null)
  const balances = useCoachBalances()
  const groups = useCoachGroups()
  const waiting = usePendingAccounts({ order: 'name' })
  // Only a read that never loaded: when a refresh fails, the rows shown stay (the next
  // refresh tries again).
  const failed = [balances, groups, waiting].find((query) => query.isLoadingError)
  const loaded = balances.data && groups.data && waiting.data
  const { unpaid, lastLesson } = attentionGroups(balances.data ?? [], groups.data ?? [])
  const accounts = waiting.data ?? []

  return (
    // Focusable, so "Try again" can hand focus to the rows that take its place.
    <section ref={section} tabIndex={-1} aria-labelledby={titleId} className="flex flex-col">
      <SectionTitle id={titleId} className="mb-1.5">
        Needs attention
      </SectionTitle>
      {failed ? (
        <LoadError
          error={failed.error}
          onRetry={() => {
            for (const query of [balances, groups, waiting]) {
              if (query.isLoadingError) void query.refetch()
            }
          }}
          focusAfter={section}
        />
      ) : !loaded ? (
        // Three rows of the drawn 52 px.
        <div aria-busy="true" className="flex flex-col">
          {[0, 1, 2].map((each) => (
            <Skeleton key={each} className="my-1 h-11" />
          ))}
          <p role="status" className="sr-only">
            Loading…
          </p>
        </div>
      ) : unpaid.length + lastLesson.length + accounts.length === 0 ? (
        <p className="text-label text-muted">Nothing needs your attention.</p>
      ) : (
        <ul role="list" className="m-0 flex list-none flex-col p-0">
          {unpaid.map(({ group, balance }) => (
            <li key={group.group_id} className={row}>
              <div className="flex min-w-0 flex-col gap-px">
                <span className={name}>{group.display_names}</span>{' '}
                <span className="text-small text-warn">{unpaidPackageLabel(balance)}</span>
              </div>
              <ButtonLink
                to={coachStudentsPay(group.group_id)}
                variant="link"
                textSize="label"
                className="shrink-0 whitespace-nowrap"
              >
                {/* The space stays outside the hidden part, so every browser keeps it. */}
                <span>
                  Record payment <span className="sr-only">for {group.display_names}</span>
                </span>
              </ButtonLink>
            </li>
          ))}
          {lastLesson.map(({ group, balance }) => (
            <li key={group.group_id} className="flex min-h-13 flex-col justify-center gap-px">
              <span className={name}>{group.display_names}</span>{' '}
              <span className="text-small text-muted">{lastLessonLabel(balance)}</span>
            </li>
          ))}
          {accounts.map((account) => (
            <li key={account.id} className={row}>
              <div className="flex min-w-0 flex-col gap-px">
                <span className={name}>{account.display_name}</span>{' '}
                <span className="text-small text-muted">
                  {`Waiting for approval · signed up ${formatDay(account.created_at)}`}
                </span>
              </div>
              <ApproveAccountButton account={account} onApproved={onApproved} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
