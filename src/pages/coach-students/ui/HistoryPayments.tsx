import type { Group } from '@/entities/group'
import { PAYMENT_LIMIT, PaymentRow, useGroupPayments } from '@/entities/payment'
import { plural } from '@/shared/lib/format'
import type { Instant } from '@/shared/lib/time'

import { historyRow, HistorySection } from './HistorySection'

type HistoryPaymentsProps = {
  group: Pick<Group, 'group_id' | 'opening_paid_lessons'>
  now: Instant
}

/**
 * History's payments, newest first (coach-students §3.9, §8): "RM 240 · 4 lessons" over
 * "22 Aug · Cash" and the note, then the lessons paid before the app, "Starting balance ·
 * 16 lessons paid".
 */
export function HistoryPayments({ group, now }: HistoryPaymentsProps) {
  const read = useGroupPayments(group.group_id)
  const payments = read.data?.payments ?? []
  const opening = group.opening_paid_lessons
  return (
    <HistorySection title="Payments" read={read}>
      {payments.length === 0 && <p className="py-3 text-label text-muted">No payments yet.</p>}
      {(payments.length > 0 || opening > 0) && (
        <ul role="list">
          {payments.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} variant="history" now={now} />
          ))}
          {opening > 0 && (
            <li className={historyRow}>
              <span className="text-sm leading-[normal] font-semibold">
                {`Starting balance · ${plural(opening, 'lesson')} paid`}
              </span>
            </li>
          )}
        </ul>
      )}
      {read.data?.hasMore && (
        <p className="pt-3 text-label text-muted">{`Showing the latest ${PAYMENT_LIMIT} payments.`}</p>
      )}
    </HistorySection>
  )
}
