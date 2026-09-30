import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { balanceKeys } from '@/entities/balance'
import { bookingKeys } from '@/entities/booking'
import { scheduleKeys } from '@/entities/schedule'
import { slotKeys } from '@/entities/slot'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows } from '@/shared/api/rpc'
import { DEMO_NOW, DEMO_PASSWORD } from '@/shared/config/demo'
import { toMyt } from '@/shared/lib/time'

import type { ExcuseCandidate } from '../model/types'
import { ExcuseLessonButton } from './ExcuseLessonButton'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW (Sat 26 Sep
// 12:00 pm). Lessons as coach_week sends them.

const NOW = toMyt(DEMO_NOW)

const WEI_JIE_FRI_25: ExcuseCandidate = {
  booking_id: 'd0000000-0000-4000-8000-000000000007',
  starts_at: '2026-09-25T19:30:00+08:00',
  ends_at: '2026-09-25T20:30:00+08:00',
  display_names: 'Wei Jie',
}

// Hana's lesson tonight at 7:30 pm: not started at noon.
const HANA_TONIGHT: ExcuseCandidate = {
  booking_id: 'd0000000-0000-4000-8000-000000000004',
  starts_at: '2026-09-26T19:30:00+08:00',
  ends_at: '2026-09-26T20:30:00+08:00',
  display_names: 'Hana',
}

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderButton(lesson: ExcuseCandidate, now: Date = NOW) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const onExcused = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <ExcuseLessonButton lesson={lesson} now={now} onExcused={onExcused} />
    </QueryClientProvider>,
  )
  return { invalidate, onExcused }
}

function openConfirm() {
  const trigger = screen.getByRole('button', { name: 'Mark as excused' })
  trigger.focus()
  fireEvent.click(trigger)
  return screen.getByRole('alertdialog')
}

describe('ExcuseLessonButton', () => {
  it('explains, instead of offering it, before the lesson starts', () => {
    renderButton(HANA_TONIGHT)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('You can mark it as excused once it has started.')).toBeTruthy()
  })

  it('offers it once the lesson has started, and suggests it over cancelling once it is over', () => {
    renderButton(HANA_TONIGHT, toMyt('2026-09-26T19:45:00+08:00'))
    expect(screen.getByRole('button', { name: 'Mark as excused' })).toBeTruthy()
    expect(screen.queryByText(/already happened/)).toBeNull()
    cleanup()
    renderButton(WEI_JIE_FRI_25)
    expect(screen.getByRole('button', { name: 'Mark as excused' })).toBeTruthy()
    expect(
      screen.getByText(
        'This lesson has already happened. If it shouldn’t count, mark it as excused instead of cancelling.',
      ),
    ).toBeTruthy()
  })

  it('asks first, with focus on "Keep lesson"', () => {
    renderButton(WEI_JIE_FRI_25)
    const dialog = openConfirm()
    expect(
      screen.getByRole('alertdialog', {
        name: 'Mark Fri 25 Sep, 7:30–8:30 pm for Wei Jie as excused?',
        description: 'It won’t count against their package. The customer isn’t emailed.',
      }),
    ).toBe(dialog)
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Keep lesson' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep lesson' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Mark as excused' }))
  })

  it('excuses a lesson that has started, says so, and refreshes what it changes', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { invalidate, onExcused } = renderButton(WEI_JIE_FRI_25)
    const dialog = openConfirm()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark as excused' }))
    await waitFor(() =>
      expect(onExcused).toHaveBeenCalledWith('Lesson marked as excused. It no longer counts.'),
    )
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(4))
    for (const queryKey of [balanceKeys.all, bookingKeys.all, scheduleKeys.all, slotKeys.all]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey })
    }
    const [booking] = await readRows('bookings', { eq: { id: WEI_JIE_FRI_25.booking_id } })
    expect(booking?.status).toBe('excused')
  })

  it('says a lesson is already excused, offers only Close, and refreshes when closed', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { invalidate, onExcused } = renderButton(WEI_JIE_FRI_25)
    const dialog = openConfirm()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark as excused' }))
    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      'This lesson is already excused. Refresh to see the latest.',
    )
    const close = within(dialog).getByRole('button', { name: 'Close' })
    expect(document.activeElement).toBe(close)
    expect(within(dialog).queryByRole('button', { name: 'Mark as excused' })).toBeNull()
    fireEvent.click(close)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: bookingKeys.all })
    expect(onExcused).not.toHaveBeenCalled()
  })

  it('passes on the database’s refusal when the page’s clock runs ahead of it', async () => {
    await logIn('herman', DEMO_PASSWORD)
    renderButton(HANA_TONIGHT, toMyt('2026-09-26T20:00:00+08:00'))
    const dialog = openConfirm()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark as excused' }))
    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      'This lesson hasn’t started yet. Cancel it instead.',
    )
  })

  it('gives the generic message to anyone but the coach', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    renderButton(WEI_JIE_FRI_25)
    const dialog = openConfirm()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark as excused' }))
    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      'Something went wrong. Refresh the page and try again.',
    )
  })
})
