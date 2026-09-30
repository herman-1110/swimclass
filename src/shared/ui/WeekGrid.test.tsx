import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WeekGrid, type WeekGridBlock, type WeekGridDay } from './WeekGrid'

afterEach(cleanup)

const dates = ['28', '29', '30', '1', '2', '3', '4']
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function week(extra: (index: number) => Partial<WeekGridDay> = () => ({})): WeekGridDay[] {
  return weekdays.map((weekday, index) => ({
    key: `day-${index}`,
    weekday,
    date: dates[index],
    label: `Book on ${weekday} ${dates[index]}`,
    ...extra(index),
  }))
}

/** "7am", "12pm" (the customer drawing's hour labels). */
function hourLabel(minute: number) {
  const hour = minute / 60
  return `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 || hour === 24 ? 'am' : 'pm'}`
}

function renderGrid(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>)
}

const PICTURE = 'Week timetable showing free, booked, travel and closed times.'

describe('WeekGrid, the customer picture', () => {
  it('is one image with its description, the text alternative after it', () => {
    renderGrid(
      <WeekGrid
        size="compact"
        days={week()}
        blocks={[]}
        hourLabel={hourLabel}
        label={PICTURE}
        summary={<ul aria-label="Free times and your lessons">{<li>Tue 29 Sep: free</li>}</ul>}
      />,
    )
    expect(screen.getByRole('img', { name: PICTURE })).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Free times and your lessons' })).toBeTruthy()
  })

  it('links each day header to its page, or shows plain text', () => {
    renderGrid(
      <WeekGrid
        size="compact"
        days={week((index) => (index === 0 ? {} : { to: `/book?day=2026-09-${28 + index}` }))}
        blocks={[]}
        hourLabel={hourLabel}
        label={PICTURE}
      />,
    )
    const tuesday = screen.getByRole('link', { name: 'Book on Tue 29' })
    expect(tuesday.getAttribute('href')).toBe('/book?day=2026-09-29')
    expect(screen.queryByRole('link', { name: 'Book on Mon 28' })).toBeNull()
    expect(screen.getAllByRole('link')).toHaveLength(6)
  })

  it('labels each hour line from the first hour to the last but one', () => {
    const { rerender } = renderGrid(
      <WeekGrid size="compact" days={week()} blocks={[]} hourLabel={hourLabel} label={PICTURE} />,
    )
    expect(screen.getByText('7am')).toBeTruthy()
    expect(screen.getByText('9pm')).toBeTruthy()
    expect(screen.queryByText('10pm')).toBeNull()
    rerender(
      <MemoryRouter>
        <WeekGrid
          size="compact"
          days={week()}
          blocks={[]}
          from={360}
          to={1380}
          hourLabel={hourLabel}
          label={PICTURE}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('6am')).toBeTruthy()
    expect(screen.getByText('10pm')).toBeTruthy()
  })

  it('places blocks at their minutes, with their content, and leaves out what is outside', () => {
    const blocks: WeekGridBlock[] = [
      { key: 'mine', column: 5, start: 540, end: 600, tone: 'accent', content: 'You' },
      { key: 'early', column: 0, start: 300, end: 360, tone: 'closed', content: 'Too early' },
    ]
    renderGrid(
      <WeekGrid
        size="compact"
        days={week()}
        blocks={blocks}
        hourLabel={hourLabel}
        label={PICTURE}
      />,
    )
    const you = screen.getByText('You')
    expect(you.style.top).toBe('calc(4 * var(--row) + 1px)')
    expect(you.style.height).toBe('max(1px, calc(2 * var(--row) - 2px))')
    expect(screen.queryByText('Too early')).toBeNull()
  })

  it('puts the overlay beside the picture, where its alert and button are read out', () => {
    const { rerender } = renderGrid(
      <WeekGrid
        size="compact"
        days={week()}
        blocks={[]}
        hourLabel={hourLabel}
        label={PICTURE}
        overlay={
          <div>
            <p role="alert">Couldn’t reach the server. Check your connection and try again.</p>
            <button type="button">Try again</button>
          </div>
        }
      />,
    )
    // An image's children are presentational: nothing the overlay says may sit inside it.
    const picture = screen.getByRole('img', { name: PICTURE })
    expect(picture.contains(screen.getByRole('alert'))).toBe(false)
    expect(picture.contains(screen.getByRole('button', { name: 'Try again' }))).toBe(false)
    expect(picture.hasAttribute('aria-busy')).toBe(false)

    rerender(
      <MemoryRouter>
        <WeekGrid
          size="compact"
          days={week()}
          blocks={[]}
          hourLabel={hourLabel}
          label={PICTURE}
          busy
          overlay={<p role="status">Loading the timetable</p>}
        />
      </MemoryRouter>,
    )
    const loading = screen.getByRole('img', { name: PICTURE })
    expect(loading.getAttribute('aria-busy')).toBe('true')
    expect(loading.contains(screen.getByRole('status'))).toBe(false)
  })
})

