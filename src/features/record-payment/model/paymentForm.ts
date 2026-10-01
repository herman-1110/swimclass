import { type GroupBalance, nextPaymentPackageNo } from '@/entities/balance'
import { lessonsPriceCents, type PublicSettings } from '@/entities/settings'
import { formatRinggit, parseRinggit, plural } from '@/shared/lib/format'
import type { DateKey } from '@/shared/lib/time'

// What the Record payment form shows and sends (coach-students §5.2.8, §5.3 W1). The
// database prices and checks every payment; these only prefill the form and place its
// messages.

/** The methods the coach picks from (DESIGN §6's invalid_method names these three). */
export type PaymentMethodChoice = 'cash' | 'transfer' | 'fpx'

/** Paid by: Cash (the drawn default), Transfer, FPX. */
export const PAYMENT_METHODS: readonly { value: PaymentMethodChoice; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'fpx', label: 'FPX' },
]

/** The prices and package size the amount's prefill needs (get_public_settings). */
export type PriceSettings = Pick<
  PublicSettings,
  'price_1to1_cents' | 'price_1to2_cents' | 'price_1to3_cents' | 'lessons_per_package'
>

/**
 * The Package select's first option: the package this payment starts to pay for, "1-to-1 ·
 * Package 6 · 4 lessons" (floor(paid ÷ size) + 1, display only).
 */
export function packageOptionLabel(
  typeLabel: string,
  balance: Pick<GroupBalance, 'package_size' | 'paid_lessons'>,
): string {
  return `${typeLabel} · Package ${nextPaymentPackageNo(balance)} · ${plural(balance.package_size, 'lesson')}`
}

/**
 * The lessons typed in "Number of lessons": a whole number, or null for anything else
 * (empty, "2.5"). Zero is a number: the database answers it with invalid_lessons.
 */
export function lessonsFrom(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const lessons = Number(trimmed)
  return Number.isSafeInteger(lessons) ? lessons : null
}

/**
 * The Amount field's prefill: the type's price for that many lessons, as record_payment
 * itself prices a payment with no amount ("240", "180.50"). Empty when no price is set (the
 * seed sets none) or the lessons aren't a number yet.
 */
export function amountPrefill(
  settings: PriceSettings,
  size: number,
  lessons: number | null,
): string {
  if (lessons === null || lessons < 1) return ''
  const cents = lessonsPriceCents(settings, size, lessons)
  return cents === null ? '' : formatRinggit(cents, { symbol: false })
}

/** What record_payment is asked to save. */
export type RecordPaymentInput = {
  groupId: string
  lessons: number
  /** Cents, or null: the database uses the type's price (or answers price_not_set). */
  amountCents: number | null
  method: PaymentMethodChoice
  /** "2026-09-26"; left out, the database dates it today (MYT). */
  paidOn?: DateKey
  /** The coach's note; blank is no note. */
  note?: string
}

/** The form as typed. */
export type PaymentDraft = {
  lessonsText: string
  amountText: string
  method: PaymentMethodChoice
  paidOn: string
  note: string
}

/** A check before any call, in messages.ts' `{ code }` form. */
export type FormCheck = { code: 'invalid_lessons' | 'amount_format' }

/**
 * The payment to send, or why the form can't send it yet: lessons that aren't a whole
 * number (invalid_lessons' words), or an amount that can't be read as ringgit
 * (amount_format). A negative amount and zero lessons go to the database, which answers
 * with its own codes.
 */
export function paymentInput(
  groupId: string,
  draft: PaymentDraft,
): { input: RecordPaymentInput } | { check: FormCheck } {
  const lessons = lessonsFrom(draft.lessonsText)
  if (lessons === null) return { check: { code: 'invalid_lessons' } }
  const amountCents = parseRinggit(draft.amountText)
  if (amountCents === 'invalid') return { check: { code: 'amount_format' } }
  const note = draft.note.trim()
  return {
    input: {
      groupId,
      lessons,
      amountCents,
      method: draft.method,
      paidOn: draft.paidOn === '' ? undefined : draft.paidOn,
      note: note === '' ? undefined : note,
    },
  }
}

/** The part of the form a message belongs to; `form` is above the buttons. */
export type PaymentField = 'lessons' | 'amount' | 'method' | 'date' | 'note' | 'form'

const FIELDS: Partial<Record<string, PaymentField>> = {
  invalid_lessons: 'lessons',
  amount_format: 'amount',
  price_not_set: 'amount',
  invalid_amount: 'amount',
  invalid_method: 'method',
  invalid_date: 'date',
  invalid_note: 'note',
}

/**
 * Where a refusal shows (coach-students §5.3 W1): under the field it is about, or above the
 * buttons for everything else (not_coach, not_found, network …).
 */
export function paymentErrorField(code: string): PaymentField {
  return FIELDS[code] ?? 'form'
}
