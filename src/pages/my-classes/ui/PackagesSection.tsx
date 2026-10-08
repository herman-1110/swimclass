import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import {
  accountPackageNote,
  type GroupBalance,
  PackageSummary,
  PackageSummarySkeleton,
} from '@/entities/balance'
import { type Group, typeLabelIn } from '@/entities/group'
import { LastPaid } from '@/entities/payment'
import { packagePriceCents, type PublicSettings } from '@/entities/settings'
import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import { cn } from '@/shared/lib/cn'
import { useReadFailure } from '@/shared/lib/hooks/useReadFailure'
import { Card } from '@/shared/ui/Card'
import { SectionLabel } from '@/shared/ui/SectionLabel'

import { myClassesPageWords } from '../model/words'
import { SectionError } from './SectionError'

// The h2: it names the section, and takes focus once "Try again" has brought the packages.
const HEADING_ID = 'packages-heading'

type PackagesSectionProps = {
  /** The account's groups, oldest first: the active ones have a package to show. */
  groups: UseQueryResult<Group[]>
  balances: UseQueryResult<GroupBalance[]>
  /** The prices and the payment instructions. */
  settings: UseQueryResult<PublicSettings>
  now: Date
  /** Grid placement. */
  className?: string
}

/**
 * Packages (MyClasses.dc.html:92-128): each active group's package, its bar and counts, when
 * it was last paid (or Unpaid), and what to pay next with the coach's payment instructions.
 * Flat on phones, a card from 768 px.
 */
export function PackagesSection({
  groups,
  balances,
  settings,
  now,
  className,
}: PackagesSectionProps) {
  const language = useLanguage()
  const w = wordsIn(myClassesPageWords, language)
  const failure = useReadFailure([settings, groups, balances], () =>
    document.getElementById(HEADING_ID),
  )
  const ready =
    settings.data && groups.data && balances.data
      ? { settings: settings.data, groups: groups.data, balances: balances.data }
      : null
  const loading = !failure && !ready

  let body: ReactNode
  if (failure) {
    body = <SectionError failure={failure} />
  } else if (!ready) {
    body = (
      <>
        <p role="status" className="sr-only">
          {w.loadingPackages}
        </p>
        <ul aria-hidden="true" className="divide-y divide-line">
          {[1, 2].map((key) => (
            <li key={key} className="py-4">
              <PackageSummarySkeleton />
            </li>
          ))}
        </ul>
      </>
    )
  } else {
    const byGroup = new Map(ready.balances.map((balance) => [balance.group_id, balance]))
    body = (
      <ul role="list" className="divide-y divide-line">
        {ready.groups.map((group) => {
          const balance = byGroup.get(group.group_id)
          // Paused groups have no package to show (my-classes §6).
          if (!group.active || !balance) return null
          const typeLabel = typeLabelIn(group, language)
          const note = accountPackageNote(
            balance,
            {
              names: group.display_names,
              typeLabel,
              priceCents: packagePriceCents(ready.settings, group.size),
              now,
            },
            language,
          )
          return (
            <li key={group.group_id} className="py-4">
              <PackageSummary
                variant="account"
                balance={balance}
                names={group.display_names}
                typeLabel={typeLabel}
                lastPaid={
                  <LastPaid
                    variant="inline"
                    paidOn={balance.last_paid_on}
                    method={balance.last_payment_method}
                    now={now}
                  />
                }
                note={note}
                howToPay={ready.settings.payment_instructions}
              />
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <Card
      as="section"
      framedFrom="md"
      padding="list"
      aria-labelledby={HEADING_ID}
      aria-busy={loading || undefined}
      className={cn('flex flex-col', className)}
    >
      <SectionLabel as="h2" id={HEADING_ID} tabIndex={-1} className="mt-3 mb-1">
        {w.packages}
      </SectionLabel>
      {body}
    </Card>
  )
}
