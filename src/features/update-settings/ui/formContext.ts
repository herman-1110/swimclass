import { createContext, useContext } from 'react'

import type { Weekday } from '@/entities/open-hours'
import type { CoachSettings } from '@/entities/settings'

import type { FormCheck } from '../model/draft'
import type {
  DayErrors,
  FieldErrors,
  HoursRange,
  SettingsDraft,
  SettingsField,
  TimeField,
  WeekHours,
} from '../model/types'

/** The Settings form once the settings and hours are in. */
export type ReadySettingsForm = {
  ready: true
  /** The saved settings row. */
  settings: CoachSettings
  /** What the form shows: the saved settings with the coach's edits on top. */
  draft: SettingsDraft
  /** The week's open hours with the coach's edits on top. */
  week: WeekHours
  /** What Save would send, and what differs (checkForm). */
  check: FormCheck
  /** Something differs from what's saved. */
  dirty: boolean
  /** A save is running: fields are read-only, Save reads "Saving…". */
  saving: boolean
  /** The last save succeeded and nothing has changed since: Save reads "Settings saved". */
  saved: boolean
  /** The line near Save after a refused save (role="alert"). */
  summary: string | null
  fieldErrors: FieldErrors
  dayErrors: DayErrors
  setField: <K extends SettingsField>(field: K, value: SettingsDraft[K]) => void
  /** On blur: a valid time is shown again as "8:00 pm". */
  tidyTime: (field: TimeField) => void
  /** The Edit hours dialog's ranges for a day. */
  setDayRanges: (weekday: Weekday, ranges: readonly HoursRange[]) => void
  /** Checks the form and saves it (the form's submit). */
  save: () => void
}

/** The Settings form while the settings or hours load, or failed to: nothing to save. */
export type PendingSettingsForm = {
  ready: false
  dirty: false
  saving: false
  saved: false
  summary: null
}

export type SettingsForm = ReadySettingsForm | PendingSettingsForm

const PENDING: PendingSettingsForm = {
  ready: false,
  dirty: false,
  saving: false,
  saved: false,
  summary: null,
}

export const SettingsFormContext = createContext<SettingsForm>(PENDING)

/** The Settings form: its values, its state and its actions (SettingsFormProvider). */
export function useSettingsForm(): SettingsForm {
  return useContext(SettingsFormContext)
}
