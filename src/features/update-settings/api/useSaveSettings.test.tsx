import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { balanceKeys } from '@/entities/balance'
import { bookingKeys } from '@/entities/booking'
import { emailLogKeys } from '@/entities/email-log'
import { openHoursKeys } from '@/entities/open-hours'
import { scheduleKeys } from '@/entities/schedule'
import { settingsKeys } from '@/entities/settings'
import { slotKeys } from '@/entities/slot'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { AppError, readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { formatTime } from '@/shared/lib/time'

import type { RuleInput } from '../model/types'
import { HoursOnlySavedError, saveSettings, useSaveSettings } from './useSaveSettings'

// Runs in demo mode: the real migrations and seed in PGlite. Every test that saves puts the
// seed's values back, so the tests don't depend on each other.

const evening = (weekday: RuleInput['weekday']): RuleInput => ({
  weekday,
  opens_at: '17:30',
  closes_at: '22:00',
})

const SEED_RULES: RuleInput[] = [
  evening(1),
  evening(2),
  evening(3),
  evening(4),
  evening(5),
  { weekday: 6, opens_at: '07:00', closes_at: '12:00' },
  { weekday: 6, opens_at: '16:00', closes_at: '22:00' },
  { weekday: 7, opens_at: '07:00', closes_at: '12:00' },
  { weekday: 7, opens_at: '16:00', closes_at: '22:00' },
]

/** The seed's week with one day's ranges replaced. */
function weekWith(weekday: RuleInput['weekday'], ranges: [string, string][]): RuleInput[] {
  return [
    ...SEED_RULES.filter((rule) => rule.weekday !== weekday),
    ...ranges.map(([opens_at, closes_at]) => ({ weekday, opens_at, closes_at })),
  ].sort((a, b) => a.weekday - b.weekday || a.opens_at.localeCompare(b.opens_at))
}

async function savedHours(weekday: number) {
  const rows = await readRows('availability_rules', {
    columns: ['weekday', 'opens_at', 'closes_at'],
    eq: { weekday },
    order: [{ column: 'opens_at' }],
  })
  return rows.map((row) => `${row.opens_at}–${row.closes_at}`)
}

async function savedSettings() {
  const [settings] = await readRows('settings', { eq: { id: 1 } })
  return settings
}

async function restoreSeed() {
  await logIn('herman', DEMO_PASSWORD)
  await rpc('set_open_hours', { p_rules: SEED_RULES })
  await rpc('update_settings', {
    p_settings: {
      travel_gap_minutes: 60,
      coach_email: 'herman@example.com',
      payment_instructions: null,
      reminder_time: '20:00',
    },
  })
}

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

describe('saveSettings', () => {
  it('saves the hours first, then the changed settings, and returns the row as saved', async () => {
    await logIn('herman', DEMO_PASSWORD)
    try {
      const result = await saveSettings({
        rules: weekWith(6, [
          ['08:00', '12:00'],
          ['16:00', '22:00'],
        ]),
        patch: {
          travel_gap_minutes: 30,
          coach_email: ' Herman@Gmail.com ',
          payment_instructions: '  Maybank 1234\nor cash  ',
          reminder_time: '19:30',
        },
      })
      expect(result.hoursSaved).toBe(true)
      expect(result.settings).toMatchObject({
        travel_gap_minutes: 30,
        coach_email: 'Herman@Gmail.com',
        payment_instructions: 'Maybank 1234\nor cash',
        reminder_time: '19:30:00',
      })
      expect(await savedHours(6)).toEqual(['08:00:00–12:00:00', '16:00:00–22:00:00'])
      expect(await savedHours(7)).toEqual(['07:00:00–12:00:00', '16:00:00–22:00:00'])
    } finally {
      await restoreSeed()
    }
  })

  it('saves only the settings when the hours are unchanged, and only the hours the other way', async () => {
    await logIn('herman', DEMO_PASSWORD)
    try {
      expect(await saveSettings({ rules: null, patch: { travel_gap_minutes: 45 } })).toMatchObject({
        hoursSaved: false,
        settings: { travel_gap_minutes: 45 },
      })
      expect(await saveSettings({ rules: weekWith(1, []), patch: null })).toEqual({
        hoursSaved: true,
        settings: null,
      })
      expect(await savedHours(1)).toEqual([])
    } finally {
      await restoreSeed()
    }
  })

  it('saves nothing when set_open_hours refuses (overlapping ranges)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const refusal = saveSettings({
      rules: weekWith(1, [
        ['17:30', '20:00'],
        ['19:00', '22:00'],
      ]),
      patch: { travel_gap_minutes: 30 },
    })
    await expect(refusal).rejects.toMatchObject({
      name: 'AppError',
      code: 'overlapping_rules',
      detail: { weekday: 1 },
    })
    await expect(refusal).rejects.not.toBeInstanceOf(HoursOnlySavedError)
    expect(await savedHours(1)).toEqual(['17:30:00–22:00:00'])
    expect((await savedSettings())?.travel_gap_minutes).toBe(60)
  })

  it('keeps the saved hours when update_settings refuses after them, and says so', async () => {
    await logIn('herman', DEMO_PASSWORD)
    try {
      const refusal = saveSettings({
        rules: weekWith(1, [['18:00', '22:00']]),
        patch: { travel_gap_minutes: 500, start_step_minutes: 15 },
      })
      await expect(refusal).rejects.toBeInstanceOf(HoursOnlySavedError)
      await expect(refusal).rejects.toMatchObject({
        code: 'invalid_setting',
        detail: { field: 'travel_gap_minutes' },
      })
      expect(await savedHours(1)).toEqual(['18:00:00–22:00:00'])
      // One statement, one transaction: none of the patch is saved.
      expect(await savedSettings()).toMatchObject({
        travel_gap_minutes: 60,
        start_step_minutes: 30,
      })
    } finally {
      await restoreSeed()
    }
  })

  it('passes update_settings’ refusal on as it is when the hours didn’t change', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const refusal = saveSettings({ rules: null, patch: { lesson_lengths: [] } })
    await expect(refusal).rejects.toMatchObject({
      code: 'invalid_setting',
      detail: { field: 'lesson_lengths' },
    })
    await expect(refusal).rejects.not.toBeInstanceOf(HoursOnlySavedError)
  })

  it('is refused for a customer', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    await expect(saveSettings({ rules: SEED_RULES, patch: null })).rejects.toMatchObject({
      code: 'not_coach',
    })
    await expect(
      saveSettings({ rules: null, patch: { travel_gap_minutes: 30 } }),
    ).rejects.toMatchObject({ code: 'not_coach' })
  })
})

