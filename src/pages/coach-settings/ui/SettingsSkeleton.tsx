import { SectionTitle } from '@/shared/ui/SectionTitle'

import { OpenHoursRowsSkeleton } from './OpenHoursRowsSkeleton'
import { SettingRowsSkeleton } from './SettingRowsSkeleton'

// The sections as they will be (coach-settings §6.2, proposed): their titles and notes, and
// frames of grey rows the height of the real ones, in the same grid as SettingsSections.
const SECTIONS = [
  {
    title: 'Open hours',
    note: 'Repeats every week. One-off changes go on the schedule.',
    rows: 7,
  },
  {
    title: 'Booking rules',
    note: 'What customers can pick, and when they can change it.',
    rows: 7,
  },
  {
    title: 'Packages & payments',
    note: 'Students booked together share one package. A lesson counts when its end time passes.',
    rows: 6,
  },
  { title: 'Reminders & emails', note: 'Times are Malaysia time.', rows: 5 },
] as const

/** The page while the settings and hours load: no Edit buttons and no inputs yet. */
export function SettingsSkeleton() {
  return (
    <div
      aria-busy="true"
      className="grid grid-cols-1 items-start gap-y-8 md:max-w-[760px] xl:max-w-[1140px] xl:grid-cols-2 xl:gap-x-12 xl:gap-y-7"
    >
      <p role="status" className="sr-only">
        Loading settings…
      </p>
      {SECTIONS.map((section) => (
        <div key={section.title} className="flex min-w-0 flex-col">
          <SectionTitle note={section.note}>{section.title}</SectionTitle>
          <div aria-hidden="true" className="overflow-hidden rounded-frame border border-frame">
            {section.title === 'Open hours' ? (
              <OpenHoursRowsSkeleton />
            ) : (
              <SettingRowsSkeleton count={section.rows} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
