import { Button } from '@/shared/ui/Button'
import { Fieldset } from '@/shared/ui/Fieldset'
import { Select, type SelectOption } from '@/shared/ui/Select'

import type { RangeProblem } from '../model/dayRanges'
import type { TimeOption } from '../model/timeOptions'
import type { HoursRange } from '../model/types'

type HoursRangeFieldsProps = {
  /** The fieldset's id; the selects are `${id}-from` and `${id}-to`, the message `${id}-error`. */
  id: string
  /** 1 for the day's first range: its hidden legend reads "Hours 1". */
  position: number
  range: HoursRange
  options: readonly TimeOption[]
  /** What's wrong with it, after "Set … hours". */
  problem?: RangeProblem
  /** The problem in words. */
  error?: string
  /** "Remove 5:30 pm to 10:00 pm". */
  removeLabel: string
  onChange: (part: keyof HoursRange, value: string) => void
  onRemove: () => void
}

// A new range starts on "Choose" (coach-settings §7.3), which can't be chosen again.
const CHOOSE: SelectOption = { value: '', label: 'Choose', disabled: true }

/**
 * One open-hours range in the Edit hours dialog: From and To, 46 px selects that share the
 * line, and "Remove" (coach-settings §7.3, styled like the Record payment panel).
 */
export function HoursRangeFields({
  id,
  position,
  range,
  options,
  problem,
  error,
  removeLabel,
  onChange,
  onRemove,
}: HoursRangeFieldsProps) {
  const describedBy = error ? `${id}-error` : undefined
  const choices = (value: string) => (value === '' ? [CHOOSE, ...options] : options)
  return (
    <Fieldset id={id} legend={`Hours ${position}`} hideLegend error={error}>
      <div className="flex items-end gap-2">
        <Select
          id={`${id}-from`}
          label="From"
          className="min-w-0 flex-1"
          options={choices(range.opens_at)}
          value={range.opens_at}
          onChange={(event) => onChange('opens_at', event.target.value)}
          aria-invalid={problem?.from || undefined}
          aria-describedby={describedBy}
        />
        <Select
          id={`${id}-to`}
          label="To"
          className="min-w-0 flex-1"
          options={choices(range.closes_at)}
          value={range.closes_at}
          onChange={(event) => onChange('closes_at', event.target.value)}
          aria-invalid={problem?.to || undefined}
          aria-describedby={describedBy}
        />
        <Button variant="link" aria-label={removeLabel} onClick={onRemove}>
          Remove
        </Button>
      </div>
    </Fieldset>
  )
}
