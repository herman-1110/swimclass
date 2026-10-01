import { type FormEvent, type RefObject, useEffect, useRef, useState } from 'react'

import type { GroupBalance } from '@/entities/balance'
import type { Group } from '@/entities/group'
import { packagePriceCents } from '@/entities/settings'
import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'
import type { DateKey } from '@/shared/lib/time'

import { useRecordPayment } from '../api/useRecordPayment'
import {
  amountPrefill,
  lessonsFrom,
  type PaymentDraft,
  paymentErrorField,
  type PaymentField,
  paymentInput,
  type PriceSettings,
} from '../model/paymentForm'

export type PaymentFormInput = {
  group: Pick<Group, 'group_id' | 'size' | 'type_label'>
  balance: Pick<GroupBalance, 'package_size' | 'paid_lessons'>
  settings: PriceSettings
  today: DateKey
  onCancel?: () => void
  onSaved?: () => void
}

type Draft = PaymentDraft & { choice: 'package' | 'custom'; amountEdited: boolean }
type ShownError = { field: PaymentField; message: string }

function initialDraft(packageSize: number, today: DateKey): Draft {
  return {
    choice: 'package',
    lessonsText: String(packageSize),
    amountText: '',
    amountEdited: false,
    method: 'cash',
    paidOn: today,
    note: '',
  }
}

// Where focus goes for a message about each field (the form's own ids, as drawn).
const FIELD_TARGETS: Record<Exclude<PaymentField, 'form' | 'lessons'>, string> = {
  amount: '#pay-amount',
  method: 'input[name="pay-method"]:checked',
  date: '#pay-date',
  note: '#pay-note',
}

/**
 * The Record payment form's state (coach-students §5.2.8, §5.3 W1, §6): what is typed, the
 * amount's prefill, the message and the field it belongs to, "Payment saved", and Save and
 * Cancel. Messages move focus to their field once it shows them.
 */
export function usePaymentForm(
  { group, balance, settings, today, onCancel, onSaved }: PaymentFormInput,
  /** The <form>, where a message's field is looked up to take focus. */
  form: RefObject<HTMLFormElement | null>,
) {
  const [draft, setDraft] = useState(() => initialDraft(balance.package_size, today))
  const [error, setError] = useState<ShownError | null>(null)
  const [saved, setSaved] = useState(false)
  const record = useRecordPayment()
  const pendingFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    pendingFocus.current?.focus()
    pendingFocus.current = null
  }, [error])

  const lessonsText = draft.choice === 'package' ? String(balance.package_size) : draft.lessonsText
  const prefill = amountPrefill(settings, group.size, lessonsFrom(lessonsText))
  const amountText = draft.amountEdited ? draft.amountText : prefill
  const pending = record.isPending

  const fail = (code: string, message: string) => {
    const field = paymentErrorField(code)
    const target =
      field === 'form'
        ? null
        : field === 'lessons'
          ? draft.choice === 'custom'
            ? '#pay-lessons'
            : '#pay-package'
          : FIELD_TARGETS[field]
    pendingFocus.current = target
      ? (form.current?.querySelector<HTMLElement>(target) ?? null)
      : null
    setError({ field, message })
  }

  return {
    draft,
    amountText,
    noPrice: packagePriceCents(settings, group.size) === null,
    error,
    errorAt: (field: PaymentField) => (error?.field === field ? error.message : undefined),
    saved,
    pending,
    /** Anything typed: "Payment saved" and any message go. Nothing changes while saving. */
    change: (patch: Partial<Draft>) => {
      if (pending) return
      setDraft((current) => ({ ...current, ...patch }))
      setSaved(false)
      setError(null)
    },
    submit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (pending || saved) return
      const result = paymentInput(group.group_id, { ...draft, lessonsText, amountText })
      if ('check' in result) {
        fail(result.check.code, messageFor(result.check, { audience: 'coach' }))
        return
      }
      setError(null)
      record.mutate(result.input, {
        onSuccess: () => {
          setDraft(initialDraft(balance.package_size, today))
          setSaved(true)
          onSaved?.()
        },
        onError: (failure) =>
          fail(toAppError(failure).code, messageFor(failure, { audience: 'coach' })),
      })
    },
    cancel: () => {
      record.reset()
      setDraft(initialDraft(balance.package_size, today))
      setError(null)
      setSaved(false)
      onCancel?.()
    },
  }
}
