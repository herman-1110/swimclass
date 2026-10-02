import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { bookingKeys } from '@/entities/booking'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { holdDemoDatabase } from '@/shared/api/demo/testing'
import { readRows } from '@/shared/api/rpc'
import { DEMO_NOW, DEMO_PASSWORD } from '@/shared/config/demo'
import { toMyt } from '@/shared/lib/time'

import { cancelNote } from '../model/cancelWindow'
import type { CancelableLesson } from '../model/types'
import { CancelLessonButton } from './CancelLessonButton'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW (Sat 26 Sep
// 12:00 pm). meiling's lessons: Sat 26 Sep 5:00 pm (locked at noon) and Sat 3 Oct 9:00 am.

const NOW = toMyt(DEMO_NOW)

const SAT_3_OCT: CancelableLesson = {
  booking_id: 'd0000000-0000-4000-8000-000000000002',
  starts_at: '2026-10-03T01:00:00+00:00',
  ends_at: '2026-10-03T02:00:00+00:00',
  display_names: 'Aiman & Sofia',
}

const TODAY_5PM: CancelableLesson = {
  booking_id: 'd0000000-0000-4000-8000-000000000001',
  starts_at: '2026-09-26T09:00:00+00:00',
  ends_at: '2026-09-26T10:00:00+00:00',
  display_names: 'Aiman & Sofia',
}

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

/** A My classes row's right side and note, as the page puts them together. */
function renderRow(lesson: CancelableLesson, onCancelled = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  render(
    <QueryClientProvider client={queryClient}>
      <CancelLessonButton
        lesson={lesson}
        cutoffHours={6}
        now={NOW}
        describedBy="row-note"
        onCancelled={onCancelled}
      />
      <p id="row-note">{cancelNote(lesson.starts_at, 6, NOW)}</p>
      <button type="button">Past lessons and receipts</button>
    </QueryClientProvider>,
  )
  return { onCancelled, invalidate }
}

describe('CancelLessonButton', () => {
  it('shows Cancel, named for the lesson and described by its deadline, while it can be cancelled', () => {
    renderRow(SAT_3_OCT)
    const cancel = screen.getByRole('button', {
      name: 'Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia',
      description: 'Free to cancel until 3:00 am, Sat 3 Oct.',
    })
    expect(cancel.textContent).toBe('Cancel')
    expect(cancel.getAttribute('aria-haspopup')).toBe('dialog')
  })

  it('shows Locked, and no button, after the deadline', () => {
    renderRow(TODAY_5PM)
    expect(screen.getByText('Locked')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Cancel/ })).toBeNull()
    expect(
      screen.getByText('Under 6 hours to go, so it can’t be cancelled and counts even if missed.'),
    ).toBeTruthy()
  })

  it('asks first, with focus on "Keep lesson", and keeps the lesson when asked to', () => {
    renderRow(SAT_3_OCT)
    const cancel = screen.getByRole('button', { name: /^Cancel Sat 3 Oct/ })
    cancel.focus()
    fireEvent.click(cancel)
    const dialog = screen.getByRole('alertdialog', {
      name: 'Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia?',
      description: 'The lesson goes back to your package.',
    })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep lesson' }))
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Keep lesson' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(document.activeElement).toBe(cancel)
  })

  it('cancels the lesson, says so, then refreshes the lesson lists', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { onCancelled, invalidate } = renderRow(SAT_3_OCT)
    fireEvent.click(screen.getByRole('button', { name: /^Cancel Sat 3 Oct/ }))
    // The demo database answers at once; hold it, as a slow connection would.
    const release = await holdDemoDatabase()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel lesson' }))

    const running = await screen.findByRole('button', { name: 'Cancelling…' })
    expect(running.getAttribute('aria-busy')).toBe('true')
    expect(running.getAttribute('aria-disabled')).toBe('true')
    const keep = screen.getByRole('button', { name: 'Keep lesson' })
    expect(keep.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('alertdialog').getAttribute('aria-busy')).toBe('true')
    // Esc does nothing while the call runs.
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    await release()

    await waitFor(() =>
      expect(onCancelled).toHaveBeenCalledWith(
        'Lesson cancelled: Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia. It went back to your package.',
      ),
    )
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: bookingKeys.all }))

    const [booking] = await readRows('bookings', { eq: { id: SAT_3_OCT.booking_id } })
    expect(booking).toMatchObject({ status: 'cancelled', cancel_reason: null })
  })

  it('says a lesson that is no longer booked is out of date, and refreshes when closed', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    // The previous test cancelled it.
    const { onCancelled, invalidate } = renderRow(SAT_3_OCT)
    fireEvent.click(screen.getByRole('button', { name: /^Cancel Sat 3 Oct/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel lesson' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'This lesson is no longer booked. Refresh to see the latest.',
    )
    expect(screen.queryByRole('button', { name: 'Cancel lesson' })).toBeNull()
    const close = screen.getByRole('button', { name: 'Close' })
    expect(document.activeElement).toBe(close)
    expect(invalidate).not.toHaveBeenCalled()

    fireEvent.click(close)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: bookingKeys.all })
    expect(onCancelled).not.toHaveBeenCalled()
  })
})
