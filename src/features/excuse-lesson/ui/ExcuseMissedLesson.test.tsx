import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { bookingKeys } from '@/entities/booking'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { AppError, readRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import type { ExcusableLesson, ExcusableLessonsQuery } from '../model/types'
import { ExcuseMissedLesson } from './ExcuseMissedLesson'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW (Sat 26 Sep
// 12:00 pm). Wei Jie's lessons that have started, as booking_ledger has them (the Students
// spec §8): Fri 18 Sep (Package 2, lesson 1) and Fri 25 Sep (lesson 2), oldest first here.

const WEI_JIE_STARTED: ExcusableLesson[] = [
  {
    booking_id: 'd0000000-0000-4000-8000-000000000006',
    starts_at: '2026-09-18T11:30:00+00:00',
    ends_at: '2026-09-18T12:30:00+00:00',
    lessons: 1,
    package_no: 2,
    lesson_in_package: 1,
  },
  {
    booking_id: 'd0000000-0000-4000-8000-000000000007',
    starts_at: '2026-09-25T11:30:00+00:00',
    ends_at: '2026-09-25T12:30:00+00:00',
    lessons: 1,
    package_no: 2,
    lesson_in_package: 2,
  },
]

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function query(state: Partial<ExcusableLessonsQuery>): ExcusableLessonsQuery {
  return {
    data: undefined,
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    errorUpdatedAt: 0,
    refetch: vi.fn(() => Promise.resolve()),
    ...state,
  }
}

function loaded(data: ExcusableLesson[]): ExcusableLessonsQuery {
  return query({ data })
}

function renderBlock(lessons: ExcusableLessonsQuery) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const onExcused = vi.fn()
  const view = (next: ExcusableLessonsQuery) => (
    <QueryClientProvider client={queryClient}>
      <ExcuseMissedLesson lessons={next} packageSize={4} onExcused={onExcused} />
    </QueryClientProvider>
  )
  const { rerender } = render(view(lessons))
  return { invalidate, onExcused, update: (next: ExcusableLessonsQuery) => rerender(view(next)) }
}

function openBlock() {
  const trigger = screen.getByRole('button', { name: 'Excuse a missed lesson' })
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(trigger)
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  return trigger
}

describe('ExcuseMissedLesson', () => {
  it('lists the lessons that have started, newest first, with their place in the package', () => {
    renderBlock(loaded(WEI_JIE_STARTED))
    openBlock()
    const group = screen.getByRole('group', {
      name: 'Lesson to excuse',
      description: 'Excused lessons don’t count. Only lessons that have started can be excused.',
    })
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.closest('label')?.textContent?.trim()),
    ).toEqual([
      'Fri 25 Sep, 7:30–8:30 pm Package 2 · lesson 2 of 4',
      'Fri 18 Sep, 7:30–8:30 pm Package 2 · lesson 1 of 4',
    ])
    // Each radio is named by both lines.
    expect(
      within(group).getByRole('radio', {
        name: 'Fri 25 Sep, 7:30–8:30 pm Package 2 · lesson 2 of 4',
      }),
    ).toBeTruthy()
    const excuse = screen.getByRole('button', { name: 'Excuse lesson' })
    expect(excuse.getAttribute('aria-disabled')).toBe('true')
  })

  it('excuses the lesson picked, says so, and refreshes the list', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { invalidate, onExcused } = renderBlock(loaded(WEI_JIE_STARTED))
    openBlock()
    fireEvent.click(screen.getByRole('radio', { name: /^Fri 25 Sep/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Excuse Fri 25 Sep lesson' }))
    await waitFor(() =>
      expect(screen.getByText('Lesson excused.').getAttribute('role')).toBe('status'),
    )
    expect(onExcused).toHaveBeenCalledWith('Lesson excused.')
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: bookingKeys.all }))
    // Nothing is picked any more; the lesson leaves the list when it refreshes.
    expect(screen.getByRole('button', { name: 'Excuse lesson' })).toBeTruthy()
    const [booking] = await readRows('bookings', {
      eq: { id: 'd0000000-0000-4000-8000-000000000007' },
    })
    expect(booking?.status).toBe('excused')
  })

  it('says a lesson excused meanwhile is out of date, and refreshes the list at once', async () => {
    await logIn('herman', DEMO_PASSWORD)
    // The previous test excused Fri 25 Sep; this list hasn't caught up.
    const { invalidate, onExcused } = renderBlock(loaded(WEI_JIE_STARTED))
    openBlock()
    fireEvent.click(screen.getByRole('radio', { name: /^Fri 25 Sep/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Excuse Fri 25 Sep lesson' }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'This lesson is already excused. Refresh to see the latest.',
    )
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: bookingKeys.all }))
    expect(onExcused).not.toHaveBeenCalled()
  })

  it('shows a skeleton while the lessons load', () => {
    renderBlock(query({ isPending: true }))
    openBlock()
    expect(screen.getByText('Loading lessons…').getAttribute('role')).toBe('status')
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('says why the lessons didn’t load, and tries again', () => {
    const refetch = vi.fn(() => Promise.resolve())
    renderBlock(query({ isError: true, error: new AppError('network'), refetch }))
    openBlock()
    expect(screen.getByRole('alert').textContent).toContain(
      'Couldn’t reach the server. Check your connection and try again.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('keeps “Try again” focused and busy while it reads, then focuses the help line', () => {
    const failed = { error: new AppError('network'), errorUpdatedAt: 1000 }
    const { update } = renderBlock(query({ isError: true, ...failed }))
    openBlock()
    const retry = screen.getByRole('button', { name: 'Try again' })
    retry.focus()
    fireEvent.click(retry)
    // TanStack puts a query with no data back to pending while it reads again.
    update(query({ isPending: true, isFetching: true, errorUpdatedAt: 1000 }))
    expect(screen.getByRole('button', { name: 'Try again' })).toBe(retry)
    expect(document.activeElement).toBe(retry)
    expect(retry.getAttribute('aria-busy')).toBe('true')
    update(query({ data: WEI_JIE_STARTED, errorUpdatedAt: 1000 }))
    expect(document.activeElement?.textContent).toBe(
      'Excused lessons don’t count. Only lessons that have started can be excused.',
    )
  })

  it('moves focus to the line above when the list empties under the focused button', () => {
    const { update } = renderBlock(loaded(WEI_JIE_STARTED.slice(0, 1)))
    openBlock()
    fireEvent.click(screen.getByRole('radio', { name: /^Fri 18 Sep/ }))
    screen.getByRole('button', { name: 'Excuse Fri 18 Sep lesson' }).focus()
    // The lesson was excused in another tab: the refreshed list is empty.
    update(loaded([]))
    expect(document.activeElement?.textContent).toBe(
      'No lessons to excuse. Only lessons that have started can be excused.',
    )
  })

  it('gives the year of a lesson from another year, as History does', () => {
    renderBlock(
      loaded([
        {
          ...WEI_JIE_STARTED[0],
          starts_at: '2025-12-12T11:30:00+00:00',
          ends_at: '2025-12-12T12:30:00+00:00',
        },
      ]),
    )
    openBlock()
    expect(
      screen.getByRole('radio', {
        name: 'Fri 12 Dec 2025, 7:30–8:30 pm Package 2 · lesson 1 of 4',
      }),
    ).toBeTruthy()
  })

  it('says when there is nothing to excuse', () => {
    renderBlock(loaded([]))
    openBlock()
    expect(
      screen.getByText('No lessons to excuse. Only lessons that have started can be excused.'),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Excuse lesson' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })

  it('closes with Cancel and gives focus back to its button', () => {
    renderBlock(loaded(WEI_JIE_STARTED))
    const trigger = openBlock()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('group')).toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
  })
})
