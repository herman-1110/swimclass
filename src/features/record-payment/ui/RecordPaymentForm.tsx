import { useRef } from 'react'

import { messageFor } from '@/shared/config/messages'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { RadioGroup } from '@/shared/ui/RadioGroup'
import { Select } from '@/shared/ui/Select'
import { Textarea } from '@/shared/ui/Textarea'

import {
  CUSTOM_LESSONS,
  notePlaceholder,
  PAYMENT_SAVED,
  PAYMENT_SAVED_STATUS,
  SAVE_PAYMENT,
} from '../model/copy'
import { packageOptionLabel, PAYMENT_METHODS, type PaymentMethodChoice } from '../model/paymentForm'
import { type PaymentFormInput, usePaymentForm } from './usePaymentForm'

type RecordPaymentFormProps = PaymentFormInput & {
  /** The account holder ("Farah"), for the note's example. */
  accountName: string
}

/**
 * The Record payment form (AdminStudents.dc.html:277-310; coach-students §5.2.8, §5.3 W1):
 * Package (the next package, or a custom number of lessons), Amount (prefilled from the
 * type's price; with no price, the price_not_set words up front), Paid by, Date paid
 * (today, at most today), Note, then "Save payment", which reads "Payment saved" until
 * anything changes. Cancel resets it, then calls onCancel. Key it by the group, so another
 * group starts afresh.
 */
export function RecordPaymentForm({ accountName, ...input }: RecordPaymentFormProps) {
  const { group, balance, today } = input
  const formRef = useRef<HTMLFormElement>(null)
  const form = usePaymentForm(input, formRef)
  const { draft, change, errorAt, pending } = form

  return (
    <form ref={formRef} noValidate onSubmit={form.submit} className="flex flex-col gap-4.5">
      <Select
        id="pay-package"
        label="Package"
        options={[
          { value: 'package', label: packageOptionLabel(group.type_label, balance) },
          { value: 'custom', label: CUSTOM_LESSONS },
        ]}
        value={draft.choice}
        onChange={(event) =>
          change({ choice: event.target.value === 'custom' ? 'custom' : 'package' })
        }
        error={draft.choice === 'package' ? errorAt('lessons') : undefined}
      />
      {draft.choice === 'custom' && (
        <Field
          id="pay-lessons"
          label="Number of lessons"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={draft.lessonsText}
          readOnly={pending}
          onChange={(event) => change({ lessonsText: event.target.value })}
          error={errorAt('lessons')}
        />
      )}
      <Field
        id="pay-amount"
        label="Amount"
        prefix="RM"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        value={form.amountText}
        readOnly={pending}
        onChange={(event) => change({ amountText: event.target.value, amountEdited: true })}
        help={
          form.noPrice && !errorAt('amount')
            ? messageFor({ code: 'price_not_set' }, { audience: 'coach' })
            : undefined
        }
        error={errorAt('amount')}
      />
      <RadioGroup
        legend="Paid by"
        name="pay-method"
        options={PAYMENT_METHODS}
        value={draft.method}
        onChange={(method) => change({ method: method as PaymentMethodChoice })}
        error={errorAt('method')}
      />
      <Field
        id="pay-date"
        label="Date paid"
        type="date"
        max={today}
        value={draft.paidOn}
        readOnly={pending}
        onChange={(event) => change({ paidOn: event.target.value })}
        error={errorAt('date')}
      />
      <Textarea
        id="pay-note"
        label="Note (optional)"
        placeholder={notePlaceholder(accountName)}
        value={draft.note}
        readOnly={pending}
        onChange={(event) => change({ note: event.target.value })}
        error={errorAt('note')}
      />
      {form.error?.field === 'form' && (
        <p role="alert" className="text-label leading-normal text-warn">
          {form.error.message}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          className="flex-1"
          pending={pending}
          aria-disabled={form.saved || undefined}
        >
          {form.saved ? PAYMENT_SAVED : SAVE_PAYMENT}
        </Button>
        <Button variant="quiet" tone="muted" onClick={form.cancel}>
          Cancel
        </Button>
      </div>
      {/* The button's new label isn't always read out: say it here too. */}
      <p role="status" className="sr-only">
        {form.saved ? PAYMENT_SAVED_STATUS : ''}
      </p>
    </form>
  )
}
