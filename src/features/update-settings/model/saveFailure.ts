import { type Weekday, WEEKDAYS } from '@/entities/open-hours'
import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'

import { FIELD_LABELS, isSettingsField } from './fields'
import type { DayErrors, FieldErrors, SaveRequest, SettingsField } from './types'

/**
 * Before the message when set_open_hours saved the hours and update_settings then refused
 * the rest (prompt 10 TASK 7: "say the open hours were saved and the other changes
 * weren't"; the words are proposed, coach-settings §5.4).
 */
export const HOURS_SAVED_LEAD = 'Your open hours were saved, but your other changes weren’t.'

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
 * update_settings refused, so the line says so first.
 */
export function describeSaveFailure(
  error: unknown,
  request: SaveRequest,
  hoursSaved = false,
): SaveFailure {
  const { code, detail } = toAppError(error)
  const message = messageFor({ code, detail }, { audience: 'coach', fieldLabels: FIELD_LABELS })
  const failure: SaveFailure = {
    summary: hoursSaved ? `${HOURS_SAVED_LEAD} ${message}` : message,
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

/** The form's own checks (§5.3): every setting whose text isn't a number, an amount or a time. */
export function describeInvalidFields(invalid: readonly SettingsField[]): FieldErrors {
  const fields: FieldErrors = {}
  for (const field of invalid) {
    fields[field] = messageFor(
      { code: 'invalid_setting', detail: { field } },
      { audience: 'coach', fieldLabels: FIELD_LABELS },
    )
  }
  return fields
}
