import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'
import { Banner } from '@/shared/ui/Banner'
import { Pill } from '@/shared/ui/Pill'
import { SegmentBar } from '@/shared/ui/SegmentBar'
import { Tag } from '@/shared/ui/Tag'

import { packageCaption, packageCounts, packageTitle } from '../model/packages'
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
       * 2 left to book".
       */
      variant?: 'book'
    }
  | {
      /**
       * account: a block of My classes' Packages list. The names and type tag, the Unpaid pill
       * or `lastPaid` beside them, the bar, "Package 4 · 0 used · 2 booked · 2 left to book".
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
 * from screen readers: the counts beside it say the same (DESIGN §3). The page frames it
 * (Book's card from 768 px, My classes' list item).
 */
export function PackageSummary(props: PackageSummaryProps) {
  const { balance, typeLabel, note } = props
  const account = props.variant === 'account'
  const instructions = account ? props.howToPay?.trim() : undefined

  return (
    <div className="flex flex-col gap-2">
      {props.variant === 'account' ? (
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 text-body font-semibold break-words">{props.names}</span>
            <Tag>{typeLabel}</Tag>
          </span>
          {balance.unpaid ? <Pill tone="warn">Unpaid</Pill> : props.lastPaid}
        </div>
      ) : (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-body font-semibold">{packageTitle(typeLabel, balance)}</span>
          <span className={cn('text-label', balance.unpaid ? 'text-warn' : 'text-muted')}>
            {balance.unpaid ? 'Unpaid' : 'Paid'}
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
