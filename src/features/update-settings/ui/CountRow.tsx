import { Field } from '@/shared/ui/Field'
import { FieldRow } from '@/shared/ui/FieldRow'

import { parseCount } from '../model/draft'
import { FIELD_IDS } from '../model/fields'
import { settingNote } from '../model/notes'
import type { CountField } from '../model/types'
import type { ReadySettingsForm } from './formContext'
import { rowDescription } from './rowDescription'

type CountRowProps = {
  form: ReadySettingsForm
  field: CountField
  label: string
  help: string
  /** The unit after the number, for 1 and for any other number: ["hour", "hours"]. */
  unit: readonly [one: string, other: string]
}

/**
 * A whole-number setting (design/AdminSettings.dc.html `.num`): a 64 px right-aligned box
 * and its unit, which follows the number typed ("1 hour", "6 hours"; coach-settings §4.3).
 */
export function CountRow({ form, field, label, help, unit }: CountRowProps) {
  const id = FIELD_IDS[field]
  const value = form.draft[field]
  const note = settingNote(field, form.draft, form.check.changed)
  const error = form.fieldErrors[field]
  return (
    <FieldRow
      label={label}
      help={help}
      htmlFor={id}
      note={note}
      error={error}
      control={
        <Field
          id={id}
          size="row"
          width="number"
          align="end"
          inputMode="numeric"
          autoComplete="off"
          unit={parseCount(value) === 1 ? unit[0] : unit[1]}
          value={value}
          onChange={(event) => form.setField(field, event.target.value)}
          readOnly={form.saving}
          aria-invalid={error ? true : undefined}
          aria-describedby={rowDescription(id, { note, error })}
        />
      }
    />
  )
}
