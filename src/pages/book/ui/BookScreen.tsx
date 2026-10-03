import { useId } from 'react'

import { bookPackageNote, type GroupBalance, PackageSummary } from '@/entities/balance'
import { useUpcomingLessons } from '@/entities/booking'
import { type Group, GroupPicker } from '@/entities/group'
import { useCoachHoursOnDay, useOwnLessonsOnDay } from '@/entities/schedule'
import { packagePriceCents, type PublicSettings } from '@/entities/settings'
import { freeCountByDay } from '@/entities/slot'
import { BookingSummary } from '@/features/book-lesson'
import { formatMinutes } from '@/shared/lib/format'
import { Card } from '@/shared/ui/Card'
import { Segmented } from '@/shared/ui/Segmented'

import { alreadyBookedText } from '../model/alreadyBooked'
import { coachAwayText } from '../model/coachAway'
import { useBookSelection } from '../model/useBookSelection'
import { AREA, BOOK_GRID } from './bookGrid'
import { DaySection } from './DaySection'
import { StartTimesSection } from './StartTimesSection'

type BookScreenProps = {
  settings: PublicSettings
  /** The account's groups, paused ones too (they name past lessons); at least one active. */
  groups: readonly Group[]
  /** The account's package balances, one per group. */
  balances: readonly GroupBalance[]
}

/**
 * Book once the settings, groups and balances are in (DESIGN §4 items 2–7): who the lesson
 * is for, its package, the day, the length, the start times and the booking summary, in
 * the drawing's order, which is also the order keyboard focus takes (book spec §7.1).
 */
export function BookScreen({ settings, groups, balances }: BookScreenProps) {
  const book = useBookSelection(settings, groups)
  const startTimesId = useId()
  const own = useOwnLessonsOnDay(book.weekStart, book.day ?? book.weekStart)
  // The same week_busy query: the day's blocked time, for "Your coach isn’t available …".
  const hours = useCoachHoursOnDay(book.weekStart, book.day ?? book.weekStart)
  // Every group's, as My classes reads them (one request for them all, so changing the group
  // reads nothing): the summary places the new lesson among its group's by start time.
  const upcoming = useUpcomingLessons(groups.map((row) => row.group_id))
  const group = book.group
  const balance = group && balances.find((row) => row.group_id === group.group_id)
  if (!group || !balance) return null

  const focusStartTimes = () => document.getElementById(startTimesId)?.focus()

  return (
    <div className={BOOK_GRID}>
      <GroupPicker
        groups={book.activeGroups}
        value={group.group_id}
        onChange={book.selectGroup}
        className={AREA.group}
      />
      <Card framedFrom="md" className={AREA.package}>
        <PackageSummary
          balance={balance}
          typeLabel={group.type_label}
          note={bookPackageNote(balance, packagePriceCents(settings, group.size))}
        />
      </Card>
      <DaySection
        weekStart={book.weekStart}
        selected={book.day}
        today={book.today}
        counts={book.slots.data ? freeCountByDay(book.slots.data) : null}
        bookable={book.bookable}
        onSelect={book.selectDay}
        onMoveWeek={book.moveWeek}
        className={AREA.day}
      />
      {book.lengths.length > 1 && (
        <Segmented
          name="book-length"
          legend="Lesson length"
          hideLegend
          options={book.lengths.map((length) => ({
            value: String(length),
            label: formatMinutes(length),
          }))}
          value={String(book.minutes)}
          onChange={(value) => book.selectLength(Number(value))}
          maxWidth="narrow"
          className={AREA.length}
        />
      )}
      <StartTimesSection
        headingId={startTimesId}
        day={book.day}
        weekStart={book.weekStart}
        // The chips wait for the day's own lessons too, so "Already booked this day" never
        // pushes them down after they show (book spec §6.1: the layout stays stable).
        daySlots={own.isPending ? null : book.daySlots}
        failure={
          // A failed refresh keeps the chips already shown; only a week that never loaded fails.
          book.slots.isLoadingError
            ? {
                error: book.slots.error,
                retry: () => {
                  // "Try again" goes while the week loads again: focus waits on the heading.
                  focusStartTimes()
                  void book.slots.refetch()
                },
              }
            : null
        }
        selected={book.picked?.starts_at ?? null}
        onSelect={book.selectTime}
        alreadyBooked={book.day && own.data ? alreadyBookedText(own.data, groups) : null}
        coachAway={book.day && hours.data ? coachAwayText(hours.data) : null}
        className={AREA.times}
      />
      <BookingSummary
        group={group}
        balance={balance}
        upcoming={upcoming.data}
        settings={settings}
        day={book.day}
        slot={book.picked}
        time={book.askedTime}
        minutes={book.minutes}
        lastBookableDay={book.bookable.lastBookableDay}
        onBooked={book.clearTime}
        onBookAnother={focusStartTimes}
        className={AREA.summary}
      />
    </div>
  )
}
