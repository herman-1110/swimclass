import type { Weekday } from '@/entities/open-hours'
import type { CoachSettings } from '@/entities/settings'

// The Settings form (coach-settings spec §4.3, §5.2): what the coach sees and types, and
// what a save sends. Field names are the settings table's columns.

/**
 * One open-hours range as the form holds it, MYT wall clock: "17:30" ("HH:MM"; a stored
 * time keeps its seconds, "17:30:30", only when they aren't zero). A range ends at "24:00"
 * when the database says so. The Edit hours dialog uses "" while a new range is on "Choose".
 */
export type HoursRange = { opens_at: string; closes_at: string }

/** The week's open hours, each day's ranges in opening order. */
export type WeekHours = Readonly<Record<Weekday, readonly HoursRange[]>>

/**
 * The settings the form edits, as shown and typed (§5.2): numbers and prices as text
 * ("60", "260.50" or "" for no price), the selects' values ("3", "30"), times as words
 * ("8:00 pm"), the switches as booleans and the lesson lengths as the ticked minutes.
 */
export type SettingsDraft = {
  travel_gap_minutes: string
  lesson_lengths: readonly number[]
  max_students_per_lesson: string
  start_step_minutes: string
  cancel_cutoff_hours: string
  booking_window_weeks: string
  require_approval: boolean
  lessons_per_package: string
  price_1to1_cents: string
  price_1to2_cents: string
  price_1to3_cents: string
  unpaid_packages_allowed: string
  payment_instructions: string
  reminder_time: string
  digest_time: string
  late_change_alert: boolean
  booking_confirmations: boolean
  coach_email: string
}

/** A setting the form edits. */
export type SettingsField = keyof SettingsDraft

/** A whole number of minutes, hours, weeks, lessons or packages, typed as text. */
export type CountField =
  | 'travel_gap_minutes'
  | 'cancel_cutoff_hours'
  | 'booking_window_weeks'
  | 'lessons_per_package'
  | 'unpaid_packages_allowed'

/** A select whose options are numbers. */
export type ChoiceField = 'max_students_per_lesson' | 'start_step_minutes'

/** A package price in RM, stored as cents. */
export type PriceField = 'price_1to1_cents' | 'price_1to2_cents' | 'price_1to3_cents'

/** A time of day for an email, typed as text ("8:00 pm"). */
export type TimeField = 'reminder_time' | 'digest_time'

/** An on/off rule. */
export type SwitchField = 'require_approval' | 'late_change_alert' | 'booking_confirmations'

/** One item of set_open_hours' list (§5.3): `{ weekday, opens_at: "17:30", closes_at: "22:00" }`. */
export type RuleInput = { weekday: Weekday; opens_at: string; closes_at: string }

/**
 * update_settings' p_settings: only the changed columns, each as its JSON type (§5.3).
 * Never id, updated_at, business_name or lesson_expiry_months.
 */
export type SettingsPatch = Partial<Pick<CoachSettings, SettingsField>>

/** What Save sends: the whole week when any day changed, and the changed settings. */
export type SaveRequest = {
  /** set_open_hours' list, or null when the hours are unchanged. */
  rules: RuleInput[] | null
  /** update_settings' object, or null when no setting changed. */
  patch: SettingsPatch | null
}

/** Words for the settings that need attention, by field. */
export type FieldErrors = Partial<Record<SettingsField, string>>

/** Words for the days whose hours need attention. */
export type DayErrors = Partial<Record<Weekday, string>>
