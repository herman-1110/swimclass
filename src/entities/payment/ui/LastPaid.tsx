import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import { formatDayMonth, type Instant } from '@/shared/lib/time'

import type { LastPaidInput } from '../model/lastPaid'
import { methodLabel } from '../model/method'
import { paymentWords } from '../model/words'

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
  const language = useLanguage()
  const w = wordsIn(paymentWords, language)
  const date = paidOn === null ? null : formatDayMonth(paidOn, now, language)
  const how = method === null ? null : methodLabel(method, language)

  if (variant === 'inline') {
    if (date === null) return null
    return <span className="text-label whitespace-nowrap text-muted">{w.paid(date, how)}</span>
  }

  if (date === null) {
    return (
      <span className="text-label text-muted">
        {openingPaid > 0 ? w.startingBalance : w.noneYet}
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
