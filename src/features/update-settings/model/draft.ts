import {
  formatTimeOfDay,
  rangesByWeekday,
  timeOfDayMinutes,
  type Weekday,
  WEEKDAYS,
  type WeeklyRange,
} from '@/entities/open-hours'
import type { CoachSettings } from '@/entities/settings'
import { formatRinggit, parseRinggit } from '@/shared/lib/format'

import {
  CHOICE_FIELDS,
  COUNT_FIELDS,
  FIELD_ORDER,
  PRICE_FIELDS,
  SWITCH_FIELDS,
  TIME_FIELDS,
} from './fields'
import { parseTimeOfDay, shortTimeOfDay } from './timeText'
import type {
  HoursRange,
  RuleInput,
  SaveRequest,
  SettingsDraft,
  SettingsField,
  SettingsPatch,
  WeekHours,
} from './types'

// What the form shows for the saved settings, and what Save sends (coach-settings §5.3).
// The form checks only the shape of what was typed (a number, an amount, a time); the
// database judges the values (ARCHITECTURE §3.1 rule 6).

function priceText(cents: number | null): string {
  return cents === null ? '' : formatRinggit(cents, { symbol: false })
}

function ascending(values: readonly number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b)
}

/** The saved settings as the form shows them (§5.2): 60 → "60", 26050 → "260.50", "20:00:00" → "8:00 pm". */
export function toDraft(settings: CoachSettings): SettingsDraft {
  return {
    travel_gap_minutes: String(settings.travel_gap_minutes),
    lesson_lengths: ascending(settings.lesson_lengths),
    max_students_per_lesson: String(settings.max_students_per_lesson),
    start_step_minutes: String(settings.start_step_minutes),
    cancel_cutoff_hours: String(settings.cancel_cutoff_hours),
    booking_window_weeks: String(settings.booking_window_weeks),
    require_approval: settings.require_approval,
    lessons_per_package: String(settings.lessons_per_package),
    price_1to1_cents: priceText(settings.price_1to1_cents),
    price_1to2_cents: priceText(settings.price_1to2_cents),
    price_1to3_cents: priceText(settings.price_1to3_cents),
    unpaid_packages_allowed: String(settings.unpaid_packages_allowed),
    payment_instructions: settings.payment_instructions ?? '',
    reminder_time: formatTimeOfDay(settings.reminder_time),
    digest_time: formatTimeOfDay(settings.digest_time),
    late_change_alert: settings.late_change_alert,
    booking_confirmations: settings.booking_confirmations,
    coach_email: settings.coach_email,
  }
}

/**
 * The same entry as the form shows it: the same text or switch, or the same lesson lengths
 * in any order. An entry typed back to the saved one is then no edit at all, so fresh data
 * shows in it (coach-settings §4.3).
 */
export function sameDraftValue(
  a: SettingsDraft[SettingsField],
  b: SettingsDraft[SettingsField],
): boolean {
  if (typeof a === 'object' && typeof b === 'object') {
    return ascending(a).join() === ascending(b).join()
  }
  return a === b
}

/** A day's ranges in opening order. */
export function sortRanges(ranges: readonly HoursRange[]): HoursRange[] {
  return ranges.toSorted(
    (a, b) =>
      timeOfDayMinutes(a.opens_at) - timeOfDayMinutes(b.opens_at) ||
      timeOfDayMinutes(a.closes_at) - timeOfDayMinutes(b.closes_at),
  )
}

/** The saved weekly hours (availability_rules) by day, as the form keeps them ("17:30"). */
export function toWeekHours(ranges: readonly WeeklyRange[]): WeekHours {
  const byDay = rangesByWeekday(ranges)
  const week = {} as Record<Weekday, HoursRange[]>
  WEEKDAYS.forEach((weekday, index) => {
    week[weekday] = byDay[index].map((range) => ({
      opens_at: shortTimeOfDay(range.opens_at),
      closes_at: shortTimeOfDay(range.closes_at),
    }))
  })
  return week
}

/** The same ranges, whatever the order and however the times are written ("17:30", "17:30:00"). */
export function sameRanges(a: readonly HoursRange[], b: readonly HoursRange[]): boolean {
  if (a.length !== b.length) return false
  const left = sortRanges(a)
  const right = sortRanges(b)
  return left.every(
    (range, index) =>
      timeOfDayMinutes(range.opens_at) === timeOfDayMinutes(right[index].opens_at) &&
      timeOfDayMinutes(range.closes_at) === timeOfDayMinutes(right[index].closes_at),
  )
}

