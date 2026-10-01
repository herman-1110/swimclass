import type { Ref } from 'react'

import type { ExceptionKind } from '@/entities/schedule'
import { messageFor } from '@/shared/config/messages'
import { Field } from '@/shared/ui/Field'

import { UNTIL_HELP } from '../model/copy'
import { isDateKey } from '../model/times'

type DayFieldsProps = {
  kind: ExceptionKind
  date: string
  until: string
  /** "Until" is before "Date": its message shows under it. */
  untilBefore: boolean
  readOnly?: boolean
  /** The date field: the dialog starts there (the Schedule spec §7.3). */
  dateRef?: Ref<HTMLInputElement>
  onChange: (patch: { date?: string; until?: string }) => void
}

/**
 * "Date", and for Block time "Until (optional)" beside it (the Schedule spec §7.4), for
 * several days in a row with the same hours.
 */
export function DayFields({
  kind,
  date,
  until,
  untilBefore,
  readOnly,
  dateRef,
  onChange,
}: DayFieldsProps) {
  return (
    <div className={kind === 'closed' ? 'grid grid-cols-2 items-start gap-3' : 'flex'}>
      <Field
        ref={dateRef}
        type="date"
        label="Date"
        className="min-w-0 flex-1"
        value={date}
        readOnly={readOnly}
        onChange={(event) => onChange({ date: event.target.value })}
      />
      {kind === 'closed' && (
        <Field
          type="date"
          label="Until (optional)"
          className="min-w-0"
          help={UNTIL_HELP}
          min={isDateKey(date) ? date : undefined}
          value={until}
          readOnly={readOnly}
          error={
            untilBefore
              ? messageFor({ code: 'last_day_before_first' }, { audience: 'coach' })
              : undefined
          }
          onChange={(event) => onChange({ until: event.target.value })}
        />
      )}
    </div>
  )
}
