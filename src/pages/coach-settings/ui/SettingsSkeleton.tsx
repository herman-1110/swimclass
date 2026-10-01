import { SectionTitle } from '@/shared/ui/SectionTitle'
import { Skeleton } from '@/shared/ui/Skeleton'

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

function TableRows() {
  return (
    <>
      {/* The open hours table's header, at its own height. */}
      <div className="flex border-b border-frame bg-table-head px-3 py-2.5 text-small font-semibold text-tag-ink md:px-4">
        <span className="w-16 md:w-26">Day</span>
        <span>Hours</span>
      </div>
      {Array.from({ length: 7 }, (_, index) => (
        <div
          key={index}
          className="flex h-12 items-center gap-6 border-b border-line-row px-3 last:border-b-0 even:bg-zebra md:gap-12 md:px-4"
        >
          <Skeleton shape="line" className="h-3 w-8" />
          <Skeleton shape="line" className="h-3 w-28" />
        </div>
      ))}
    </>
  )
}

function SettingRows({ count }: { count: number }) {
  return Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className="flex min-h-13.5 items-center justify-between gap-4 border-t border-line-row px-3.5 first:border-t-0 md:px-4"
    >
      <Skeleton shape="line" className="h-3 w-36" />
      <Skeleton shape="line" className="h-3 w-16" />
    </div>
  ))
}

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
            {section.title === 'Open hours' ? <TableRows /> : <SettingRows count={section.rows} />}
          </div>
        </div>
      ))}
    </div>
  )
}
