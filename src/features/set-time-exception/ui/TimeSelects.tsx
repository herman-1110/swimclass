import type { SelectOption } from '@/shared/ui/Select'
import { Select } from '@/shared/ui/Select'

import { endChoices, minuteOf, startChoices, timeLabel, timeValue } from '../model/times'

type TimeSelectsProps = {
  /** settings.start_step_minutes; null while the settings load (only "Choose" then). */
  step: number | null
  /** Minutes of the day, or null for "Choose". */
  from: number | null
  to: number | null
  disabled?: boolean
  /** Under "To": the end isn't after the start (invalid_range's words). */
  error?: string
  onChange: (times: { from: number | null; to: number | null }) => void
}

const CHOOSE: SelectOption = { value: '', label: 'Choose', disabled: true }

function options(minutes: readonly number[], current: number | null): SelectOption[] {
  // The chosen time stays listed even when it isn't a choice any more (an end before a new
  // start), so the select shows it beside its error instead of going blank.
  const list = current === null || minutes.includes(current) ? minutes : [...minutes, current]
  return [
    CHOOSE,
    ...list
      .toSorted((a, b) => a - b)
      .map((minute) => ({ value: timeValue(minute), label: timeLabel(minute) })),
  ]
}

/**
 * From and To (prompt 08 TASK 5; the Schedule spec §7.4): native selects of every start step
 * counted from midnight, "12:00 am" … "11:30 pm", and To one step after From up to "12:00 am
 * (midnight)".
 */
export function TimeSelects({ step, from, to, disabled, error, onChange }: TimeSelectsProps) {
  const starts = step ? startChoices(step) : []
  const ends = step ? endChoices(step, from) : []
  return (
    <div className="grid grid-cols-2 items-start gap-3">
      <Select
        label="From"
        className="min-w-0"
        options={options(starts, from)}
        value={from === null ? '' : timeValue(from)}
        disabled={disabled}
        onChange={(event) => onChange({ from: minuteOf(event.target.value), to })}
      />
      <Select
        label="To"
        className="min-w-0"
        options={options(ends, to)}
        value={to === null ? '' : timeValue(to)}
        disabled={disabled}
        error={error}
        onChange={(event) => onChange({ from, to: minuteOf(event.target.value) })}
      />
    </div>
  )
}
