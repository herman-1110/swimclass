// The login rate limit (supabase/migrations/…_add_login_limiter.sql; TECH_SPEC §7):
// check_login_attempt and record_login_success, which only the service role (the `login`
// Edge Function) may run. The limit counts real time (now()), not the pinned clock.
import { describe, expect, it } from 'vitest'

import { hasDatabase, type TestDb, useTestDb } from './helpers'

const PERMISSION_DENIED = '42501'
const CHECK_VIOLATION = '23514'
const IP = '203.0.113.7'
const OTHER_IP = '198.51.100.20'

type Answer = { attempt_id: number; email: string | null }

/** Acts as the service role, as the Edge Function does. */
async function asServiceRole(db: TestDb) {
  await db.asOwner()
  await db.query('set local role service_role')
}

async function check(db: TestDb, username: string, ip: string | null = IP): Promise<Answer> {
  await asServiceRole(db)
  const { rows } = await db.query<{ answer: Answer }>(
    'select public.check_login_attempt($1, $2::inet) as answer',
    [username, ip],
  )
  const answer = rows[0]?.answer
  if (!answer) throw new Error('No answer')
  return answer
}

async function refusal(db: TestDb, username: string, ip: string | null = IP) {
  await asServiceRole(db)
  const error = await db.expectFailure('select public.check_login_attempt($1, $2::inet)', [
    username,
    ip,
  ])
  return error.message
}

async function succeed(db: TestDb, attemptId: number) {
  await asServiceRole(db)
  await db.query('select public.record_login_success($1)', [attemptId])
}

/** Adds `count` failures for a username from an IP, `minutesAgo` back (as the owner). */
async function failures(
  db: TestDb,
  username: string,
  count: number,
  { ip = IP, minutesAgo = 1 }: { ip?: string | null; minutesAgo?: number } = {},
) {
  await db.asOwner()
  await db.query(
    `insert into public.login_attempts (username, ip, ok, attempted_at)
     select $1, $2::inet, false, now() - make_interval(mins => $4) from generate_series(1, $3)`,
    [username, ip, count, minutesAgo],
  )
}

/** The rows for a username, oldest first (as the owner). */
async function attempts(db: TestDb, username: string) {
  await db.asOwner()
  const { rows } = await db.query<{ ip: string | null; ok: boolean }>(
    `select host(ip) as ip, ok from public.login_attempts where username = $1 order by id`,
    [username],
  )
  return rows
}

