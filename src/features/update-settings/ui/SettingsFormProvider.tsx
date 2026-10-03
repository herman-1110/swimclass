import { type ReactNode, useState } from 'react'

import { formatTimeOfDay, type Weekday, type WeeklyRange } from '@/entities/open-hours'
import type { CoachSettings } from '@/entities/settings'

import { HoursOnlySavedError, useSaveSettings } from '../api/useSaveSettings'
import {
  checkForm,
  sameDraftValue,
  sameRanges,
  sortRanges,
  toDraft,
  toWeekHours,
} from '../model/draft'
import { editHoursId, FIELD_IDS } from '../model/fields'
import { describeInvalidFields, describeSaveFailure } from '../model/saveFailure'
import { parseTimeOfDay } from '../model/timeText'
import type {
  DayErrors,
  FieldErrors,
  HoursRange,
  SettingsDraft,
  SettingsField,
  TimeField,
} from '../model/types'
import { type SettingsForm, SettingsFormContext } from './formContext'
import { LeaveWithoutSavingDialog } from './LeaveWithoutSavingDialog'
import { useFocusRequest } from './useFocusRequest'

type SettingsFormProviderProps = {
  /** The saved settings (useCoachSettings); undefined while they load. */
  settings: CoachSettings | undefined
  /** The saved weekly hours (useWeeklyHours); undefined while they load. */
  weeklyHours: readonly WeeklyRange[] | undefined
  children: ReactNode
}

/** The record without one of its (optional) entries. */
function without<T extends object>(record: T, key: keyof T): T {
  const rest = { ...record }
  delete rest[key]
  return rest
}

/**
 * The Settings form's state (coach-settings §4.3, §6): the coach's edits over the saved
 * settings and hours, the save and its outcome, and the leave guard. Only real differences
 * are kept as edits, so fresh data shows in every entry the coach hasn't changed, and a
 * background refetch never overwrites what the coach typed. Wrap the header (its Save
 * button), the sections and the Save bar in it; they render the "not ready" look until both
 * reads are in.
 */
export function SettingsFormProvider({
  settings,
  weeklyHours,
  children,
}: SettingsFormProviderProps) {
  const [edits, setEdits] = useState<Partial<SettingsDraft>>({})
  const [dayEdits, setDayEdits] = useState<Partial<Record<Weekday, readonly HoursRange[]>>>({})
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [dayErrors, setDayErrors] = useState<DayErrors>({})
  const [summary, setSummary] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const focus = useFocusRequest()
  const mutation = useSaveSettings()
  const saving = mutation.isPending

  let form: SettingsForm = {
    ready: false,
    dirty: false,
    saving: false,
    saved: false,
    summary: null,
  }
  if (settings && weeklyHours) {
    const storedWeek = toWeekHours(weeklyHours)
    const storedDraft = toDraft(settings)
    const draft = { ...storedDraft, ...edits }
    const week = { ...storedWeek, ...dayEdits }
    const check = checkForm(settings, storedWeek, draft, week)

    // An entry back at its saved value is no edit: the saved value shows there from now on.
    const edit = <K extends SettingsField>(
      current: Partial<SettingsDraft>,
      field: K,
      value: SettingsDraft[K],
    ) =>
      sameDraftValue(value, storedDraft[field])
        ? without(current, field)
        : { ...current, [field]: value }

    const setField = <K extends SettingsField>(field: K, value: SettingsDraft[K]) => {
      if (saving) return
      setEdits((current) => edit(current, field, value))
      setFieldErrors((current) => without(current, field))
      setSaved(false)
    }

    const tidyTime = (field: TimeField) => {
      const typed = edits[field]
      const time = typed === undefined || saving ? null : parseTimeOfDay(typed)
      if (time === null) return
      const words = formatTimeOfDay(time)
      if (words !== typed) setEdits((current) => edit(current, field, words))
    }

    const setDayRanges = (weekday: Weekday, ranges: readonly HoursRange[]) => {
      if (saving) return
      setDayEdits((current) =>
        sameRanges(ranges, storedWeek[weekday])
          ? without(current, weekday)
          : { ...current, [weekday]: sortRanges(ranges) },
      )
      setDayErrors((current) => without(current, weekday))
      setSaved(false)
    }

    const save = () => {
      if (saving || !check.dirty) return
      setSaved(false)
      setDayErrors({})
      // The form's own checks first: every setting that isn't a number, an amount or a
      // time is marked at once, and nothing is sent (§5.3).
      if (check.invalid.length > 0) {
        const { fields, summary } = describeInvalidFields(check.invalid)
        const [first] = check.invalid
        setFieldErrors(fields)
        setSummary(summary)
        focus(FIELD_IDS[first])
        return
      }
      setFieldErrors({})
      setSummary(null)
      const request = check.request
      mutation.mutate(request, {
        onSuccess: () => {
          // The saved values are in the cache by now: the form shows them.
          setEdits({})
          setDayEdits({})
          setSaved(true)
        },
        onError: (error) => {
          const hoursSaved = error instanceof HoursOnlySavedError
          // The saved hours are the new baseline; the other edits stay to be saved again.
          if (hoursSaved) setDayEdits({})
          const failure = describeSaveFailure(error, request, hoursSaved)
          setFieldErrors(failure.fields)
          setDayErrors(failure.days)
          setSummary(failure.summary)
          if (failure.focus) {
            focus(
              'field' in failure.focus
                ? FIELD_IDS[failure.focus.field]
                : editHoursId(failure.focus.weekday),
            )
          }
        },
      })
    }

    form = {
      ready: true,
      settings,
      draft,
      week,
      check,
      dirty: check.dirty,
      saving,
      saved,
      summary,
      fieldErrors,
      dayErrors,
      setField,
      tidyTime,
      setDayRanges,
      save,
    }
  }

  return (
    <SettingsFormContext value={form}>
      {children}
      {/* One polite announcement for a save that worked (§6.7); the line near Save is the alert. */}
      <p role="status" className="sr-only">
        {form.ready && saved ? 'Settings saved.' : ''}
      </p>
      <LeaveWithoutSavingDialog when={form.dirty || saving} />
    </SettingsFormContext>
  )
}