/**
 * set_open_hours' list for the whole week (§5.3: it replaces every day, so every day goes,
 * changed or not), by weekday and then opening time. An empty list closes every day.
 */
export function weekRules(week: WeekHours): RuleInput[] {
  return WEEKDAYS.flatMap((weekday) =>
    sortRanges(week[weekday]).map((range) => ({
      weekday,
      opens_at: range.opens_at,
      closes_at: range.closes_at,
    })),
  )
}

/** A whole number typed as digits ("60", "60 "), or null ("", "1.5", "-1", "abc"). */
export function parseCount(text: string): number | null {
  const value = text.trim()
  return /^\d+$/.test(value) ? Number(value) : null
}

/** An amount in RM as cents, null for none, or 'invalid' (not an amount, or below zero). */
export function parsePrice(text: string): number | null | 'invalid' {
  const cents = parseRinggit(text)
  return cents !== 'invalid' && (cents === null || cents >= 0) ? cents : 'invalid'
}

/** What the form would save, and what needs attention first. */
export type FormCheck = {
  /** What Save sends. */
  request: SaveRequest
  /** Settings whose text isn't a number, an amount or a time, in form order: no call is made. */
  invalid: SettingsField[]
  /** Settings that differ from the saved ones (the invalid ones too), in form order. */
  changed: SettingsField[]
  /** Days whose hours differ from the saved ones. */
  changedDays: Weekday[]
  /** Something differs, so Save does something (and the leave guard is on). */
  dirty: boolean
}

/**
 * Compares the form with the saved settings and hours (§5.3). A setting counts as changed
 * when its value differs, not its text: "60 " is 60, "8:00 PM" is 20:00, a stored
 * "19:45:30" shown as "7:45 pm" is unchanged, the lesson lengths compare as sets, and the
 * email and instructions compare trimmed (an empty box is no instructions).
 */
export function checkForm(
  stored: CoachSettings,
  storedWeek: WeekHours,
  draft: SettingsDraft,
  week: WeekHours,
): FormCheck {
  const patch: SettingsPatch = {}
  const invalid = new Set<SettingsField>()

  for (const field of COUNT_FIELDS) {
    const value = parseCount(draft[field])
    if (value === null) invalid.add(field)
    else if (value !== stored[field]) patch[field] = value
  }
  // The selects offer only the values the database allows (its checks: 1–3; 15, 30 or 60).
  for (const field of CHOICE_FIELDS) {
    const value = Number(draft[field])
    if (value !== stored[field]) patch[field] = value
  }
  for (const field of PRICE_FIELDS) {
    const value = parsePrice(draft[field])
    if (value === 'invalid') invalid.add(field)
    else if (value !== stored[field]) patch[field] = value
  }
  for (const field of TIME_FIELDS) {
    const value = parseTimeOfDay(draft[field])
    if (value === null) invalid.add(field)
    else if (value !== stored[field].slice(0, 5)) patch[field] = value
  }
  for (const field of SWITCH_FIELDS) {
    if (draft[field] !== stored[field]) patch[field] = draft[field]
  }
  const lengths = ascending(draft.lesson_lengths)
  const storedLengths = ascending(stored.lesson_lengths)
  if (lengths.join() !== storedLengths.join()) patch.lesson_lengths = lengths
  const instructions = draft.payment_instructions.trim() || null
  if (instructions !== (stored.payment_instructions?.trim() || null)) {
    patch.payment_instructions = instructions
  }
  // No email is "", never null (the column is NOT NULL; coach-settings §9 C18).
  const email = draft.coach_email.trim()
  if (email !== stored.coach_email.trim()) patch.coach_email = email

  const changedDays = WEEKDAYS.filter((weekday) => !sameRanges(storedWeek[weekday], week[weekday]))
  const request: SaveRequest = {
    rules: changedDays.length > 0 ? weekRules(week) : null,
    patch: Object.keys(patch).length > 0 ? patch : null,
  }
  return {
    request,
    invalid: FIELD_ORDER.filter((field) => invalid.has(field)),
    changed: FIELD_ORDER.filter((field) => invalid.has(field) || Object.hasOwn(patch, field)),
    changedDays,
    dirty: request.rules !== null || request.patch !== null || invalid.size > 0,
  }
}