describe.skipIf(!hasDatabase)('check_login_attempt', () => {
  const db = useTestDb()

  it('records a try as a failure and returns the account’s email', async () => {
    const answer = await check(db, 'meiling')
    expect(answer.email).toBe('meiling@example.com')
    expect(typeof answer.attempt_id).toBe('number')
    expect(await attempts(db, 'meiling')).toEqual([{ ip: IP, ok: false }])
  })

  it('counts Meiling as meiling', async () => {
    const answer = await check(db, '  Meiling ')
    expect(answer.email).toBe('meiling@example.com')
    expect(await attempts(db, 'meiling')).toHaveLength(1)
  })

  it('counts a username no account has, with no email', async () => {
    const answer = await check(db, 'nobody.here')
    expect(answer.email).toBeNull()
    expect(await attempts(db, 'nobody.here')).toHaveLength(1)
  })

  it.each([
    ['too short', 'ab'],
    ['with a space inside', 'mei ling'],
    ['with a dash', 'mei-ling'],
    ['over 64 characters', 'a'.repeat(65)],
  ])('refuses a username %s without recording it', async (_, username) => {
    const count = async () => {
      await db.asOwner()
      const { rows } = await db.query<{ n: number }>(
        'select count(*)::int as n from public.login_attempts',
      )
      return rows[0]?.n
    }
    const before = await count()
    expect(await refusal(db, username)).toBe('invalid_username')
    expect(await count()).toBe(before)
  })

  it('allows 10 failures for a username from one IP, then refuses the 11th try', async () => {
    await failures(db, 'meiling', 9)
    await check(db, 'meiling')
    expect(await refusal(db, 'meiling')).toBe('too_many_attempts')
    // The refused try isn't recorded, so the wait never grows.
    expect(await attempts(db, 'meiling')).toHaveLength(10)
  })

  it('still lets the same username in from another IP (no lockout from many IPs)', async () => {
    await failures(db, 'meiling', 10)
    await failures(db, 'meiling', 10, { ip: '192.0.2.1' })
    expect((await check(db, 'meiling', OTHER_IP)).email).toBe('meiling@example.com')
  })

  it('refuses an IP with 30 failures for any usernames', async () => {
    await failures(db, 'farah', 9)
    await failures(db, 'weijie', 9)
    await failures(db, 'nobody.here', 9)
    await check(db, 'priya')
    await check(db, 'priya')
    await check(db, 'priya')
    expect(await refusal(db, 'meiling')).toBe('too_many_attempts')
    expect((await check(db, 'meiling', OTHER_IP)).email).toBe('meiling@example.com')
  })

  it('treats tries without an IP as one IP of their own', async () => {
    await failures(db, 'meiling', 10, { ip: null })
    expect(await refusal(db, 'meiling', null)).toBe('too_many_attempts')
    expect((await check(db, 'meiling')).email).toBe('meiling@example.com')
  })

  it('forgets failures older than 15 minutes', async () => {
    await failures(db, 'meiling', 10, { minutesAgo: 16 })
    expect((await check(db, 'meiling')).email).toBe('meiling@example.com')
  })

  it('deletes rows older than a day', async () => {
    await failures(db, 'farah', 3, { minutesAgo: 25 * 60 })
    await failures(db, 'farah', 2, { minutesAgo: 23 * 60 })
    await check(db, 'meiling')
    expect(await attempts(db, 'farah')).toHaveLength(2)
  })
})

describe.skipIf(!hasDatabase)('record_login_success', () => {
  const db = useTestDb()

  it('marks the try a success and forgets that username’s failures from that IP', async () => {
    await failures(db, 'meiling', 9)
    await failures(db, 'meiling', 2, { ip: OTHER_IP })
    await failures(db, 'farah', 2)
    const { attempt_id } = await check(db, 'meiling')
    await succeed(db, attempt_id)
    expect(await attempts(db, 'meiling')).toEqual([
      { ip: OTHER_IP, ok: false },
      { ip: OTHER_IP, ok: false },
      { ip: IP, ok: true },
    ])
    expect(await attempts(db, 'farah')).toHaveLength(2)
  })

  it('lets a person who got in mistype again without waiting', async () => {
    await failures(db, 'meiling', 9)
    await succeed(db, (await check(db, 'meiling')).attempt_id)
    await failures(db, 'meiling', 9)
    expect((await check(db, 'meiling')).email).toBe('meiling@example.com')
  })

  it('refuses a try that is unknown or already a success', async () => {
    const { attempt_id } = await check(db, 'meiling')
    await succeed(db, attempt_id)
    await asServiceRole(db)
    for (const id of [attempt_id, attempt_id + 1_000_000]) {
      const error = await db.expectFailure('select public.record_login_success($1)', [id])
      expect(error.message).toBe('not_found')
    }
  })
})

describe.skipIf(!hasDatabase)('who may run the login limit', () => {
  const db = useTestDb()

  it.each([
    ['visitors (anon)', (d: TestDb) => d.asAnon()],
    ['signed-in accounts', (d: TestDb) => d.as('herman')],
  ])('refuses %s', async (_, actAs) => {
    await actAs(db)
    for (const sql of [
      `select public.check_login_attempt('meiling', '${IP}')`,
      'select public.record_login_success(1)',
    ]) {
      const error = await db.expectFailure(sql)
      expect(error.code, sql).toBe(PERMISSION_DENIED)
    }
  })

  it('caps the stored username at 64 characters', async () => {
    const error = await db.expectFailure(
      `insert into public.login_attempts (username, ok) values (repeat('a', 65), false)`,
    )
    expect(error.code).toBe(CHECK_VIOLATION)
  })
})
