import { FieldRow } from '@/shared/ui/FieldRow'
import { Textarea } from '@/shared/ui/Textarea'

import { rowDescriptionId } from '../model/description'
import { FIELD_IDS } from '../model/fields'
import type { ReadySettingsForm } from './formContext'
import { RowDescription } from './RowDescription'

const HELP = 'Shown to customers under their packages'

type InstructionsRowProps = {
  form: ReadySettingsForm
}

/**
 * Payment instructions (design/AdminSettings.dc.html:193-196): two lines under the label at
 * every width, resizable. Customers see them under their packages; an empty box is none.
 * The database trims the text and keeps up to 2000 characters (it refuses more).
 */
export function InstructionsRow({ form }: InstructionsRowProps) {
  const id = FIELD_IDS.payment_instructions
  const error = form.fieldErrors.payment_instructions
  return (
    <FieldRow
      label="Payment instructions"
      help={HELP}
      htmlFor={id}
      layout="stack"
      controlLayout="full"
      error={error}
      control={
        <>
          <Textarea
            id={id}
            look="row"
            maxLength={2000}
            placeholder="e.g. Bank transfer or DuitNow to your account, or cash to your coach."
            value={form.draft.payment_instructions}
            onChange={(event) => form.setField('payment_instructions', event.target.value)}
            readOnly={form.saving}
            aria-invalid={error ? true : undefined}
            aria-describedby={rowDescriptionId(id)}
          />
          <RowDescription id={id} parts={[HELP, error]} />
        </>
      }
    />
  )
}
