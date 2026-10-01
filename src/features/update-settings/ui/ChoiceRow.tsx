import { FieldRow } from '@/shared/ui/FieldRow'
import { Select, type SelectOption } from '@/shared/ui/Select'

import { FIELD_IDS } from '../model/fields'
import { settingNote } from '../model/notes'
import type { ChoiceField } from '../model/types'
import type { ReadySettingsForm } from './formContext'
import { rowDescription } from './rowDescription'

type ChoiceRowProps = {
  form: ReadySettingsForm
  field: ChoiceField
  label: string
  help: string
  options: readonly SelectOption[]
}

/** A setting chosen from a list: a select as wide as its longest option. */
export function ChoiceRow({ form, field, label, help, options }: ChoiceRowProps) {
  const id = FIELD_IDS[field]
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
        <Select
          id={id}
          size="row"
          options={options}
          value={form.draft[field]}
          onChange={(event) => form.setField(field, event.target.value)}
          aria-readonly={form.saving || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={rowDescription(id, { note, error })}
        />
      }
    />
  )
}
