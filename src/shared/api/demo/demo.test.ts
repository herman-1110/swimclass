import { beforeAll, describe, expect, it } from 'vitest'

import { MIN_PASSWORD_LENGTH } from '@/shared/config/messages'

import { logIn, logOut, signUp, updatePassword } from '../auth'
import { demoAccounts, demoMailbox } from '../backend'
import { AppError, readRows, rpc, updateRows } from '../rpc'

// Demo mode end to end: the real migrations and seed in PGlite behind rpc.ts and
// auth.ts, answering like the Supabase API (TECH_SPEC §10 is the seed's expected data).

const AIMAN_SOFIA = 'c0000000-0000-4000-8000-000000000001'
const MEILING = 'a0000000-0000-4000-8000-000000000002'

async function failure(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof AppError) return error
    throw error
  }
  throw new Error('Expected a failure')
}

beforeAll(async () => {
  await logOut()
  await rpc('username_available', { p_username: 'warm_up' })
}, 60_000)

describe('signed out (anon)', () => {
  it('checks usernames with the one function anon may call', async () => {
    await expect(rpc('username_available', { p_username: 'herman' })).resolves.toBe(false)
    await expect(rpc('username_available', { p_username: 'someone.new' })).resolves.toBe(true)
  })

  it('is refused anything else, as a generic error', async () => {
    expect((await failure(rpc('get_public_settings'))).code).toBe('unknown')
  })

  it("lists demo mode's accounts to sign in as, the coach first", async () => {
    const accounts = await demoAccounts()
    expect(accounts[0]).toEqual({
      username: 'herman',
      displayName: 'Herman',
      role: 'coach',
      approved: true,
    })
    expect(accounts.map((a) => a.username)).toContain('meiling')
  })

  it('logs in with a username and the sample password only', async () => {
    expect((await failure(logIn('meiling', 'wrong'))).code).toBe('invalid_login')
    expect((await failure(logIn('nobody', 'swim-test-2026'))).code).toBe('invalid_login')
  })

  it('asks for passwords as long as the forms do (MIN_PASSWORD_LENGTH)', async () => {
    const account = (username: string, password: string) => ({
      username,
      displayName: username,
      email: `${username}@example.com`,
      phone: null,
      password,
    })
    const short = 'x'.repeat(MIN_PASSWORD_LENGTH - 1)
    expect((await failure(signUp(account('short.pw', short)))).code).toBe('weak_password')
    await expect(signUp(account('long.pw', `${short}x`))).resolves.toEqual({ confirmEmail: true })
    await logIn('long.pw', `${short}x`)
    expect((await failure(updatePassword(short))).code).toBe('weak_password')
    await logOut()
  })
})

describe('signed in as meiling', () => {
  beforeAll(async () => {
    await logIn('MeiLing ', 'swim-test-2026')
  })

  it('reads public settings as a one-row table', async () => {
    const [settings] = await rpc('get_public_settings')
    expect(settings).toMatchObject({ business_name: 'Swim Class', travel_gap_minutes: 60 })
  })

  it("returns week_slots like the Supabase API: Tue 29 Sep for Aiman & Sofia (Main.dc.html's chips)", async () => {
    const slots = await rpc('week_slots', {
      p_week_start: '2026-09-28',
      p_minutes: 60,
      p_group_id: AIMAN_SOFIA,
    })
    const tuesday = slots.filter((s) => s.day === '2026-09-29')
    expect(tuesday[0]).toMatchObject({ starts_at: '2026-09-29T09:30:00+00:00', ok: false })
    expect(tuesday.map((s) => (s.ok ? 'free' : s.reason))).toEqual([
      'overlap_other',
      'overlap_other',
      'gap_after',
      'gap_after',
      'free',
      'free',
      'free',
      'free',
    ])
  })

  it('reads the package balance from the view (Package 4: 0 used, 2 booked, 2 left)', async () => {
    const [balance] = await readRows('group_balance', { eq: { group_id: AIMAN_SOFIA } })
    expect(balance).toMatchObject({
      package_no: 4,
      used_in_package: 0,
      booked_in_package: 2,
      left_in_package: 2,
      last_paid_on: '2026-09-19',
    })
  })

  it("turns the database's refusal into a reason code with its detail", async () => {
    const error = await failure(
      rpc('book_lesson', {
        p_group_id: AIMAN_SOFIA,
        p_starts_at: '2026-09-29T19:00:00+08:00',
        p_minutes: 60,
      }),
    )
    expect(error.code).toBe('gap_after')
    expect(error.detail).toEqual({ ends_at: '2026-09-29T18:30:00+08:00' })
  })

  it('books through the real function, and the slots change with it', async () => {
    const ids = await rpc('book_lesson', {
      p_group_id: AIMAN_SOFIA,
      p_starts_at: '2026-09-29T19:30:00+08:00',
      p_minutes: 60,
    })
    expect(ids).toHaveLength(1)
    const slots = await rpc('week_slots', {
      p_week_start: '2026-09-28',
      p_minutes: 60,
      p_group_id: AIMAN_SOFIA,
    })
    const at730 = slots.find((s) => s.starts_at === '2026-09-29T11:30:00+00:00')
    expect(at730).toMatchObject({ ok: false, reason: 'overlap_mine' })
  })

  it("shows the booking's confirmation email in demo mode's mailbox, with the site's links", async () => {
    const [latest] = await demoMailbox()
    expect(latest).toMatchObject({ kind: 'booked', to: 'meiling@example.com' })
    expect(latest?.text).not.toContain('{{site_url}}')
  })

  it('updates its own profile directly, as RLS allows', async () => {
    await updateRows('profiles', { display_name: 'Mei Ling Tan' }, { eq: { id: MEILING } })
    const [me] = await readRows('profiles', {
      eq: { id: MEILING },
      columns: ['display_name', 'role', 'approved'],
    })
    expect(me).toEqual({ display_name: 'Mei Ling Tan', role: 'customer', approved: true })
  })
})

describe('signed in as herman (the coach)', () => {
  beforeAll(async () => {
    await logIn('herman', 'swim-test-2026')
  })

  it('gets the week as JSON, one entry per day', async () => {
    const week = await rpc('coach_week', { p_week_start: '2026-09-28' })
    expect(Array.isArray(week) && week.length).toBe(7)
  })

  it('returns a single-row function result as an object (update_settings)', async () => {
    const settings = await rpc('update_settings', { p_settings: { travel_gap_minutes: 45 } })
    expect(settings).toMatchObject({ id: 1, travel_gap_minutes: 45 })
  })
})
