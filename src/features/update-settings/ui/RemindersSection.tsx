import { FieldList } from '@/shared/ui/FieldList'

import { EmailRow } from './EmailRow'
import type { ReadySettingsForm } from './formContext'
import { SettingsSection } from './SettingsSection'
import { SwitchRow } from './SwitchRow'
import { TimeRow } from './TimeRow'

/** Reminders & emails (design/AdminSettings.dc.html:203-228). */
export function RemindersSection({ form }: { form: ReadySettingsForm }) {
  return (
    <SettingsSection id="emails" title="Reminders & emails" note="Times are Malaysia time.">
      <FieldList>
        <TimeRow
          form={form}
          field="reminder_time"
          label="Lesson reminder to customers"
          help="Sent the evening before"
        />
        <TimeRow
          form={form}
          field="digest_time"
          label="Tomorrow’s schedule for you"
          help="Lessons, places, and who still owes payment"
        />
        <SwitchRow
          form={form}
          field="late_change_alert"
          label="Late-change alert"
          help="Email me right away about changes in the next 24 hours"
        />
        {/* The switch covers booking confirmations only: cancellation emails always go
            (TECH_SPEC §8), so the drawn "when they book or cancel" would mislead
            (coach-settings C4, proposed help). */}
        <SwitchRow
          form={form}
          field="booking_confirmations"
          label="Booking confirmations"
          help="Email customers when they book. Cancellation emails always go out."
        />
        <EmailRow form={form} />
      </FieldList>
    </SettingsSection>
  )
}
