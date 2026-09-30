import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { accountKeys } from '@/entities/account'
import { balanceKeys } from '@/entities/balance'
import { bookingKeys } from '@/entities/booking'
import { paymentKeys } from '@/entities/payment'
import { scheduleKeys } from '@/entities/schedule'
import { slotKeys } from '@/entities/slot'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { demoDb } from '@/shared/api/demo/db'
import { readRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import type { CancelableLesson, CancelAudience } from '../model/types'
import { CancelLessonDialog } from './CancelLessonDialog'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW (Sat 26 Sep
// 12:00 pm).

// Priya's Tue 29 Sep 5:30 pm lesson (d0…09), as coach_week sends it.
const PRIYA: CancelableLesson = {
  booking_id: 'd0000000-0000-4000-8000-000000000009',
  starts_at: '2026-09-29T17:30:00+08:00',
  ends_at: '2026-09-29T18:30:00+08:00',
  display_names: 'Priya',
  account_name: 'Priya',
}

// meiling's Sat 26 Sep 5:00 pm lesson (d0…01): past the 6-hour cutoff at noon.
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

function renderDialog(lesson: CancelableLesson, audience: CancelAudience) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const onClose = vi.fn()
  const onCancelled = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <CancelLessonDialog
        open
        onClose={onClose}
        lesson={lesson}
        audience={audience}
        cutoffHours={6}
        onCancelled={onCancelled}
      />
    </QueryClientProvider>,
  )
  return { invalidate, onClose, onCancelled }
}

describe('CancelLessonDialog', () => {
  it('shows nothing while closed', () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <CancelLessonDialog
          open={false}
          onClose={vi.fn()}
          lesson={PRIYA}
          audience="coach"
          onCancelled={vi.fn()}
        />
      </QueryClientProvider>,
    )
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('gives the coach an optional reason for the customer’s email, up to 500 characters', () => {
    renderDialog(PRIYA, 'coach')
    screen.getByRole('alertdialog', {
      name: 'Cancel Tue 29 Sep, 5:30–6:30 pm for Priya?',
      description: 'The lesson goes back to their package and the customer is emailed.',
    })
    const reason = screen.getByRole('textbox', {
      name: 'Reason (optional)',
      description: 'Goes in the email to Priya. Up to 500 characters.',
    })
    expect(reason.getAttribute('maxlength')).toBe('500')
    expect(reason.getAttribute('rows')).toBe('3')
  })

  it('has no reason field for a customer', () => {
    renderDialog(TODAY_5PM, 'customer')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('cancels as the coach with the reason, trimmed, and refreshes every lesson view', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { invalidate, onCancelled } = renderDialog(PRIYA, 'coach')
    fireEvent.change(screen.getByRole('textbox', { name: 'Reason (optional)' }), {
      target: { value: '  Pool closed for maintenance  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel lesson' }))
    await waitFor(() =>
      expect(onCancelled).toHaveBeenCalledWith('Lesson cancelled. Priya will get an email.'),
    )
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(5))
    for (const queryKey of [
      slotKeys.all,
      scheduleKeys.all,
      balanceKeys.all,
      bookingKeys.all,
      paymentKeys.all,
    ]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey })
    }
    const [booking] = await readRows('bookings', { eq: { id: PRIYA.booking_id } })
    expect(booking).toMatchObject({
      status: 'cancelled',
      cancel_reason: 'Pool closed for maintenance',
    })
  })

  it('puts a reason that is too long on the reason field, and lets the coach shorten it', async () => {
    await logIn('herman', DEMO_PASSWORD)
    // Daniel's Wed 30 Sep 8:30 pm lesson (d0…18). The field stops typing at 500 characters;
    // the database's own limit is the safety net.
    const daniel: CancelableLesson = {
      booking_id: 'd0000000-0000-4000-8000-000000000018',
      starts_at: '2026-09-30T20:30:00+08:00',
      ends_at: '2026-09-30T21:30:00+08:00',
      display_names: 'Daniel',
      account_name: 'Daniel',
    }
    const { onCancelled } = renderDialog(daniel, 'coach')
    const reason = screen.getByRole('textbox', { name: 'Reason (optional)' })
    fireEvent.change(reason, { target: { value: 'x'.repeat(501) } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel lesson' }))
    await waitFor(() => expect(reason.getAttribute('aria-invalid')).toBe('true'))
    expect(
      screen.getByRole('textbox', {
        name: 'Reason (optional)',
        description:
          'Goes in the email to Daniel. Up to 500 characters. The reason is too long. Shorten it to 500 characters.',
      }),
    ).toBe(reason)
    expect(document.activeElement).toBe(reason)
    expect(screen.queryByRole('alert')).toBeNull()

    fireEvent.change(reason, { target: { value: 'Pool closed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel lesson' }))
    await waitFor(() =>
      expect(onCancelled).toHaveBeenCalledWith('Lesson cancelled. Daniel will get an email.'),
    )
  })

  it('tells the coach a lesson is already cancelled, in the coach’s words', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { onClose, onCancelled } = renderDialog(PRIYA, 'coach')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel lesson' }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'This lesson is already cancelled. Refresh to see the latest.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(onCancelled).not.toHaveBeenCalled()
  })

  it('tells a customer they are past the cutoff, with the hours from settings', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { invalidate } = renderDialog(TODAY_5PM, 'customer')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel lesson' }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'It’s less than 6 hours before the lesson, so it can’t be cancelled.',
    )
    expect(screen.queryByRole('button', { name: 'Cancel lesson' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: bookingKeys.all })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: accountKeys.all })
  })

  it('refreshes the profile too when an account is no longer approved', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    // The coach withdraws the approval meanwhile (no screen does this; the database allows it).
    const db = await demoDb()
    await db.query(`update public.profiles set approved = false where username = 'meiling'`)
    try {
      const { invalidate } = renderDialog(TODAY_5PM, 'customer')
      fireEvent.click(screen.getByRole('button', { name: 'Cancel lesson' }))
      expect((await screen.findByRole('alert')).textContent).toBe(
        'Your coach hasn’t approved your account yet.',
      )
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(invalidate).toHaveBeenCalledWith({ queryKey: accountKeys.all })
    } finally {
      await db.query(`update public.profiles set approved = true where username = 'meiling'`)
    }
  })
})
