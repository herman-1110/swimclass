import { Field } from '@/shared/ui/Field'
import { FieldRow } from '@/shared/ui/FieldRow'

import { rowDescriptionId } from '../model/description'
import { parseCount } from '../model/draft'
import { FIELD_IDS } from '../model/fields'
import { settingNote } from '../model/notes'
import type { CountField } from '../model/types'
import type { ReadySettingsForm } from './formContext'
import { RowDescription } from './RowDescription'

type CountRowProps = {
  form: ReadySettingsForm
  field: CountField
  label: string
  help: string
  /** The unit after the number, for 1 and for any other number: ["hour", "hours"]. */
  unit: readonly [one: string, other: string]
  /**
   * The unit in words, said with the label when the label doesn't say it already:
   * "minutes" names the box "Travel gap (minutes)". The drawn unit is then for the eyes
   * only, as the "RM" before an amount is ("Amount (RM)").
   */
  spokenUnit?: string
}

/**
 * A whole-number setting (design/AdminSettings.dc.html `.num`): a 64 px right-aligned box
 * and its unit, which follows the number typed ("1 hour", "6 hours"; coach-settings §4.3).
 * The unit is in the box's name, not read after its description ("… min").
 */
export function CountRow({ form, field, label, help, unit, spokenUnit }: CountRowProps) {
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
        <>
          <Field
            id={id}
            size="row"
            width="number"
            align="end"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            onChange={(event) => form.setField(field, event.target.value)}
            readOnly={form.saving}
            aria-label={spokenUnit ? `${label} (${spokenUnit})` : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={rowDescriptionId(id)}
          />
          {/* Field's unit, 8 px after the box and 52 px wide as drawn: the row's control is
              the same 8 px flex row. */}
          <span aria-hidden="true" className="min-w-13 text-label text-muted">
            {parseCount(value) === 1 ? unit[0] : unit[1]}
          </span>
          <RowDescription id={id} parts={[help, note, error]} />
        </>
      }
    />
  )
}
