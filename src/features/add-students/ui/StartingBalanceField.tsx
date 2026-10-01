import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { Fieldset } from '@/shared/ui/Fieldset'

import { lessonDigits } from '../model/amount'
import { FIELD_IDS } from '../model/fields'

type StartingBalanceFieldProps = {
  open: boolean
  onToggle: () => void
  used: string
  paid: string
  onUsedChange: (value: string) => void
  onPaidChange: (value: string) => void
  /** invalid_opening's words, on "Lessons already used". */
  error?: string
}

/**
 * "Set a starting balance" (AdminAddStudents.dc.html:103-106): lessons used and paid before
 * the app (BR-25), behind a disclosure because most groups start at 0 (prompt 09: "advanced,
 * collapsed"). The two fields aren't drawn (the spec C7): side by side, 12 px under the help.
 * Closing it sets both back to 0, so nothing hidden is sent.
 */
export function StartingBalanceField({
  open,
  onToggle,
  used,
  paid,
  onUsedChange,
  onPaidChange,
  error,
}: StartingBalanceFieldProps) {
  return (
    <div className="flex flex-col items-start">
      <Button
        variant="link"
        flush
        aria-expanded={open}
        aria-controls={FIELD_IDS.opening}
        onClick={onToggle}
      >
        Set a starting balance
      </Button>
      <p className="text-small leading-[1.45] text-muted">
        For students who have already used some lessons of a paid package.
      </p>
      {/* In the page while closed (hidden), so the button always controls something. */}
      <Fieldset
        id={FIELD_IDS.opening}
        legend="Starting balance"
        hideLegend
        hidden={!open}
        className="mt-3 w-full"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field
            id={FIELD_IDS.openingUsed}
            label="Lessons already used"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={used}
            onChange={(event) => onUsedChange(lessonDigits(event.target.value))}
            error={error}
          />
          <Field
            id={FIELD_IDS.openingPaid}
            label="Lessons already paid"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={paid}
            onChange={(event) => onPaidChange(lessonDigits(event.target.value))}
          />
        </div>
      </Fieldset>
    </div>
  )
}
