import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { openHoursKeys } from '@/entities/open-hours'
import { type CoachException, coachWeekQuery, scheduleKeys } from '@/entities/schedule'
import { slotKeys } from '@/entities/slot'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { RemoveExceptionButton } from './RemoveExceptionButton'

// Runs in demo mode: the real migrations and seed in PGlite. The seed has no exceptions, so
// the test blocks Sat 3 Oct 7:00–9:00 am first (the Schedule spec §8.3).

let block: CoachException

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
  await logIn('herman', DEMO_PASSWORD)
  await rpc('add_exception', {
    p_kind: 'closed',
    p_starts_at: '2026-10-03T07:00:00+08:00',
    p_ends_at: '2026-10-03T09:00:00+08:00',
    p_note: 'Pool maintenance',
  })
  const week = await new QueryClient().fetchQuery(coachWeekQuery('2026-09-28'))
  block = week[5].exceptions[0]
}, 60_000)

afterEach(cleanup)

function renderButton() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const onRemoved = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <RemoveExceptionButton exception={block} onRemoved={onRemoved} />
    </QueryClientProvider>,
  )
  return { invalidate, onRemoved }
}

describe('RemoveExceptionButton', () => {
  it('removes the block at once and refreshes the open time', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { invalidate, onRemoved } = renderButton()
    const button = screen.getByRole('button', {
      name: 'Remove blocked time, Sat 3 Oct, 7:00–9:00 am',
    })
    expect(button.textContent).toBe('Remove blocked time, Sat 3 Oct, 7:00–9:00 am')
    fireEvent.click(button)
    await waitFor(() => expect(onRemoved).toHaveBeenCalledWith('Blocked time removed.'))
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(3))
    for (const queryKey of [scheduleKeys.all, slotKeys.all, openHoursKeys.all]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey })
    }
    const week = await new QueryClient().fetchQuery(coachWeekQuery('2026-09-28'))
    expect(week[5].exceptions).toEqual([])
  })

  it('says something went wrong when it is gone already, and refreshes the list', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { invalidate, onRemoved } = renderButton()
    const button = screen.getByRole('button', { name: /^Remove blocked time/ })
    fireEvent.click(button)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Something went wrong. Refresh the page and try again.')
    expect(button.getAttribute('aria-describedby')).toBe(alert.id)
    expect(onRemoved).not.toHaveBeenCalled()
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: scheduleKeys.all }))
  })
})
