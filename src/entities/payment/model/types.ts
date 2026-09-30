import type { Row } from '@/shared/api/rpc'

type PaymentRow = Row<'payments'>

/** How a payment was made: cash, transfer, fpx, free (a free lesson) or other. */
export type PaymentMethod = PaymentRow['method']

/**
 * A payment as the screens read it (the payments table, TECH_SPEC §3): lessons paid for, the
 * amount in cents, the method, the MYT date it was paid ("2026-09-19"), the coach's note.
 */
export type Payment = Pick<
  PaymentRow,
  'id' | 'group_id' | 'lessons' | 'amount_cents' | 'method' | 'paid_on' | 'note' | 'created_at'
>
