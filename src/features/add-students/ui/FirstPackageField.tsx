import { Checkbox } from '@/shared/ui/Checkbox'
import { Field } from '@/shared/ui/Field'
import { RadioGroup } from '@/shared/ui/RadioGroup'

import { FIELD_IDS } from '../model/fields'
import { PAID_BY, type PaidBy } from '../model/types'

type FirstPackageFieldProps = {
  paid: boolean
  onPaidChange: (paid: boolean) => void
  /** "1-to-3 package · 4 lessons · RM 540" (packageLine). */
  packageLine: string
  /** The Amount field's text: the type's price until the coach types their own. */
  amount: string
  onAmountChange: (value: string) => void
  method: PaidBy
  onMethodChange: (method: PaidBy) => void
  errors: { amount?: string; method?: string }
}

/**
 * "First package already paid" with the package it records (AdminAddStudents.dc.html:96-102).
 * Ticked, it asks for the amount and how they paid, as the Record payment panel does
 * (AdminStudents.dc.html:284-298; the spec C5): 16 px under the package line.
 */
export function FirstPackageField({
  paid,
  onPaidChange,
  packageLine,
  amount,
  onAmountChange,
  method,
  onMethodChange,
  errors,
}: FirstPackageFieldProps) {
  return (
    <div className="flex flex-col">
      <Checkbox
        id={FIELD_IDS.paid}
        label="First package already paid"
        help={packageLine}
        checked={paid}
        onChange={(event) => onPaidChange(event.target.checked)}
      />
      {paid && (
        <div className="mt-4 flex flex-col gap-4">
          <Field
            id={FIELD_IDS.amount}
            label="Amount"
            prefix="RM"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            error={errors.amount}
          />
          <RadioGroup
            legend="Paid by"
            name={FIELD_IDS.method}
            options={PAID_BY}
            value={method}
            onChange={(value) => {
              const choice = PAID_BY.find((option) => option.value === value)
              if (choice) onMethodChange(choice.value)
            }}
            error={errors.method}
          />
        </div>
      )}
    </div>
  )
}
