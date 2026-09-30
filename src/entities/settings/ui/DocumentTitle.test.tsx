import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { logIn, logOut } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { DocumentTitle } from './DocumentTitle'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await rpc('username_available', { p_username: 'warm_up' })
  // A business name that differs from DEFAULT_BUSINESS_NAME ("Swim Class"), so the tests can
  // tell which one the title uses.
  await logIn('herman', DEMO_PASSWORD)
  await rpc('update_settings', { p_settings: { business_name: 'Herman Swims' } })
}, 60_000)

afterEach(cleanup)

function renderTitle(page: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <DocumentTitle page={page} />
    </QueryClientProvider>,
  )
  return { ...result, queryClient }
}

describe('DocumentTitle', () => {
  it('names the page and the business from the settings', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    renderTitle('Book a lesson')
    await waitFor(() => expect(document.title).toBe('Book a lesson · Herman Swims'))
  })

  it('uses the default business name until the settings arrive', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { queryClient } = renderTitle('My classes')
    expect(document.title).toBe('My classes · Swim Class')
    await waitFor(() => expect(document.title).toBe('My classes · Herman Swims'))
    expect(queryClient.getQueryData(['settings', 'public'])).toBeTruthy()
  })

  it('keeps the default business name when the settings fail', async () => {
    await logOut()
    const { queryClient } = renderTitle('Schedule')
    await waitFor(() =>
      expect(queryClient.getQueryState(['settings', 'public'])?.status).toBe('error'),
    )
    expect(document.title).toBe('Schedule · Swim Class')
  })

  it('renders one title', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    renderTitle('Account')
    await waitFor(() => expect(document.title).toBe('Account · Herman Swims'))
    expect(document.querySelectorAll('title')).toHaveLength(1)
  })
})
