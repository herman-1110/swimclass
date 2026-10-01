import { useId } from 'react'

import { Checkbox } from '@/shared/ui/Checkbox'
import { Field } from '@/shared/ui/Field'

import { OUTSIDE_HOURS_WARNING, REPEAT_HELP, skipGapWarning } from '../model/copy'
import { type BookingDraft, clampWeeks, MAX_REPEAT_WEEKS, MIN_REPEAT_WEEKS } from '../model/draft'

type BookingRulesProps = {
  draft: Pick<BookingDraft, 'repeat' | 'weeks' | 'ignoreOpenHours' | 'gapOverride'>
  /** settings.travel_gap_minutes, for "less than 1 hour"; null while the settings load. */
  gapMinutes: number | null
  readOnly?: boolean
  onChange: (
    patch: Partial<Pick<BookingDraft, 'repeat' | 'weeks' | 'ignoreOpenHours' | 'gapOverride'>>,
  ) => void
}

// The warnings sit under their checkbox's label: the 18 px box and its 10 px gap.
const warning = 'pl-7 text-label leading-normal text-warn'

/**
 * Add booking's options (the Schedule spec §7.4, §9 C14): "Repeat weekly" with "Number of
 * weeks" (2 to 52), then the coach's two overrides, each with its warning while on:
 * "Outside open hours" (no open hours or start steps) and "Skip travel gap".
 */
export function BookingRules({ draft, gapMinutes, readOnly, onChange }: BookingRulesProps) {
  const outsideId = useId()
  const gapId = useId()
  return (
    <div className="flex flex-col">
      <Checkbox
        label="Repeat weekly"
        checked={draft.repeat}
        disabled={readOnly}
        onChange={(event) => onChange({ repeat: event.target.checked })}
      />
      {draft.repeat && (
        <Field
          type="number"
          label="Number of weeks"
          className="mb-2 pl-7"
          width="number"
          unit="weeks"
          inputMode="numeric"
          min={MIN_REPEAT_WEEKS}
          max={MAX_REPEAT_WEEKS}
          help={REPEAT_HELP}
          value={draft.weeks}
          readOnly={readOnly}
          onChange={(event) => onChange({ weeks: event.target.value })}
          onBlur={(event) => {
            // Back inside 2 to 52 when left. Left as it was, nothing changes, so a refusal
            // and its "Book anyway" stay.
            const weeks = clampWeeks(event.target.value)
            if (weeks !== draft.weeks) onChange({ weeks })
          }}
        />
      )}
      <Checkbox
        label="Outside open hours"
        checked={draft.ignoreOpenHours}
        disabled={readOnly}
        aria-describedby={draft.ignoreOpenHours ? outsideId : undefined}
        onChange={(event) => onChange({ ignoreOpenHours: event.target.checked })}
      />
      {draft.ignoreOpenHours && (
        <p id={outsideId} className={warning}>
          {OUTSIDE_HOURS_WARNING}
        </p>
      )}
      <Checkbox
        label="Skip travel gap"
        checked={draft.gapOverride}
        disabled={readOnly}
        aria-describedby={draft.gapOverride && gapMinutes !== null ? gapId : undefined}
        onChange={(event) => onChange({ gapOverride: event.target.checked })}
      />
      {draft.gapOverride && gapMinutes !== null && (
        <p id={gapId} className={warning}>
          {skipGapWarning(gapMinutes)}
        </p>
      )}
    </div>
  )
}
