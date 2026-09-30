import type { Instant } from '@/shared/lib/time'

import { formatPaidOn } from '../model/dates'
import type { LastPaidInput } from '../model/lastPaid'
import { methodLabel } from '../model/method'

type LastPaidProps = LastPaidInput & {
  /**
   * cell: the Students table's Last paid column, "22 Aug" over "Cash"; with no payment row
   * "Starting balance" (lessons paid before the app) or "None yet".
   * inline: My classes' package header, "Paid 19 Sep · FPX"; nothing without a payment row.
   */
  variant: 'cell' | 'inline'
  /** useNow(): a date in another year shows the year ("12 Dec 2025"). */
  now?: Instant
}

/**
 * When a group last paid, and how (AdminStudents.dc.html:122; MyClasses.dc.html:100). Pass
 * group_balance's last_paid_on and last_payment_method.
 */
export function LastPaid({ paidOn, method, openingPaid = 0, variant, now }: LastPaidProps) {
  const date = paidOn === null ? null : formatPaidOn(paidOn, now)
  const how = method === null ? null : methodLabel(method)

  if (variant === 'inline') {
    if (date === null) return null
    return (
      <span className="text-label whitespace-nowrap text-muted">
        {how ? `Paid ${date} · ${how}` : `Paid ${date}`}
      </span>
    )
  }

  if (date === null) {
    return (
      <span className="text-label text-muted">
        {openingPaid > 0 ? 'Starting balance' : 'None yet'}
      </span>
    )
  }
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-label">{date}</span>
      {how && <span className="text-small text-muted">{how}</span>}
    </span>
  )
}
