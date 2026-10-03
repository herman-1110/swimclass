import { type Weekday, WEEKDAYS } from '@/entities/open-hours'
import { toAppError } from '@/shared/api/rpc'
import { messageFor, OPEN_HOURS_SAVED_LEAD } from '@/shared/config/messages'

import { FIELD_LABELS, isSettingsField, PRICE_FIELDS, TIME_FIELDS } from './fields'
import type { DayErrors, FieldErrors, SaveRequest, SettingsField } from './types'

/** Where a refused save shows its words (coach-settings §6.8), and what gets focus. */
export type SaveFailure = {
  /** The line near Save (role="alert"). */
  summary: string
  /** Under the setting the database named (invalid_setting {field}). */
  fields: FieldErrors
  /** Under the day's chips (invalid_range, invalid_rules, overlapping_rules). */
  days: DayErrors
  /** The setting's control, or the day's Edit button; null keeps focus on Save. */
  focus: { field: SettingsField } | { weekday: Weekday } | null
}

function asWeekday(value: unknown): Weekday | null {
  return WEEKDAYS.find((weekday) => weekday === value) ?? null
}

/** The day of the `index`-th range sent (the database counts from 1). */
function dayOfRule(request: SaveRequest, index: unknown): Weekday | null {
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 1) return null
  return request.rules?.[index - 1]?.weekday ?? null
}

/** The day a set_open_hours refusal is about, or null. */
function dayOf(code: string, detail: Readonly<Record<string, unknown>>, request: SaveRequest) {
  if (code === 'overlapping_rules') return asWeekday(detail.weekday)
  if (code === 'invalid_range' || code === 'invalid_rules') return dayOfRule(request, detail.index)
  return null
}

/**
 * A refused save in words (coach-settings §5.4, DESIGN §6's coach table): the setting or day
 * it names, and the line near Save. `hoursSaved`: set_open_hours had saved the hours before
 * update_settings refused, so the line says so first (prompt 10 TASK 7: "say the open hours
 * were saved and the other changes weren't").
 */
export function describeSaveFailure(
  error: unknown,
  request: SaveRequest,
  hoursSaved = false,
): SaveFailure {
  const { code, detail } = toAppError(error)
  const message = messageFor({ code, detail }, { audience: 'coach', fieldLabels: FIELD_LABELS })
  const failure: SaveFailure = {
    summary: hoursSaved ? `${OPEN_HOURS_SAVED_LEAD} ${message}` : message,
    fields: {},
    days: {},
    focus: null,
  }
  const field = detail.field
  if (code === 'invalid_setting' && typeof field === 'string' && isSettingsField(field)) {
    failure.fields[field] = message
    failure.focus = { field }
    return failure
  }
  const weekday = dayOf(code, detail, request)
  if (weekday !== null) {
    failure.days[weekday] = message
    failure.focus = { weekday }
  }
  return failure
}

/** What a box the form couldn't read asks for: an amount, a time or a whole number. */
function formatCode(field: SettingsField): string {
  if ((PRICE_FIELDS as readonly SettingsField[]).includes(field)) return 'amount_format'
  if ((TIME_FIELDS as readonly SettingsField[]).includes(field)) return 'time_format'
  return 'count_format'
}

/**
 * The form's own checks (§5.3): every setting whose text isn't a number, an amount or a time,
 * with what to type under its box ("Enter a time like 8:00 pm."), and the first one near Save,
 * where the label says which box ("Lesson reminder to customers: enter a time like 8:00 pm.").
 */
export function describeInvalidFields(invalid: readonly SettingsField[]): {
  fields: FieldErrors
  summary: string | null
} {
  const fields: FieldErrors = {}
  for (const field of invalid) {
    fields[field] = messageFor({ code: formatCode(field) }, { audience: 'coach' })
  }
  const [first] = invalid
  const words = first === undefined ? undefined : fields[first]
  if (first === undefined || words === undefined) return { fields, summary: null }
  const summary = `${FIELD_LABELS[first]}: ${words.charAt(0).toLowerCase()}${words.slice(1)}`
  return { fields, summary }
}
