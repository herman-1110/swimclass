import { useState } from 'react'

import { type BookedCoachLesson, useCoachWeek } from '@/entities/schedule'
import { DocumentTitle } from '@/entities/settings'
import { AddBookingDialog } from '@/features/add-booking'
import { BlockTimeDialog, OpenExtraTimeDialog } from '@/features/set-time-exception'
import type { DateKey } from '@/shared/lib/time'

import { LessonDetailsDialog } from './ui/LessonDetailsDialog'
import { ScheduleHeader } from './ui/ScheduleHeader'
import { ScheduleNotice } from './ui/ScheduleNotice'
import { ScheduleSideColumn } from './ui/ScheduleSideColumn'
import { ScheduleWeek } from './ui/ScheduleWeek'
import { useNotice } from './ui/useNotice'
import { useScheduleDay } from './ui/useScheduleDay'
import { WeekExceptions } from './ui/WeekExceptions'
import { WeekToolbar } from './ui/WeekToolbar'

type OpenDialog = 'add-booking' | 'block-time' | 'open-extra-time' | null

/**
 * The coach's Schedule (design/AdminSchedule.dc.html, AdminSchedulePhone.dc.html; the
 * Schedule spec): the week of ?day (today's by default) as a grid from 768 px and a day view
 * on phones, the week's blocked and extra time, and beside it (under it below 1280 px)
 * Today, Needs attention and Message all customers. Add booking, Block time, Open extra
 * time and the lesson details are dialogs; each change ends with a notice under the toolbar.
 * It pads itself as drawn: CoachLayout's main has no padding.
 */
export function CoachSchedulePage() {
  const schedule = useScheduleDay()
  const { day, weekStart, today } = schedule
  const week = useCoachWeek(weekStart)
  const notice = useNotice()
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const [lesson, setLesson] = useState<BookedCoachLesson | null>(null)

  // The next action clears the last notice (the Schedule spec §3.9).
  const act = <T extends unknown[]>(action: (...args: T) => void) => {
    return (...args: T) => {
      notice.clear()
      action(...args)
    }
  }
  const closeDialog = () => setDialog(null)
  // Saved: show the first day's week, and say what happened.
  const saved = ({ firstDate, notice: text }: { firstDate: DateKey; notice: string }) => {
    setDialog(null)
    schedule.selectDay(firstDate)
    notice.show(text)
  }

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <DocumentTitle page="Schedule" />
      <div className="flex min-w-0 flex-col gap-4 px-5 py-6 md:p-8 xl:flex-1 xl:pb-7">
        <ScheduleHeader
          onBlockTime={act(() => setDialog('block-time'))}
          onOpenExtraTime={act(() => setDialog('open-extra-time'))}
          onAddBooking={act(() => setDialog('add-booking'))}
        />
        <WeekToolbar
          weekStart={weekStart}
          onPrevious={act(() => schedule.goToWeek(-1))}
          onNext={act(() => schedule.goToWeek(1))}
          onToday={act(schedule.goToToday)}
        />
        <ScheduleNotice state={notice} />
        <ScheduleWeek
          weekStart={weekStart}
          week={week}
          day={day}
          onSelectDay={act(schedule.selectDay)}
          onSelectLesson={act(setLesson)}
        />
        <WeekExceptions
          weekStart={weekStart}
          week={week.data}
          onRemoved={(text) => notice.show(text, { focus: true })}
        />
      </div>
      <ScheduleSideColumn today={today} onNotice={notice.show} />
      <AddBookingDialog
        open={dialog === 'add-booking'}
        onClose={closeDialog}
        defaultDate={day}
        onBooked={saved}
      />
      <BlockTimeDialog
        open={dialog === 'block-time'}
        onClose={closeDialog}
        defaultDate={day}
        onSaved={saved}
      />
      <OpenExtraTimeDialog
        open={dialog === 'open-extra-time'}
        onClose={closeDialog}
        defaultDate={day}
        onSaved={saved}
      />
      {lesson && (
        <LessonDetailsDialog
          key={lesson.booking_id}
          lesson={lesson}
          week={week.data}
          onClose={() => setLesson(null)}
          onDone={(text) => {
            setLesson(null)
            notice.show(text, { focus: true })
          }}
        />
      )}
    </div>
  )
}