// Aiman & Sofia (meiling's group) in the seed.
const AIMAN_AND_SOFIA = 'c0000000-0000-4000-8000-000000000001'

/** What meiling's Book offers on a day of the week of Mon 28 Sep, for 1 hour. */
async function startsOn(day: string) {
  await logIn('meiling', DEMO_PASSWORD)
  const slots = await rpc('week_slots', {
    p_week_start: '2026-09-28',
    p_minutes: 60,
    p_group_id: AIMAN_AND_SOFIA,
  })
  return slots
    .filter((slot) => slot.day === day)
    .map((slot) => `${formatTime(slot.starts_at)} ${slot.ok ? 'free' : slot.reason}`)
}

describe('what customers see after a save (coach-settings §8.2)', () => {
  it('a travel gap of 30 frees Tue 29 Sep at 7:00 pm, and 6:30 pm stays too close (walkthrough 1)', async () => {
    try {
      expect(await startsOn('2026-09-29')).toContain('7:00 pm gap_after')
      await logIn('herman', DEMO_PASSWORD)
      await saveSettings({ rules: null, patch: { travel_gap_minutes: 30 } })
      const tuesday = await startsOn('2026-09-29')
      expect(tuesday).toContain('7:00 pm free')
      expect(tuesday).toContain('6:30 pm gap_after')
    } finally {
      await restoreSeed()
    }
  })

  it('Saturday from 8:00 am drops its 7:00 am start; Sunday keeps it (walkthrough 2)', async () => {
    try {
      expect((await startsOn('2026-10-03'))[0]).toBe('7:00 am free')
      await logIn('herman', DEMO_PASSWORD)
      await saveSettings({
        rules: weekWith(6, [
          ['08:00', '12:00'],
          ['16:00', '22:00'],
        ]),
        patch: null,
      })
      expect((await startsOn('2026-10-03'))[0]).toBe('8:00 am gap_before')
      // Sunday still starts at 7:00 am (crossed out: the 8:00 am lesson needs its travel gap).
      expect((await startsOn('2026-10-04'))[0]).toBe('7:00 am gap_before')
    } finally {
      await restoreSeed()
    }
  })
})

function renderUseSaveSettings() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useSaveSettings(), { wrapper })
  const refreshed = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey)
  return { result, queryClient, refreshed }
}

describe('useSaveSettings', () => {
  it('shows the saved row at once, then refreshes everything the save affects', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, queryClient, refreshed } = renderUseSaveSettings()
    try {
      await act(() =>
        result.current.mutateAsync({
          rules: weekWith(6, [['08:00', '12:00']]),
          patch: { travel_gap_minutes: 30 },
        }),
      )
      expect(queryClient.getQueryData(settingsKeys.coach())).toMatchObject({
        travel_gap_minutes: 30,
      })
      expect(refreshed()).toEqual([
        openHoursKeys.all,
        slotKeys.all,
        scheduleKeys.all,
        settingsKeys.all,
        balanceKeys.all,
        bookingKeys.all,
        emailLogKeys.all,
      ])
    } finally {
      await restoreSeed()
    }
  })

  it('refreshes only what the settings affect when the hours are unchanged', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, refreshed } = renderUseSaveSettings()
    try {
      await act(() =>
        result.current.mutateAsync({ rules: null, patch: { travel_gap_minutes: 30 } }),
      )
      expect(refreshed()).toEqual([
        settingsKeys.all,
        slotKeys.all,
        scheduleKeys.all,
        balanceKeys.all,
        bookingKeys.all,
        emailLogKeys.all,
      ])
    } finally {
      await restoreSeed()
    }
  })

  it('refreshes what the saved hours affect when the settings were refused after them', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, refreshed } = renderUseSaveSettings()
    try {
      await act(async () => {
        await expect(
          result.current.mutateAsync({
            rules: weekWith(1, [['18:00', '22:00']]),
            patch: { travel_gap_minutes: 500 },
          }),
        ).rejects.toBeInstanceOf(HoursOnlySavedError)
      })
      expect(refreshed()).toEqual([
        openHoursKeys.all,
        slotKeys.all,
        scheduleKeys.all,
        emailLogKeys.all,
      ])
    } finally {
      await restoreSeed()
    }
  })

  it('refreshes nothing when nothing was saved', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, refreshed } = renderUseSaveSettings()
    await act(async () => {
      await expect(
        result.current.mutateAsync({ rules: null, patch: { travel_gap_minutes: 500 } }),
      ).rejects.toBeInstanceOf(AppError)
    })
    expect(refreshed()).toEqual([])
  })
})
