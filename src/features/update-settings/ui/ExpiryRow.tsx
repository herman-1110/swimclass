import type { CoachSettings } from '@/entities/settings'
import { plural } from '@/shared/lib/format'
import { FieldRow } from '@/shared/ui/FieldRow'
import { Select, type SelectOption } from '@/shared/ui/Select'

import { rowDescriptionId } from '../model/description'
import { RowDescription } from './RowDescription'

const ID = 'set-expiry'

/** The help's two drawn lines. */
const HELP = ['Counted from when a package is paid', 'Not available yet'] as const

const DRAWN: readonly SelectOption[] = [
  { value: '', label: 'Never' },
  { value: '3', label: 'After 3 months' },
  { value: '6', label: 'After 6 months' },
]

/** The drawn choices, plus the saved one when it isn't among them ("After 4 months"). */
function expiryOptions(months: number | null): SelectOption[] {
  if (months === null || DRAWN.some((option) => option.value === String(months))) {
    return [...DRAWN]
  }
  return [...DRAWN, { value: String(months), label: `After ${plural(months, 'month')}` }].sort(
    (a, b) => Number(a.value) - Number(b.value),
  )
}

type ExpiryRowProps = {
  /** The saved lesson_expiry_months (null: never). */
  months: CoachSettings['lesson_expiry_months']
}

/**
 * Unused lessons expire: shown, never changed (prompt 10 TASK 4, DESIGN §4: nothing applies
 * lesson_expiry_months yet, BR-24). The disabled select shows the saved value, and Save
 * never sends it (coach-settings C3).
 */
export function ExpiryRow({ months }: ExpiryRowProps) {
  return (
    <FieldRow
      label="Unused lessons expire"
      htmlFor={ID}
      help={
        // The space keeps the two lines apart when a screen reader reads them as one.
        <>
          {HELP[0]} <br />
          {HELP[1]}
        </>
      }
      control={
        <>
          <Select
            id={ID}
            size="row"
            disabled
            options={expiryOptions(months)}
            value={months === null ? '' : String(months)}
            aria-describedby={rowDescriptionId(ID)}
          />
          {/* The select is described by the two lines as two sentences. */}
          <RowDescription id={ID} parts={HELP} />
        </>
      }
    />
  )
}
