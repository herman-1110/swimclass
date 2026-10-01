import { Field } from '@/shared/ui/Field'

import type { BookingDraft } from '../model/draft'

type WhenFieldsProps = {
  draft: Pick<BookingDraft, 'date' | 'start'>
  readOnly?: boolean
  onChange: (patch: Partial<Pick<BookingDraft, 'date' | 'start'>>) => void
}

/**
 * "Date" and "Start" side by side (the Schedule spec §7.4): any date, past ones too (they
 * count as used) and beyond the booking window; any whole minute (the database answers
 * `off_step` or `outside_open_hours` unless "Outside open hours" is on).
 */
export function WhenFields({ draft, readOnly, onChange }: WhenFieldsProps) {
  return (
    <div className="grid grid-cols-2 items-start gap-3">
      <Field
        type="date"
        label="Date"
        className="min-w-0"
        value={draft.date}
        readOnly={readOnly}
        onChange={(event) => onChange({ date: event.target.value })}
      />
      <Field
        type="time"
        label="Start"
        className="min-w-0"
        step={60}
        value={draft.start}
        readOnly={readOnly}
        onChange={(event) => onChange({ start: event.target.value })}
      />
    </div>
  )
}
