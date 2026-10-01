import { useEffect } from 'react'
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
import { addDays, type DateKey, mytDateKey, mytWeekStart } from '@/shared/lib/time'
import { PageHeader } from '@/shared/ui/PageHeader'
import { WeekNav } from '@/shared/ui/WeekNav'

import { WeekError } from './ui/WeekError'

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

/**
 * The week to show (customer-schedule §1): the Monday of ?week=YYYY-MM-DD, kept between this
 * week and the last week of the booking window. Anything that isn't a real date shows this
 * week. Until the window is known (settings loading or failed) only this week bounds it.
 */
function weekToShow(param: string | null, thisWeek: DateKey, lastWeek: DateKey | null): DateKey {
  let week = thisWeek
  if (param && DATE_KEY.test(param)) {
    try {
      week = mytWeekStart(param)
    } catch {
      // Not a real date ("2026-02-30"): this week.
    }
  }
  if (week < thisWeek) return thisWeek
  return lastWeek !== null && week > lastWeek ? lastWeek : week
}

/** The last week a customer may book: this week plus booking_window_weeks (TECH_SPEC §5.1). */
function lastWeekOf(today: DateKey, windowWeeks: number | undefined): DateKey | null {
  if (windowWeeks === undefined || !Number.isInteger(windowWeeks) || windowWeeks < 0) return null
  return bookableWindow(today, windowWeeks).lastWeek
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
  const lastWeek = lastWeekOf(today, settings.data?.booking_window_weeks)
  const param = params.get('week')
  const week = weekToShow(param, thisWeek, lastWeek)
  const busy = useCustomerWeek(week)
  const announcement = useLatestAnnouncement()

  // The week is in the address, so a refresh or a shared link keeps it. Replace: Back leaves
  // the page instead of stepping through weeks (customer-schedule Q3).
  const showWeek = (next: DateKey) =>
    setParams((current) => withWeek(current, next), { replace: true })

  // A missing, malformed or out-of-range ?week is written back as the week shown.
  useEffect(() => {
    if (param !== week) setParams((current) => withWeek(current, week), { replace: true })
  }, [param, week, setParams])

  return (
    <div className="flex max-w-[1100px] flex-col gap-3.5 md:gap-4.5">
      <DocumentTitle page="Schedule" />
      <PageHeader
        size="customer"
        title="Schedule"
        eyebrow="Your coach’s timetable"
        actions={
          <WeekNav
            stretch
            label={formatWeekLabel(week)}
            onPrevious={() => showWeek(addDays(week, -7))}
            onNext={() => showWeek(addDays(week, 7))}
            previousDisabled={week <= thisWeek}
            nextDisabled={lastWeek === null || week >= lastWeek}
          />
        }
      />
      {announcement.data && <CoachBanner message={announcement.data.message} />}
      <CustomerScheduleLegend />
      <CustomerWeekGrid
        weekStart={week}
        week={busy.data}
        // Days already past have nothing left to book: plain headers (§6.5, Q1).
        dayHref={(day) => (day < today ? undefined : `${ROUTES.book}?day=${day}`)}
        error={
          busy.isError ? (
            <WeekError
              error={busy.error}
              retrying={busy.isFetching}
              onRetry={() => void busy.refetch()}
            />
          ) : undefined
        }
      />
      <p className="mt-1 text-small leading-normal text-muted">
        Other students’ lessons show as Booked, without names. Tap a day to book it.
      </p>
    </div>
  )
}