describe('WeekGrid, the coach’s interactive grid', () => {
  const coachDays = week((index) => ({
    label: `${fullDays[index]} ${dates[index]}, ${index === 5 ? '1 lesson' : '0 lessons'}`,
    summary: index === 5 ? 'Open 7:00 am–12:00 pm and 4:00–10:00 pm.' : 'Open 5:30–10:00 pm.',
  }))

  it('is a region of day lists with lesson buttons; travel and closed blocks are hidden', () => {
    const open = vi.fn()
    renderGrid(
      <WeekGrid
        size="comfortable"
        interactive
        days={coachDays}
        blocks={[
          { key: 'travel', column: 5, start: 480, end: 540, tone: 'travel' },
          {
            key: 'lesson',
            column: 5,
            start: 540,
            end: 600,
            tone: 'accent',
            content: (
              <>
                <span>Aiman &amp; Sofia</span>
                <span>9:00–10:00 am</span>
              </>
            ),
            onSelect: open,
          },
          { key: 'closed', column: 5, start: 720, end: 960, tone: 'closed' },
        ]}
        hourLabel={(minute) => `${minute / 60}`}
        label="Week of 28 Sep – 4 Oct 2026"
      />,
    )
    const region = screen.getByRole('region', { name: 'Week of 28 Sep – 4 Oct 2026' })
    expect(within(region).queryByRole('img')).toBeNull()
    const saturday = within(region).getByRole('list', { name: 'Saturday 3, 1 lesson' })
    // The day's summary, then the one lesson; travel and closed are aria-hidden.
    const items = within(saturday).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toBe('Open 7:00 am–12:00 pm and 4:00–10:00 pm.')
    const lesson = within(saturday).getByRole('button', { name: 'Aiman & Sofia9:00–10:00 am' })
    fireEvent.click(lesson)
    expect(open).toHaveBeenCalledTimes(1)
    expect(lesson.parentElement?.style.top).toBe('calc(4 * var(--row) + 1px)')
  })

  it('puts lessons over travel and closed time, in start order', () => {
    renderGrid(
      <WeekGrid
        size="comfortable"
        interactive
        days={coachDays}
        blocks={[
          {
            key: 'late',
            column: 0,
            start: 1260,
            end: 1320,
            tone: 'accent',
            content: 'Late',
            onSelect: () => {},
          },
          { key: 'closed', column: 0, start: 420, end: 1320, tone: 'closed' },
          {
            key: 'early',
            column: 0,
            start: 900,
            end: 960,
            tone: 'accent',
            content: 'Early',
            onSelect: () => {},
          },
        ]}
        hourLabel={(minute) => `${minute / 60}`}
        label="Week"
      />,
    )
    const monday = screen.getByRole('list', { name: 'Monday 28, 0 lessons' })
    expect(
      within(monday)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Early', 'Late'])
  })

  it('marks the region busy while the week loads', () => {
    const { rerender } = renderGrid(
      <WeekGrid
        size="comfortable"
        interactive
        days={coachDays}
        blocks={[]}
        hourLabel={(minute) => `${minute / 60}`}
        label="Week"
        busy
        overlay={<p role="status">Loading the week</p>}
      />,
    )
    const region = screen.getByRole('region', { name: 'Week' })
    expect(region.getAttribute('aria-busy')).toBe('true')
    expect(within(region).getByRole('status').textContent).toBe('Loading the week')
    rerender(
      <MemoryRouter>
        <WeekGrid
          size="comfortable"
          interactive
          days={coachDays}
          blocks={[]}
          hourLabel={(minute) => `${minute / 60}`}
          label="Week"
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('region', { name: 'Week' }).hasAttribute('aria-busy')).toBe(false)
  })
})
