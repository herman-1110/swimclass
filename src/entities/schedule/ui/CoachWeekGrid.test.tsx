import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { parseCoachWeek } from '../model/parseWeek'
import type { CoachWeek } from '../model/types'
import { CoachWeekGrid } from './CoachWeekGrid'

// The coach's week of 28 Sep from the demo database: the drawing's week (coach-schedule §8.2).
let week: CoachWeek

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
  await logIn('herman', DEMO_PASSWORD)
  week = parseCoachWeek(await rpc('coach_week', { p_week_start: '2026-09-28' }), '2026-09-28')
}, 60_000)

afterEach(cleanup)

describe('CoachWeekGrid', () => {
  it('is a region named by its week, with one list per day named by its lessons', () => {
    render(<CoachWeekGrid weekStart="2026-09-28" week={week} onSelectLesson={() => {}} />)
    const region = screen.getByRole('region', { name: 'Week of 28 Sep – 4 Oct 2026' })
    expect(region.getAttribute('aria-busy')).toBeNull()
    expect(
      within(region)
        .getAllByRole('list')
        .map((list) => list.getAttribute('aria-label')),
    ).toEqual([
      'Monday 28 Sep, 1 lesson',
      'Tuesday 29 Sep, 1 lesson',
      'Wednesday 30 Sep, 1 lesson',
      'Thursday 1 Oct, 2 lessons',
      'Friday 2 Oct, 2 lessons',
      'Saturday 3 Oct, 3 lessons',
      'Sunday 4 Oct, 4 lessons',
    ])
    expect(screen.getByRole('heading', { level: 2, name: 'Week timetable' })).toBeTruthy()
  })

  it('reads each day’s open hours before its lessons', () => {
    render(<CoachWeekGrid weekStart="2026-09-28" week={week} onSelectLesson={() => {}} />)
    const saturday = screen.getByRole('list', { name: 'Saturday 3 Oct, 3 lessons' })
    expect(within(saturday).getAllByRole('listitem')[0].textContent).toBe(
      'Open 7:00 am–12:00 pm and 4:00–10:00 pm.',
    )
    const monday = screen.getByRole('list', { name: 'Monday 28 Sep, 1 lesson' })
    expect(within(monday).getAllByRole('listitem')[0].textContent).toBe('Open 5:30–10:00 pm.')
  })

  it('makes every booked lesson a button named by what it shows, then the rest', () => {
    render(<CoachWeekGrid weekStart="2026-09-28" week={week} onSelectLesson={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(14)
    for (const name of [
      'Jun Hao, 7:30–8:30 pm, Vista Heights, Mon 28 Sep',
      'Priya, 5:30–6:30 pm, Seri Maya, Thu 1 Oct, last paid lesson',
      'Wei Jie, 7:30–8:30 pm, Palm Court, Fri 2 Oct, unpaid',
      'Kai, 9:00–10:00 pm, Gap override, Palm Court, Fri 2 Oct',
      'Aiman & Sofia, 9:00–10:00 am, 1-to-2 · Palm Court, Sat 3 Oct',
      'Adam, Alya & Amir, 11 am–12 pm, 1-to-3 · Maple Condo, Sat 3 Oct',
      'Hana, 5:00–6:00 pm, Sunrise Res., Sat 3 Oct, unpaid',
      'Chloe, 10 am–12 pm, Vista Heights, 2 lessons, Sun 4 Oct',
    ]) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
  })

  it('reads each name from one hidden line, the drawn lines hidden from screen readers', () => {
    render(<CoachWeekGrid weekStart="2026-09-28" week={week} onSelectLesson={() => {}} />)
    const weiJie = screen.getByRole('button', { name: /^Wei Jie,/ })
    // One line for screen readers, so no comma sits apart ("Wei Jie , 7:30–8:30 pm") or at
    // the end of a cut-off line, beyond the block (coach-schedule §7.2).
    const spoken = [...weiJie.querySelectorAll('.sr-only')].map((span) => span.textContent)
    expect(spoken).toEqual(['Wei Jie, 7:30–8:30 pm, Palm Court, Fri 2 Oct, unpaid'])
    const drawn = [...weiJie.children].filter((child) => !child.classList.contains('sr-only'))
    expect(drawn.map((line) => line.textContent)).toEqual(['Wei Jie', '7:30–8:30 pm', 'Palm Court'])
    expect(drawn.every((line) => line.getAttribute('aria-hidden') === 'true')).toBe(true)
  })

  it('shows the drawn lines: "Gap override" in place of Kai’s place, "2 lessons" for Chloe', () => {
    render(<CoachWeekGrid weekStart="2026-09-28" week={week} onSelectLesson={() => {}} />)
    const kai = screen.getByRole('button', { name: /^Kai,/ })
    expect(within(kai).getByText('Gap override').className).toContain('text-travel')
    const chloe = screen.getByRole('button', { name: /^Chloe,/ })
    expect(within(chloe).getByText('2 lessons')).toBeTruthy()
    // Sunday 10 am–12 pm: 6 half-hour rows below 7 am, 4 rows tall.
    expect(chloe.parentElement?.getAttribute('style')).toContain('top: calc(6 * var(--row) + 1px)')
    expect(chloe.parentElement?.getAttribute('style')).toContain('calc(4 * var(--row) - 2px)')
  })

  it('hands the chosen lesson to onSelectLesson', () => {
    const onSelectLesson = vi.fn()
    render(<CoachWeekGrid weekStart="2026-09-28" week={week} onSelectLesson={onSelectLesson} />)
    fireEvent.click(screen.getByRole('button', { name: /^Hana,/ }))
    expect(onSelectLesson).toHaveBeenCalledWith(
      expect.objectContaining({ booking_id: 'd0000000-0000-4000-8000-000000000005' }),
    )
  })

  it('labels the hours from 7 am to 9 pm', () => {
    render(<CoachWeekGrid weekStart="2026-09-28" week={week} onSelectLesson={() => {}} />)
    expect(screen.getByText('7 am')).toBeTruthy()
    expect(screen.getByText('9 pm')).toBeTruthy()
  })

  it('keeps the last week on screen, dimmed and busy, with nothing to click, while the next loads', () => {
    const { container } = render(
      <CoachWeekGrid weekStart="2026-10-05" week={week} onSelectLesson={() => {}} />,
    )
    const region = screen.getByRole('region', { name: 'Week of 5–11 Oct 2026' })
    expect(region.getAttribute('aria-busy')).toBe('true')
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByRole('list', { name: 'Monday 5 Oct' })).toBeTruthy()
    expect(container.firstElementChild?.className).toContain('opacity-60')
  })

  it('shows a loading look until the first week arrives, then the page’s error if it fails', () => {
    const { rerender } = render(
      <CoachWeekGrid weekStart="2026-09-28" week={undefined} onSelectLesson={() => {}} />,
    )
    expect(screen.getByRole('status').textContent).toBe('Loading the week')
    expect(screen.getByRole('region').getAttribute('aria-busy')).toBe('true')
    rerender(
      <CoachWeekGrid
        weekStart="2026-09-28"
        week={undefined}
        onSelectLesson={() => {}}
        error={<p role="alert">Couldn’t reach the server.</p>}
      />,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })
})
