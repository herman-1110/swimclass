import { FieldList } from '@/shared/ui/FieldList'
import { FieldRow } from '@/shared/ui/FieldRow'

import { CountRow } from './CountRow'
import { ExpiryRow } from './ExpiryRow'
import type { ReadySettingsForm } from './formContext'
import { InstructionsRow } from './InstructionsRow'
import { PricesRow } from './PricesRow'
import { SettingsSection } from './SettingsSection'

/** Packages & payments (design/AdminSettings.dc.html:169-202). */
export function PackagesSection({ form }: { form: ReadySettingsForm }) {
  return (
    <SettingsSection
      id="packages"
      title="Packages & payments"
      note="Students booked together share one package. A lesson counts when its end time passes."
    >
      <FieldList>
        <CountRow
          form={form}
          field="lessons_per_package"
          label="Lessons per package"
          help="A 2-hour lesson uses 2"
          unit={['lesson', 'lessons']}
        />
        <PricesRow form={form} />
        <CountRow
          form={form}
          field="unpaid_packages_allowed"
          label="Unpaid packages allowed"
          help="How many can start before paying"
          unit={['package', 'packages']}
        />
        <ExpiryRow months={form.settings.lesson_expiry_months} />
        <InstructionsRow form={form} />
        {/* Planned for later (PRD §11): nothing to change yet. */}
        <FieldRow
          label="Online payments"
          help="FPX and DuitNow through a payment gateway · planned for later"
          control={<span className="text-label text-muted">Not connected</span>}
        />
      </FieldList>
    </SettingsSection>
  )
}
