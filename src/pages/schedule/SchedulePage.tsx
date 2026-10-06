import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'

import { CoachBanner, useLatestAnnouncement } from '@/entities/announcement'
import {
  CustomerScheduleLegend,
  CustomerWeekGrid,
  formatWeekLabel,
  useCustomerWeek,
} from '@/entities/schedule'
import { DocumentTitle, usePublicSettings } from '@/entities/settings'
import { bookableWindow } from '@/entities/slot'
import { ROUTES } from '@/shared/config/routes'
import { useNow } from '@/shared/lib/hooks/useNow'
import { useReadFailure } from '@/shared/lib/hooks/useReadFailure'
import { addDays, type DateKey, mytDateKey, mytWeekStart, parseDateKey } from '@/shared/lib/time'
import { PageHeader } from '@/shared/ui/PageHeader'
import { WeekNav } from '@/shared/ui/WeekNav'

import { WeekError } from './ui/WeekError'

/** ?week=YYYY-MM-DD as its Monday, never before this week; this week if missing or not a
 *  real date (customer-schedule §1). */
function askedWeek(param: string | null, thisWeek: DateKey): DateKey {
  const day = parseDateKey(param)
  if (day === null) return thisWeek
  const week = mytWeekStart(day)
  return week < thisWeek ? thisWeek : week
}

/** The last week a customer may book (TECH_SPEC §5.1); undefined while the settings load.
 *  Without them only this week is known to be bookable, and Next stays disabled (§6.4). */
function lastWeekOf(today: DateKey, windowWeeks: number | undefined, failed: boolean) {
  if (windowWeeks !== undefined && Number.isInteger(windowWeeks) && windowWeeks >= 0) {
    return bookableWindow(today, windowWeeks).lastWeek
  }
  return windowWeeks !== undefined || failed ? mytWeekStart(today) : undefined
}

/** The week asked for, kept within the window (§1); null while a later one waits for it:
 *  nothing is read, linked or written back for it until then. */
function weekToShow(asked: DateKey, thisWeek: DateKey, lastWeek: DateKey | undefined) {
  if (asked === thisWeek) return thisWeek
  if (lastWeek === undefined) return null
  return asked > lastWeek ? lastWeek : asked
}

/** The address's search with ?week set, the rest kept. */
function withWeek(search: URLSearchParams, week: DateKey): URLSearchParams {
  const next = new URLSearchParams(search)
  next.set('week', week)
  return next
}

/**
 * The coach's timetable as a customer sees it (design/Schedule.dc.html, ScheduleDesktop;
 * customer-schedule spec): a week at a time within the booking window, other people's
 * lessons as Booked without names, the viewer's own as You, and each day's header opening
 * Book on that day. Read-only: nothing here changes data.
 */
export function SchedulePage() {
  const [params, setParams] = useSearchParams()
  // useNow moves on while the page stays open, so "this week" follows the calendar.
  const today = mytDateKey(useNow())
  const settings = usePublicSettings()
  const thisWeek = mytWeekStart(today)
  const lastWeek = lastWeekOf(today, settings.data?.booking_window_weeks, settings.isError)
  const param = params.get('week')
  const asked = askedWeek(param, thisWeek)
  const week = weekToShow(asked, thisWeek, lastWeek)
  const busy = useCustomerWeek(week)
  const announcement = useLatestAnnouncement()
  // After "Try again" brings the week, focus goes to it rather than to the page.
  const weekRef = useRef<HTMLDivElement>(null)
  const failure = useReadFailure([busy], () => weekRef.current)

  // The week is in the address, so a refresh or a shared link keeps it. Replace: Back leaves
  // the page instead of stepping through weeks (customer-schedule Q3).
  const step = (days: number) => {
    if (week === null) return
    setParams((current) => withWeek(current, addDays(week, days)), { replace: true })
  }

  // A missing, malformed or out-of-range ?week is written back as the week shown.
  useEffect(() => {
    if (week !== null && param !== week) {
      setParams((current) => withWeek(current, week), { replace: true })
    }
  }, [param, week, setParams])

  return (
    // Stops at 1100 px, in the middle of the space beside the sidebar (DESIGN §5).
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3.5 md:gap-4.5">
      <DocumentTitle page="Schedule" />
      <PageHeader
        size="customer"
        title="Schedule"
        eyebrow="Your coach’s timetable"
        actions={
          <WeekNav
            stretch
            // No label while a later week waits for the window: it may not be the one shown.
            label={week === null ? '' : formatWeekLabel(week)}
            onPrevious={() => step(-7)}
            onNext={() => step(7)}
            previousDisabled={week === null || week <= thisWeek}
            nextDisabled={lastWeek === undefined || week === null || week >= lastWeek}
          />
        }
      />
      {announcement.data && <CoachBanner message={announcement.data.message} />}
      <CustomerScheduleLegend />
      <div ref={weekRef} tabIndex={-1}>
        <CustomerWeekGrid
          weekStart={week ?? asked}
          week={busy.data}
          // Past days, and the days of a week waiting for the window: plain headers (§6.5, Q1).
          dayHref={(day) =>
            week === null || day < today ? undefined : `${ROUTES.book}?day=${day}`
          }
          error={failure && <WeekError failure={failure} />}
        />
      </div>
      <p className="mt-1 text-small leading-normal text-muted">
        Other students’ lessons show as Booked, without names. Tap a day to book it.
      </p>
    </div>
  )
}
