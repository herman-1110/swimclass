import { useState } from 'react'

import { HoursChips, type Weekday, weekdayName, WEEKDAYS } from '@/entities/open-hours'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'
import { Table, type TableColumn, type TableRowData } from '@/shared/ui/Table'

import { editHoursId, hoursErrorId } from '../model/fields'
import { HOURS_NOTE } from '../model/notes'
import { EditDayHoursDialog } from './EditDayHoursDialog'
import type { ReadySettingsForm } from './formContext'
import { SettingsSection } from './SettingsSection'

// design/AdminSettings.dc.html:51-60, 110-130: a 40 px day column (72 px from 768 px), the
// chips, and the Edit column as narrow as its button. The header cells are all 12 px
// (coach-settings C10).
const COLUMNS: readonly TableColumn[] = [
  { key: 'day', header: 'Day', rowHeader: true, width: 'w-10 md:w-18' },
  { key: 'hours', header: 'Hours' },
  {
    key: 'actions',
    header: 'Actions',
    hideHeader: true,
    width: 'w-[1%]',
    align: 'end',
    nowrap: true,
    tight: true,
  },
]

type OpenHoursSectionProps = {
  form: ReadySettingsForm
}

/**
 * Open hours (prompt 10 TASK 2): each weekday's ranges as chips, and "Edit" for the day's
 * dialog. The dialog changes the form only; Save sends the whole week. A note shows while
 * any day differs from the saved hours.
 */
export function OpenHoursSection({ form }: OpenHoursSectionProps) {
  const [editing, setEditing] = useState<Weekday | null>(null)
  const rows: TableRowData[] = WEEKDAYS.map((weekday) => {
    const error = form.dayErrors[weekday]
    return {
      key: String(weekday),
      cells: {
        day: <span className="text-sm leading-[normal] font-semibold">{weekdayName(weekday)}</span>,
        hours: (
          <div className="flex flex-col items-start gap-1.5">
            <HoursChips ranges={form.week[weekday]} />
            {error && (
              <p id={hoursErrorId(weekday)} className="text-small leading-[1.4] text-warn">
                {error}
              </p>
            )}
          </div>
        ),
        actions: (
          // 44 px wide (the drawing's 35.7 px is under DESIGN §5's targets, coach-settings C11).
          // The 44 px button leaves 2 px above and below it in its 48 px row, so its focus ring
          // is drawn just inside it: the frame's overflow: hidden would cut the usual 2 px
          // offset off Sunday's (coach-settings §7.5).
          <Button
            id={editHoursId(weekday)}
            variant="link"
            textSize="label"
            className="focus-visible:-outline-offset-2"
            aria-label={`Edit ${weekdayName(weekday, 'long')} hours`}
            aria-haspopup="dialog"
            aria-describedby={error ? hoursErrorId(weekday) : undefined}
            aria-disabled={form.saving || undefined}
            onClick={() => setEditing(weekday)}
          >
            Edit
          </Button>
        ),
      },
    }
  })
  const allClosed = WEEKDAYS.every((weekday) => form.week[weekday].length === 0)

  return (
    <SettingsSection
      id="open-hours"
      title="Open hours"
      note="Repeats every week. One-off changes go on the schedule."
    >
      <Table density="compact" labelledBy="open-hours-title" columns={COLUMNS} rows={rows} />
      {form.check.changedDays.length > 0 && (
        <p className="mt-2.5 rounded-small bg-subtle px-2.5 py-2 text-small leading-[1.4] text-ink">
          {HOURS_NOTE}
        </p>
      )}
      {allClosed && (
        <Banner className="mt-2.5">
          Every day is closed, so customers can’t book any lessons.
        </Banner>
      )}
      {editing !== null && (
        <EditDayHoursDialog
          key={editing}
          weekday={editing}
          ranges={form.week[editing]}
          onApply={(ranges) => {
            form.setDayRanges(editing, ranges)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </SettingsSection>
  )
}
