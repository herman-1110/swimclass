import { FieldList } from '@/shared/ui/FieldList'
import type { SelectOption } from '@/shared/ui/Select'

import { ChoiceRow } from './ChoiceRow'
import { CountRow } from './CountRow'
import type { ReadySettingsForm } from './formContext'
import { LessonLengthsRow } from './LessonLengthsRow'
import { SettingsSection } from './SettingsSection'
import { SwitchRow } from './SwitchRow'

// The options repeat the database's checks (max_students_per_lesson 1–3; start_step_minutes
// 15, 30 or 60): they aren't business defaults, and the database stays the judge. The
// drawing's order; "Every hour" for its "On the hour" (prompt 10 TASK 3, coach-settings C2).
const STUDENTS: readonly SelectOption[] = [
  { value: '3', label: 'Up to 3' },
  { value: '2', label: 'Up to 2' },
  { value: '1', label: '1 only' },
]

const START_STEPS: readonly SelectOption[] = [
  { value: '30', label: 'Every 30 min' },
  { value: '15', label: 'Every 15 min' },
  { value: '60', label: 'Every hour' },
]

type BookingRulesSectionProps = {
  form: ReadySettingsForm
}

/** Booking rules (design/AdminSettings.dc.html:132-168). */
export function BookingRulesSection({ form }: BookingRulesSectionProps) {
  return (
    <SettingsSection
      id="booking-rules"
      title="Booking rules"
      note="What customers can pick, and when they can change it."
    >
      <FieldList>
        <CountRow
          form={form}
          field="travel_gap_minutes"
          label="Travel gap"
          help="Blocked before and after every lesson"
          unit={['min', 'min']}
          spokenUnit="minutes"
        />
        <LessonLengthsRow form={form} />
        <ChoiceRow
          form={form}
          field="max_students_per_lesson"
          label="Students per lesson"
          help="From the same account: 1-to-1, 1-to-2 or 1-to-3"
          options={STUDENTS}
        />
        <ChoiceRow
          form={form}
          field="start_step_minutes"
          label="Start times"
          help="How often a lesson can start"
          options={START_STEPS}
        />
        <CountRow
          form={form}
          field="cancel_cutoff_hours"
          label="Cancel or reschedule"
          help="Allowed up to this long before the lesson"
          unit={['hour', 'hours']}
          spokenUnit="hours"
        />
        <CountRow
          form={form}
          field="booking_window_weeks"
          label="Booking window"
          help="How far ahead customers can book"
          unit={['week', 'weeks']}
          spokenUnit="weeks"
        />
        <SwitchRow
          form={form}
          field="require_approval"
          label="Approve new accounts"
          help="New sign-ups wait for you before they can book"
        />
      </FieldList>
    </SettingsSection>
  )
}
