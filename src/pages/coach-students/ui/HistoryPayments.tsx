import { useEffect, useRef, useState } from 'react'

import type { Group } from '@/entities/group'
import { type Payment, PAYMENT_LIMIT, PaymentRow, useGroupPayments } from '@/entities/payment'
import { RemovePaymentButton, RemovePaymentConfirm } from '@/features/record-payment'
import { plural } from '@/shared/lib/format'
import type { Instant } from '@/shared/lib/time'

import { historyRow, HistorySection } from './HistorySection'

type HistoryPaymentsProps = {
  group: Pick<Group, 'group_id' | 'opening_paid_lessons' | 'display_names'>
  now: Instant
}

/**
 * History's payments, newest first (coach-students §3.9, §8): "RM 240 · 4 lessons" over
 * "22 Aug · Cash" and the note, each with Remove for one saved by mistake (Herman, 9 Oct
 * 2026), then the lessons paid before the app, "Starting balance · 16 lessons paid" (Edit
 * group changes those). Once a payment is removed its row goes, so focus goes to the notice
 * ("Payment removed.").
 */
export function HistoryPayments({ group, now }: HistoryPaymentsProps) {
  const read = useGroupPayments(group.group_id)
  const payments = read.data?.payments ?? []
  const opening = group.opening_paid_lessons
  const [removing, setRemoving] = useState<Payment | null>(null)
  const [notice, setNotice] = useState<{ text: string; key: number } | null>(null)
  const noticeRef = useRef<HTMLParagraphElement>(null)

  // After the confirmation has closed and handed focus back to Remove. A new key each time,
  // so the same words twice move focus twice.
  useEffect(() => {
    if (notice) noticeRef.current?.focus()
  }, [notice])

  return (
    <HistorySection title="Payments" read={read}>
      {payments.length === 0 && <p className="py-3 text-label text-muted">No payments yet.</p>}
      {(payments.length > 0 || opening > 0) && (
        <ul role="list">
          {payments.map((payment) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              variant="history"
              now={now}
              action={
                <RemovePaymentButton
                  payment={payment}
                  now={now}
                  onClick={() => setRemoving(payment)}
                />
              }
            />
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
      {/* Always there (empty, it takes no room), so each notice is read out. */}
      <p ref={noticeRef} role="status" tabIndex={-1} className="text-label leading-normal">
        {notice?.text}
      </p>
      {removing && (
        <RemovePaymentConfirm
          payment={removing}
          names={group.display_names}
          now={now}
          onClose={() => setRemoving(null)}
          onRemoved={(text) => {
            setRemoving(null)
            setNotice((last) => ({ text, key: (last?.key ?? 0) + 1 }))
          }}
        />
      )}
    </HistorySection>
  )
}
