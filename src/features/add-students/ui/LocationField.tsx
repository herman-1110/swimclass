import { Field } from '@/shared/ui/Field'

import { FIELD_IDS } from '../model/fields'

type LocationFieldProps = {
  value: string
  onChange: (value: string) => void
  /** The pools the coach's groups use, suggested as they type (the spec §5.1, Q12). */
  suggestions: readonly string[]
  error?: string
}

const LIST_ID = `${FIELD_IDS.location}-list`

/** Pool location (AdminAddStudents.dc.html:92-95), with the existing pools as suggestions. */
export function LocationField({ value, onChange, suggestions, error }: LocationFieldProps) {
  return (
    <>
      <Field
        id={FIELD_IDS.location}
        label="Pool location"
        placeholder="e.g. Maple Condo pool"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        list={suggestions.length > 0 ? LIST_ID : undefined}
        autoComplete="off"
        autoCapitalize="words"
        error={error}
      />
      {suggestions.length > 0 && (
        <datalist id={LIST_ID}>
          {suggestions.map((location) => (
            <option key={location} value={location} />
          ))}
        </datalist>
      )}
    </>
  )
}
