import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { SessionContext } from '@/entities/account'
import { type AuthSession, getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows, updateRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { useWords } from '@/shared/i18n/context'
import { LanguageToggle } from '@/shared/ui/LanguageToggle'

import { layoutWords } from '../layouts/words'
import { AccountLanguage } from './AccountLanguage'
import { LanguageProvider } from './LanguageProvider'

// Runs in demo mode: the real migrations and seed in PGlite, with RLS, so the account's
// language is saved through the same column grant as on Supabase.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(async () => {
  cleanup()
  localStorage.clear()
  document.documentElement.lang = 'en'
  await logOut()
})

function Tabs() {
  const w = useWords(layoutWords)
  return <p>{w.myClasses}</p>
}

function renderSignedIn(session: AuthSession) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <LanguageProvider>
      <QueryClientProvider client={client}>
        <SessionContext value={{ status: 'signed-in', session }}>
          <AccountLanguage>
            <LanguageToggle />
            <Tabs />
          </AccountLanguage>
        </SessionContext>
      </QueryClientProvider>
    </LanguageProvider>,
  )
}

/** Signs in and sets the account's saved language first (null: never chose). */
async function signIn(username: string, saved: 'en' | 'zh' | null) {
  const session = await logIn(username, DEMO_PASSWORD)
  await updateRows('profiles', { language: saved }, { eq: { id: session.userId } })
  return session
}

async function savedLanguage(session: AuthSession) {
  const [profile] = await readRows('profiles', { eq: { id: session.userId } })
  return profile?.language ?? null
}

describe('AccountLanguage', () => {
  it('shows the account’s language on sign-in, over the phone’s (Herman: 2. B)', async () => {
    localStorage.setItem('swimclass.language', 'en')
    renderSignedIn(await signIn('meiling', 'zh'))
    expect(await screen.findByText('我的课程')).toBeTruthy()
    expect(localStorage.getItem('swimclass.language')).toBe('zh')
  })

  it('saves the phone’s choice on an account that never chose', async () => {
    localStorage.setItem('swimclass.language', 'zh')
    const session = await signIn('meiling', null)
    renderSignedIn(session)
    expect(await screen.findByText('我的课程')).toBeTruthy()
    await waitFor(async () => expect(await savedLanguage(session)).toBe('zh'))
  })

  it('leaves an account that never chose alone when the phone never chose either', async () => {
    const session = await signIn('meiling', null)
    renderSignedIn(session)
    expect(await screen.findByText('My classes')).toBeTruthy()
    expect(await savedLanguage(session)).toBeNull()
  })

  it('saves the toggle on the account, and doesn’t switch back while it saves', async () => {
    const session = await signIn('meiling', 'en')
    renderSignedIn(session)
    expect(await screen.findByText('My classes')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '中文' }))
    expect(await screen.findByText('我的课程')).toBeTruthy()
    await waitFor(async () => expect(await savedLanguage(session)).toBe('zh'))
    expect(screen.getByText('我的课程')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(await screen.findByText('My classes')).toBeTruthy()
    await waitFor(async () => expect(await savedLanguage(session)).toBe('en'))
  })
})
