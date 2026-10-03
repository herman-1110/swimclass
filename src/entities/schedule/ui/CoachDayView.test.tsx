import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { parseCoachWeek } from '../model/parseWeek'
import type { CoachWeek } from '../model/types'
import { CoachDayView } from './CoachDayView'

// The coach's week of 28 Sep from the demo database: the phone drawing's week, Saturday
// 3 Oct chosen (design/AdminSchedulePhone.dc.html; coach-schedule §2.2).
let week: CoachWeek

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
  await logIn('herman', DEMO_PASSWORD)
  week = parseCoachWeek(await rpc('coach_week', { p_week_start: '2026-09-28' }), '2026-09-28')
}, 60_000)

afterEach(cleanup)

/** Each row of the day's list as its texts: time, title, line and any flags. */
function rows() {
  const list = screen.getByRole('list', { name: 'Saturday 3 Oct' })
  return within(list)
    .getAllByRole('listitem')
    .map((item) => [...item.querySelectorAll('span')].map((span) => span.textContent))
}

describe('CoachDayView', () => {
  it('shows the week as a strip of days with their number of lessons', () => {
    render(
      <CoachDayView
        weekStart="2026-09-28"
        week={week}
        day="2026-10-03"
        onSelectDay={() => {}}
        onSelectLesson={() => {}}
      />,
    )
    const strip = screen.getByRole('group', { name: 'Days' })
    const days = within(strip).getAllByRole('button')
    expect(days.map((day) => day.getAttribute('aria-label'))).toEqual([
      'Monday 28 Sep, 1 lesson',
      'Tuesday 29 Sep, 1 lesson',
      'Wednesday 30 Sep, 1 lesson',
      'Thursday 1 Oct, 2 lessons',
      'Friday 2 Oct, 2 lessons',
      'Saturday 3 Oct, 3 lessons',
      'Sunday 4 Oct, 4 lessons',
    ])
    expect(days[5].getAttribute('aria-pressed')).toBe('true')
    expect(days[5].textContent).toBe('Sat33 lessons')
    expect(screen.getByRole('heading', { level: 2, name: 'Saturday 3 Oct' })).toBeTruthy()
  })

  it('lists the chosen day as drawn: time, then the block', () => {
    render(
      <CoachDayView
        weekStart="2026-09-28"
        week={week}
        day="2026-10-03"
        onSelectDay={() => {}}
        onSelectLesson={() => {}}
      />,
    )
    expect(rows()).toEqual([
      ['7:00 am', 'Free', '7:00–8:00 am'],
      ['8:00 am', 'Travel', '8:00–9:00 am'],
      ['9:00 am', 'Aiman & Sofia', '9:00–10:00 am · 1-to-2 · Palm Court'],
      ['10:00 am', 'Travel', '10:00–11:00 am'],
      ['11:00 am', 'Adam, Alya & Amir', '11:00 am–12:00 pm · 1-to-3 · Maple Condo'],
      ['12:00 pm', 'Closed', '12:00–4:00 pm'],
      ['4:00 pm', 'Travel', '4:00–5:00 pm'],
      ['5:00 pm', 'Hana', '5:00–6:00 pm · Sunrise Res.', 'Unpaid'],
      ['6:00 pm', 'Travel', '6:00–7:00 pm'],
      ['7:00 pm', 'Free', '7:00–10:00 pm'],
    ])
  })

  it('makes each lesson a button named by its text that opens it', () => {
    const onSelectLesson = vi.fn()
    render(
      <CoachDayView
        weekStart="2026-09-28"
        week={week}
        day="2026-10-02"
        onSelectDay={() => {}}
        onSelectLesson={onSelectLesson}
      />,
    )
    const list = screen.getByRole('list', { name: 'Friday 2 Oct' })
    const lessons = within(list).getAllByRole('button')
    expect(lessons.map((button) => button.textContent)).toEqual([
      'Wei Jie 7:30–8:30 pm · Palm Court Unpaid',
      'Kai 9:00–10:00 pm · Palm Court Gap override',
    ])
    // Long names and places wrap inside the block, even inside a word (coach-schedule §6.7).
    expect(lessons[0].className).toContain('wrap-anywhere')
    fireEvent.click(
      screen.getByRole('button', { name: 'Kai 9:00–10:00 pm · Palm Court Gap override' }),
    )
    expect(onSelectLesson).toHaveBeenCalledWith(
      expect.objectContaining({ booking_id: 'd0000000-0000-4000-8000-000000000017' }),
    )
  })

  it('writes a 2-hour lesson and a last paid lesson as drawn', () => {
    render(
      <CoachDayView
        weekStart="2026-09-28"
        week={week}
        day="2026-10-04"
        onSelectDay={() => {}}
        onSelectLesson={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /^Chloe/ }).textContent).toBe(
      'Chloe 10:00 am–12:00 pm · Vista Heights · 2 lessons',
    )
    expect(screen.getByRole('button', { name: /^Sofia/ }).textContent).toBe(
      'Sofia 5:00–6:00 pm · Palm Court Last paid lesson',
    )
  })

  it('picks another day from the strip', () => {
    const onSelectDay = vi.fn()
    render(
      <CoachDayView
        weekStart="2026-09-28"
        week={week}
        day="2026-10-03"
        onSelectDay={onSelectDay}
        onSelectLesson={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Thursday 1 Oct, 2 lessons' }))
    expect(onSelectDay).toHaveBeenCalledWith('2026-10-01')
  })

  it('shows placeholders, never the last week’s lessons, while the next week loads', () => {
    render(
      <CoachDayView
        weekStart="2026-10-05"
        week={week}
        day="2026-10-10"
        onSelectDay={() => {}}
        onSelectLesson={() => {}}
      />,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Saturday 10 Oct' })).toBeTruthy()
    // The last week (28 Sep) is still the query's data, but none of it shows under 10 Oct.
    expect(screen.queryByRole('list', { name: 'Saturday 10 Oct' })).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Loading the week')
    expect(screen.queryByText(/Kiara Park|Palm Court|Vista Heights/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Saturday 10 Oct' })).toBeTruthy()
  })

  it('shows a loading list until the week arrives, then the page’s error if it fails', () => {
    const { rerender } = render(
      <CoachDayView
        weekStart="2026-09-28"
        week={undefined}
        day="2026-10-03"
        onSelectDay={() => {}}
        onSelectLesson={() => {}}
      />,
    )
    const status = screen.getByRole('status')
    expect(status.textContent).toBe('Loading the week')
    // About a typical day's height (seven 44 px rows), so the page below moves little.
    expect(status.parentElement?.querySelectorAll('.h-11')).toHaveLength(7)
    expect(screen.getByRole('button', { name: 'Saturday 3 Oct' })).toBeTruthy()
    rerender(
      <CoachDayView
        weekStart="2026-09-28"
        week={undefined}
        day="2026-10-03"
        onSelectDay={() => {}}
        onSelectLesson={() => {}}
        error={<p role="alert">Couldn’t reach the server.</p>}
      />,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })
})
