import { formatRinggit, plural } from '@/shared/lib/format'
import type { Instant } from '@/shared/lib/time'

import { formatPaidOn, formatPaidOnFull } from '../model/dates'
import { methodLabel } from '../model/method'
import type { Payment } from '../model/types'

type PaymentRowProps = {
  payment: Payment
  /** li (default) inside the page's <ul role="list">, or div. */
  as?: 'li' | 'div'
} & (
  | {
      /**
       * account (default): a receipt in My classes' Payments, laid out like the lesson rows:
       * "19 Sep 2026" / "Aiman & Sofia · 1-to-2 · 4 lessons" / "FPX", and "RM 400" (or "Free")
       * on the right.
       */
      variant?: 'account'
      /** The group's names: "Aiman & Sofia". */
      names: string
      /** The group's type: "1-to-2". */
      typeLabel: string
    }
  | {
      /**
       * history: a payment in the coach's History (coach-students spec §3.9, proposed):
       * "RM 240 · 4 lessons" / "22 Aug · Cash" / the coach's note.
       */
      variant: 'history'
      /** useNow(): a date in another year shows the year. */
      now?: Instant
    }
)

/** One payment (my-classes spec §2.7; coach-students spec §3.9): what, when and how. */
export function PaymentRow(props: PaymentRowProps) {
  const { payment, as: Element = 'li' } = props
  const free = payment.method === 'free'
  const amount = free ? 'Free' : formatRinggit(payment.amount_cents)
  const lessons = plural(payment.lessons, 'lesson')

  if (props.variant === 'history') {
    return (
      <Element className="flex flex-col gap-0.5 border-b border-line py-3 break-words">
        <span className="text-sm leading-[normal] font-semibold">{`${amount} · ${lessons}`}</span>
        <span className="text-label">
          {`${formatPaidOn(payment.paid_on, props.now)} · ${methodLabel(payment.method)}`}
        </span>
        {payment.note && <span className="text-label text-muted">{payment.note}</span>}
      </Element>
    )
  }

  return (
    <Element className="flex items-center justify-between gap-3 border-b border-line py-4">
      <span className="flex min-w-0 flex-col gap-0.5 break-words">
        <span className="text-body font-semibold">{formatPaidOnFull(payment.paid_on)}</span>
        <span className="text-label text-ink">
          {`${props.names} · ${props.typeLabel} · ${lessons}`}
        </span>
        <span className="text-label text-muted">{methodLabel(payment.method)}</span>
      </span>
      <span className="text-body font-semibold whitespace-nowrap">{amount}</span>
    </Element>
  )
}
