import { Checkbox } from '@/shared/ui/Checkbox'
import { FieldRow } from '@/shared/ui/FieldRow'

import { FIELD_IDS } from '../model/fields'
import { settingNote } from '../model/notes'
import type { SwitchField } from '../model/types'
import type { ReadySettingsForm } from './formContext'
import { rowDescription } from './rowDescription'

type SwitchRowProps = {
  form: ReadySettingsForm
  field: SwitchField
  label: string
  help: string
}

/**
 * An on/off setting (design/AdminSettings.dc.html `.check`): the box alone at the right,
 * named by the row's label. Its 44 × 44 label makes all of it a target (coach-settings C12).
 */
export function SwitchRow({ form, field, label, help }: SwitchRowProps) {
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
        <Checkbox
          id={id}
          look="standalone"
          checked={form.draft[field]}
          onChange={(event) => form.setField(field, event.target.checked)}
          aria-readonly={form.saving || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={rowDescription(id, { note, error })}
        />
      }
    />
  )
}
