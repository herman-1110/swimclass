import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'
import { Banner } from '@/shared/ui/Banner'
import { Pill } from '@/shared/ui/Pill'
import { SegmentBar } from '@/shared/ui/SegmentBar'
import { Tag } from '@/shared/ui/Tag'

import {
  isPackagePaid,
  laterPackageCounts,
  laterPackages,
  owesPayment,
  packageCaption,
  packageCounts,
  packageTitle,
} from '../model/packages'
import { unpaidPillLabel } from '../model/status'
import type { GroupBalance } from '../model/types'

type PackageSummaryProps = {
  balance: GroupBalance
  /** The group's type: "1-to-2". */
  typeLabel: string
  /**
   * The orange line under the counts: bookPackageNote(…) on Book, accountPackageNote(…) on
   * My classes; null or left out for none (the coach's lesson details).
   */
  note?: string | null
} & (
  | {
      /**
       * book (default): Book's package card and the coach's lesson details. "1-to-2 ·
       * Package 4" with "Paid" or "Unpaid" (orange) beside it, the bar, "0 used · 2 booked ·
       * 2 left to book". "Paid" only while payments cover that package, otherwise "Unpaid"
       * (Herman, 2 Oct 2026), including a new group that hasn't paid. A later unpaid package
       * is the note's to say ("Package 3 isn’t paid yet …").
       */
      variant?: 'book'
    }
  | {
      /**
       * account: a block of My classes' Packages list. The names and type tag, the Unpaid pill
       * ("Package 2 unpaid") while the group owes a payment (owesPayment) or `lastPaid` beside
       * them, the bar,
       * "Package 4 · 0 used · 2 booked · 2 left to book".
       */
      variant: 'account'
      /** The group's names: "Aiman & Sofia". */
      names: string
      /**
       * Beside the names while the group is paid up: payment's
       * <LastPaid variant="inline" …/> ("Paid 19 Sep · FPX"). Left out: nothing there.
       */
      lastPaid?: ReactNode
      /**
       * The coach's payment_instructions (settings), shown under the note as "How to pay: …"
       * with its line breaks. Hidden without a note, or when empty.
       */
      howToPay?: string | null
    }
)

/**
 * A group's current package: title, bar, counts and what to pay next (DESIGN §3 package bar,
 * §4 Book 3 and My classes; Main.dc.html:85-99, MyClasses.dc.html:94-127). The bar is hidden
 * from screen readers: the counts beside it say the same (DESIGN §3). Each later package with
 * lessons booked in it follows as a bar and "Package 2 · 1 booked · 3 left to book" (Herman,
 * 7 Oct 2026). The page frames it (Book's card from 768 px, My classes' list item).
 */
export function PackageSummary(props: PackageSummaryProps) {
  const { balance, typeLabel, note } = props
  const account = props.variant === 'account'
  const instructions = account ? props.howToPay?.trim() : undefined
  // Book's word is about the package it names; My classes' pill is about the group.
  const status = isPackagePaid(balance) ? 'Paid' : 'Unpaid'

  return (
    <div className="flex flex-col gap-2">
      {props.variant === 'account' ? (
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 text-body font-semibold break-words">{props.names}</span>
            <Tag>{typeLabel}</Tag>
          </span>
          {owesPayment(balance) ? (
            <Pill tone="warn">{unpaidPillLabel(balance)}</Pill>
          ) : (
            props.lastPaid
          )}
        </div>
      ) : (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-body font-semibold">{packageTitle(typeLabel, balance)}</span>
          <span className={cn('text-label', status === 'Unpaid' ? 'text-warn' : 'text-muted')}>
            {status}
          </span>
        </div>
      )}
      <SegmentBar
        total={balance.package_size}
        used={balance.used_in_package}
        booked={balance.booked_in_package}
      />
      <span className="text-label text-muted">
        {account ? packageCaption(balance) : packageCounts(balance)}
      </span>
      {laterPackages(balance).map((later) => (
        <div key={later.package_no} className="mt-1 flex flex-col gap-2">
          <SegmentBar total={later.package_size} used={0} booked={later.booked} />
          <span className="text-label text-muted">
            Package {later.package_no} · {laterPackageCounts(later)}
          </span>
        </div>
      ))}
      {note && (
        <p className={cn('m-0 text-label leading-normal text-warn', account && 'mt-1')}>{note}</p>
      )}
      {note && instructions && (
        <Banner label="How to pay:" className="mt-1 whitespace-pre-line">
          {instructions}
        </Banner>
      )}
    </div>
  )
}
