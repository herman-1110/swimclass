import { Field } from '@/shared/ui/Field'
import { FieldRow } from '@/shared/ui/FieldRow'

import { FIELD_IDS } from '../model/fields'
import type { TimeField } from '../model/types'
import type { ReadySettingsForm } from './formContext'
import { rowDescription } from './rowDescription'

type TimeRowProps = {
  form: ReadySettingsForm
  field: TimeField
  label: string
  help: string
}

/**
 * When an email goes out, typed as a time of day (design/AdminSettings.dc.html `.time`):
 * "8:00 pm", "8pm" or "20:00", in Malaysia time. A valid time is shown again as "8:00 pm"
 * when the box loses focus (coach-settings §5.3).
 */
export function TimeRow({ form, field, label, help }: TimeRowProps) {
  const id = FIELD_IDS[field]
  const error = form.fieldErrors[field]
  return (
    <FieldRow
      label={label}
      help={help}
      htmlFor={id}
      error={error}
      control={
        <Field
          id={id}
          size="row"
          width="time"
          align="end"
          inputMode="text"
          autoComplete="off"
          value={form.draft[field]}
          onChange={(event) => form.setField(field, event.target.value)}
          onBlur={() => form.tidyTime(field)}
          readOnly={form.saving}
          aria-invalid={error ? true : undefined}
          aria-describedby={rowDescription(id, { error })}
        />
      }
    />
  )
}
