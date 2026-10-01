import { Field } from '@/shared/ui/Field'
import { FieldRow } from '@/shared/ui/FieldRow'

import { FIELD_IDS, PRICE_FIELDS } from '../model/fields'
import { PRICES_NOTE } from '../model/notes'
import type { PriceField } from '../model/types'
import type { ReadySettingsForm } from './formContext'

const TYPES: Readonly<Record<PriceField, string>> = {
  price_1to1_cents: '1-to-1',
  price_1to2_cents: '1-to-2',
  price_1to3_cents: '1-to-3',
}

type PricesRowProps = {
  form: ReadySettingsForm
}

/**
 * Package prices in RM, one per lesson type (design/AdminSettings.dc.html:177-183): a row of
 * three under the label on phones, beside it from 768 px. An empty box is no price; the
 * drawing's "[PRICE]" is the design tool's stand-in, so an unset price says "Not set"
 * (proposed).
 */
export function PricesRow({ form }: PricesRowProps) {
  const changed = PRICE_FIELDS.some((field) => form.check.changed.includes(field))
  const errors = PRICE_FIELDS.flatMap((field) => form.fieldErrors[field] ?? [])
  return (
    <FieldRow
      label="Package prices (RM)"
      help="One payment per package"
      group
      controlLayout="prices"
      note={changed ? PRICES_NOTE : null}
      error={errors.join(' ') || undefined}
      control={PRICE_FIELDS.map((field) => (
        <Field
          key={field}
          id={FIELD_IDS[field]}
          label={TYPES[field]}
          size="row"
          width="price"
          align="end"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Not set"
          className="min-w-0"
          value={form.draft[field]}
          onChange={(event) => form.setField(field, event.target.value)}
          readOnly={form.saving}
          aria-invalid={form.fieldErrors[field] ? true : undefined}
        />
      ))}
    />
  )
}
