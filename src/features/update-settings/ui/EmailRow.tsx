import { Field } from '@/shared/ui/Field'
import { FieldRow } from '@/shared/ui/FieldRow'

import { rowDescriptionId } from '../model/description'
import { FIELD_IDS } from '../model/fields'
import { settingNote } from '../model/notes'
import type { ReadySettingsForm } from './formContext'
import { RowDescription } from './RowDescription'

const HELP = 'Where your schedule and alerts go'

type EmailRowProps = {
  form: ReadySettingsForm
}

/**
 * Your email (design/AdminSettings.dc.html:224-227): a full line on phones, a 240 px box
 * from 768 px. Empty is allowed (no schedule and alerts are sent then, which the note says);
 * the database checks the address.
 */
export function EmailRow({ form }: EmailRowProps) {
  const id = FIELD_IDS.coach_email
  const note = settingNote('coach_email', form.draft, form.check.changed)
  const error = form.fieldErrors.coach_email
  return (
    <FieldRow
      label="Your email"
      help={HELP}
      htmlFor={id}
      controlLayout="email"
      note={note}
      error={error}
      control={
        <>
          <Field
            id={id}
            type="email"
            size="row"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.draft.coach_email}
            onChange={(event) => form.setField('coach_email', event.target.value)}
            readOnly={form.saving}
            aria-invalid={error ? true : undefined}
            aria-describedby={rowDescriptionId(id)}
          />
          <RowDescription id={id} parts={[HELP, note, error]} />
        </>
      }
    />
  )
}
