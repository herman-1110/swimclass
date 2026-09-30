import { cleanup, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { parseCustomerWeek } from '../model/parseWeek'
import type { CustomerWeek } from '../model/types'
import { CustomerWeekGrid } from './CustomerWeekGrid'

// meiling's week of 28 Sep from the demo database: the drawing's week (customer-schedule §8.2).
let week: CustomerWeek

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
  await logIn('meiling', DEMO_PASSWORD)
  week = parseCustomerWeek(await rpc('week_busy', { p_week_start: '2026-09-28' }), '2026-09-28')
}, 60_000)

afterEach(cleanup)

const PICTURE =
  'Week timetable showing free, booked, travel and closed times. The Book tab lists every free start time.'

const toBook = (day: string) => `/book?day=${day}`

function renderGrid(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>)
}

describe('CustomerWeekGrid', () => {
  it('draws the week as one picture, with the week in words after it', () => {
    renderGrid(<CustomerWeekGrid weekStart="2026-09-28" week={week} dayHref={toBook} />)
    expect(screen.getByRole('img', { name: PICTURE }).getAttribute('aria-busy')).toBeNull()
    const text = screen.getByRole('list', { name: 'Free times and your lessons, 28 Sep – 4 Oct' })
    expect(
      within(text)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Mon 28 Sep: free 5:30 pm to 6:30 pm, free 9:30 pm to 10:00 pm',
      'Tue 29 Sep: free 7:30 pm to 10:00 pm',
      'Wed 30 Sep: free 5:30 pm to 7:30 pm',
      'Thu 1 Oct: no free time',
      'Fri 2 Oct: free 5:30 pm to 6:30 pm, free 8:30 pm to 9:00 pm',
      'Sat 3 Oct: free 7:00 am to 8:00 am, your lesson 9:00 am to 10:00 am, free 7:00 pm to 10:00 pm',
      'Sun 4 Oct: your lesson 5:00 pm to 6:00 pm, free 9:00 pm to 10:00 pm',
    ])
  })

  it('links each day header to Book on that day', () => {
    renderGrid(<CustomerWeekGrid weekStart="2026-09-28" week={week} dayHref={toBook} />)
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Book on Mon 28 Sep',
      'Book on Tue 29 Sep',
      'Book on Wed 30 Sep',
      'Book on Thu 1 Oct',
      'Book on Fri 2 Oct',
      'Book on Sat 3 Oct',
      'Book on Sun 4 Oct',
    ])
    expect(screen.getByRole('link', { name: 'Book on Thu 1 Oct' }).getAttribute('href')).toBe(
      '/book?day=2026-10-01',
    )
    expect(links[0].textContent).toBe('Mon 28')
  })

  it('shows the days the page leaves without a link as plain text', () => {
    renderGrid(
      <CustomerWeekGrid
        weekStart="2026-09-28"
        week={week}
        dayHref={(day) => (day < '2026-10-03' ? undefined : toBook(day))}
      />,
    )
    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.getByText('Fri')).toBeTruthy()
  })

  it('draws two "You" blocks, the other twelve lessons as Booked, travel and closed time', () => {
    const { container } = renderGrid(
      <CustomerWeekGrid weekStart="2026-09-28" week={week} dayHref={toBook} />,
    )
    const you = screen.getAllByText('You')
    expect(you).toHaveLength(2)
    // Saturday 9:00–10:00 am: 4 half-hour rows below 7 am, 2 rows tall, inset 1 px.
    expect(you[0].getAttribute('style')).toContain('top: calc(4 * var(--row) + 1px)')
    expect(you[0].getAttribute('style')).toContain('height: max(1px, calc(2 * var(--row) - 2px))')
    expect(container.querySelectorAll('.bg-booked-other')).toHaveLength(12)
    expect(container.querySelectorAll('.bg-travel')).toHaveLength(17)
    expect(container.querySelectorAll('.bg-closed')).toHaveLength(7)
  })

  it('labels the hours from 7am to 9pm', () => {
    renderGrid(<CustomerWeekGrid weekStart="2026-09-28" week={week} dayHref={toBook} />)
    expect(screen.getByText('7am')).toBeTruthy()
    expect(screen.getByText('12pm')).toBeTruthy()
    expect(screen.getByText('9pm')).toBeTruthy()
    expect(screen.queryByText('10pm')).toBeNull()
  })

  it('shows the dates and a loading look until the week arrives', () => {
    renderGrid(<CustomerWeekGrid weekStart="2026-10-05" week={undefined} dayHref={toBook} />)
    expect(screen.getByRole('status').textContent).toBe('Loading the timetable')
    expect(screen.getByRole('img', { name: PICTURE }).getAttribute('aria-busy')).toBe('true')
    expect(screen.getByRole('link', { name: 'Book on Sun 11 Oct' })).toBeTruthy()
    expect(screen.queryByRole('list', { name: /Free times/ })).toBeNull()
  })

  it('never draws a week under another week’s dates', () => {
    renderGrid(<CustomerWeekGrid weekStart="2026-10-05" week={week} dayHref={toBook} />)
    expect(screen.queryByText('You')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Loading the timetable')
  })

  it('shows the page’s error over the columns instead of the loading look', () => {
    renderGrid(
      <CustomerWeekGrid
        weekStart="2026-09-28"
        week={undefined}
        dayHref={toBook}
        error={<p role="alert">Something went wrong.</p>}
      />,
    )
    expect(screen.getByRole('alert').textContent).toBe('Something went wrong.')
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('img', { name: PICTURE }).getAttribute('aria-busy')).toBeNull()
  })
})
