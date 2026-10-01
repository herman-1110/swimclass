import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'

import { SessionContext } from '@/entities/account'
import { logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { ROUTES } from '@/shared/config/routes'

import { CoachStudentsPage } from './CoachStudentsPage'

// Helpers for this page's tests (not part of the page). Pages may not import app/, so the
// session comes from SessionContext and the page is mounted on its own route.

/** Seed group ids (supabase/seed.sql). */
export const GROUP = {
  hana: 'c0000000-0000-4000-8000-000000000003',
  weiJie: 'c0000000-0000-4000-8000-000000000004',
  priya: 'c0000000-0000-4000-8000-000000000005',
} as const

/**
 * The page alone at `path`, signed in as a seeded account. With `readsFail`, the session
 * ends before the page renders, so every read fails (the database refuses anon).
 */
export async function renderAs(
  username: string,
  path: string = ROUTES.coachStudents,
  { readsFail = false }: { readsFail?: boolean } = {},
) {
  const session = await logIn(username, DEMO_PASSWORD)
  if (readsFail) await logOut()
  const router = createMemoryRouter(
    [{ path: ROUTES.coachStudents, Component: CoachStudentsPage }],
    { initialEntries: [path] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <SessionContext value={{ status: 'signed-in', session }}>
        <RouterProvider router={router} />
      </SessionContext>
    </QueryClientProvider>,
  )
  return router
}

/** jsdom has no CSS or matchMedia: a window this wide (SidePanel's column from 1280 px). */
export function stubWidth(width: number) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      const min = /min-width:\s*(\d+)px/.exec(query)
      return min ? width >= Number(min[1]) : false
    },
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

/** The packages table (from 768 px), once the rows are in. */
export async function findTable() {
  return screen.findByRole('table', { name: 'Packages, needs action first' }, { timeout: 5000 })
}

/** The names in each table row: "Hana Farah’s account · Sunrise Res." → "Hana". */
export function tableNames(table: HTMLElement): string[] {
  return within(table)
    .getAllByRole('rowheader')
    .map((cell) => cell.querySelector('span')?.textContent ?? '')
}

/** The phone cards (under 768 px). */
export function cardNames(): string[] {
  const list = screen.getByRole('list', { name: 'Packages, needs action first' })
  return within(list)
    .getAllByRole('listitem')
    .map((card) => card.querySelector('span')?.textContent ?? '')
}
