import type { UseQueryResult } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'

import type { Group } from '@/entities/group'
import type { PublicSettings } from '@/entities/settings'
import { bookableWindow, type Slot, slotsOfDay, startTimeKey, useWeekSlots } from '@/entities/slot'
import { useNow } from '@/shared/lib/hooks/useNow'
import { addDays, type DateKey, mytDateKey, mytWeekStart } from '@/shared/lib/time'

import { defaultDay, needsNextWeek, type WeekProbe } from './defaults'
import {
  type BookChoice,
  bookSearch,
  chooseGroup,
  chooseLength,
  dayInOtherWeek,
  isBookableDay,
  lessonLengths,
  readBookParams,
} from './params'

function probe(query: UseQueryResult<Slot[]>): WeekProbe {
  if (query.data) return query.data
  return query.isError ? 'error' : 'pending'
}

/**
 * The Book screen's choices, read from the address with silent fallbacks (book spec §1.4,
 * §1.5): the group, length, day and week, the day's start times and the picked one. Every
 * change writes the whole choice back with replace (Back leaves /book in one step) and
 * keeps the scroll position; the opening defaults stay out of the address until the first
 * change. `group` is null only when the account has no active group (then nothing is read).
 */
export function useBookSelection(settings: PublicSettings, groups: readonly Group[]) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const today = mytDateKey(useNow())
  const bookable = bookableWindow(today, settings.booking_window_weeks)
  const asked = readBookParams(params)
  const active = groups.filter((group) => group.active)
  const group = chooseGroup(asked.group, active) ?? null
  const groupId = group?.group_id ?? null
  const lengths = lessonLengths(settings.lesson_lengths)
  const minutes = chooseLength(asked.length, lengths)
  const askedDay =
    asked.day !== null && isBookableDay(asked.day, today, bookable.lastBookableDay)
      ? asked.day
      : null

  // The opening day (book spec §1.5) needs this week's start times, and next week's when
  // this week has nothing left. They are the same queries the screen then shows.
  const nextWeek = addDays(bookable.thisWeek, 7)
  const thisWeekSlots = useWeekSlots(askedDay ? null : bookable.thisWeek, minutes, groupId)
  const goNext = !askedDay && needsNextWeek(probe(thisWeekSlots), nextWeek, bookable.lastWeek)
  const nextWeekSlots = useWeekSlots(goNext ? nextWeek : null, minutes, groupId)
  const opening = defaultDay({
    today,
    thisWeek: bookable.thisWeek,
    lastWeek: bookable.lastWeek,
    thisWeekSlots: probe(thisWeekSlots),
    nextWeekSlots: goNext ? probe(nextWeekSlots) : 'pending',
  })
  const day = askedDay ?? opening.day
  const weekStart = askedDay ? mytWeekStart(askedDay) : opening.weekStart

  const slots = useWeekSlots(weekStart, minutes, groupId)
  const daySlots = day !== null && slots.data ? slotsOfDay(slots.data, day) : null
  const picked =
    asked.time === null || daySlots === null
      ? null
      : (daySlots.find((slot) => startTimeKey(slot) === asked.time) ?? null)
  // The time a group change keeps: the picked one, or the asked one while the times load.
  const time = picked ? asked.time : slots.data ? null : asked.time

  const write = (change: Partial<BookChoice>) => {
    if (groupId === null) return
    const choice = { group: groupId, day, length: minutes, time, ...change }
    void navigate({ search: bookSearch(choice) }, { replace: true, preventScrollReset: true })
  }
  // A week move starts from the chosen day, or the first day shown while it is worked out.
  const from = day ?? (weekStart > today ? weekStart : today)

  return {
    today,
    bookable,
    activeGroups: active,
    group,
    lengths,
    minutes,
    day,
    weekStart,
    slots,
    daySlots,
    picked,
    /** A group keeps the day and the picked time (design/Main.dc.html:269). */
    selectGroup: (id: string) => write({ group: id }),
    /** A day, a week or a length clears the picked time (book spec §6.6). */
    selectDay: (key: DateKey) => write({ day: key, time: null }),
    moveWeek: (weeks: number) =>
      write({ day: dayInOtherWeek(from, weeks, today, bookable.lastBookableDay), time: null }),
    selectLength: (length: number) => write({ length, time: null }),
    selectTime: (slot: Slot) => write({ time: startTimeKey(slot) }),
    /** After booking: the booked time is no longer a choice. */
    clearTime: () => write({ time: null }),
  }
}
