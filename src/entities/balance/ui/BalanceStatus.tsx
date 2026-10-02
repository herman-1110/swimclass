import { cn } from '@/shared/lib/cn'
import type { Instant } from '@/shared/lib/time'
import { Pill } from '@/shared/ui/Pill'

import { balanceBucket, balanceStatus } from '../model/status'
import type { GroupBalance } from '../model/types'

type BalanceStatusProps = {
  balance: GroupBalance
  /** useNow(): the notes compare the first unpaid lesson and the last paid one with today. */
  now: Instant
  /**
   * The phone cards' extra words (AdminStudents.dc.html:202-258): the last payment as payment's
   * lastPaidPhrase(…) gives it, "last paid 22 Aug, cash". It joins the note ("Starts today ·
   * last paid 22 Aug, cash") or stands alone ("Last paid 19 Sep, FPX"); a group on its last
   * lesson shows only that note, as drawn. Leave it out in the table.
   */
  lastPaid?: string
}

/**
 * Paid or Unpaid as a pill, with its note under it (DESIGN §3 Status pill; coach-students spec
 * §5.2.4): the Students table's Status cell and the phone cards. A group no payment covers that
 * isn't unpaid either (a new group that hasn't paid) gets the note alone, no pill.
 */
export function BalanceStatus({ balance, now, lastPaid }: BalanceStatusProps) {
  const status = balanceStatus(balance, now)
  const words = balanceBucket(balance) === 'last-lesson' ? [status.note] : [status.note, lastPaid]
  const joined = words.filter(Boolean).join(' · ')
  const note = joined ? joined.charAt(0).toUpperCase() + joined.slice(1) : undefined
  if (status.label === null) {
    if (!note) return null
    return (
      <span className={cn('text-small', status.noteTone === 'warn' ? 'text-warn' : 'text-muted')}>
        {note}
      </span>
    )
  }
  return (
    <Pill tone={balance.unpaid ? 'warn' : 'accent'} note={note} noteTone={status.noteTone}>
      {status.label}
    </Pill>
  )
}
