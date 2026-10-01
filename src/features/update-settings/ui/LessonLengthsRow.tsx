import { formatMinutes } from '@/shared/lib/format'
import { Checkbox } from '@/shared/ui/Checkbox'
import { FieldRow } from '@/shared/ui/FieldRow'

import { settingNote } from '../model/notes'
import type { ReadySettingsForm } from './formContext'

// The lengths the database allows (settings' check: a non-empty subset of {60, 120}).
const LENGTHS = [60, 120] as const

type LessonLengthsRowProps = {
  form: ReadySettingsForm
}

/**
 * Lesson lengths (design/AdminSettings.dc.html:140-146): "1 hour" and "2 hours", a group
 * named by the row's label. Ticking neither is the database's to refuse (invalid_setting).
 */
export function LessonLengthsRow({ form }: LessonLengthsRowProps) {
  const ticked = form.draft.lesson_lengths
  const note = settingNote('lesson_lengths', form.draft, form.check.changed)
  const error = form.fieldErrors.lesson_lengths
  return (
    <FieldRow
      label="Lesson lengths"
      help="What customers can choose"
      group
      controlLayout="options"
      note={note}
      error={error}
      control={LENGTHS.map((minutes) => (
        <Checkbox
          key={minutes}
          id={`set-length-${minutes}`}
          look="inline"
          label={formatMinutes(minutes)}
          checked={ticked.includes(minutes)}
          onChange={(event) =>
            form.setField(
              'lesson_lengths',
              event.target.checked
                ? [...ticked, minutes]
                : ticked.filter((length) => length !== minutes),
            )
          }
          aria-readonly={form.saving || undefined}
          aria-invalid={error ? true : undefined}
        />
      ))}
    />
  )
}
