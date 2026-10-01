import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import type { WeeklyRange } from '@/entities/open-hours'
import type { CoachSettings } from '@/entities/settings'

import { SettingsFormProvider } from './SettingsFormProvider'
import { SettingsSections } from './SettingsSections'

afterEach(cleanup)

// The seed's row and hours (coach-settings §5.1). Nothing here calls the database.
const SETTINGS: CoachSettings = {
  id: 1,
  business_name: 'Swim Class',
  coach_email: 'herman@example.com',
  travel_gap_minutes: 60,
  start_step_minutes: 30,
  lesson_lengths: [60, 120],
  max_students_per_lesson: 3,
  cancel_cutoff_hours: 6,
  booking_window_weeks: 4,
  lessons_per_package: 4,
  unpaid_packages_allowed: 1,
  price_1to1_cents: null,
  price_1to2_cents: null,
  price_1to3_cents: null,
  payment_instructions: null,
  lesson_expiry_months: null,
  reminder_time: '20:00:00',
  digest_time: '20:00:00',
  booking_confirmations: true,
  late_change_alert: true,
  require_approval: true,
  updated_at: '2026-09-26T04:00:00+00:00',
}

const HOURS: WeeklyRange[] = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday: weekday as WeeklyRange['weekday'],
  opens_at: '17:30:00',
  closes_at: '22:00:00',
}))

/** The form inside a data router (the leave guard needs one) and a query client. */
function renderForm(ready: boolean, children: ReactNode) {
  const router = createMemoryRouter(
    [
      {
        path: '/coach/settings',
        element: (
          <SettingsFormProvider
            settings={ready ? SETTINGS : undefined}
            weeklyHours={ready ? HOURS : undefined}
          >
            <SettingsSections>{children}</SettingsSections>
          </SettingsFormProvider>
        ),
      },
    ],
    { initialEntries: ['/coach/settings'] },
  )
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('SettingsSections', () => {
  it('places what the page gives it after the four sections, inside the grid', () => {
    renderForm(true, <p>After the sections</p>)
    const form = screen.getByRole('textbox', { name: 'Travel gap' }).closest('form')
    const after = screen.getByText('After the sections')
    expect(form?.lastElementChild).toBe(after)
    expect(
      screen.getAllByRole('region').map((section) => section.getAttribute('aria-labelledby')),
    ).toEqual(['open-hours-title', 'booking-rules-title', 'packages-title', 'emails-title'])
  })

  it('renders nothing, its children included, until the settings and hours are in', () => {
    renderForm(false, <p>After the sections</p>)
    expect(screen.queryByText('After the sections')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
