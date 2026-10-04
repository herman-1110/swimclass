// Hardening from the 4 Oct 2026 audit (supabase/migrations/…_hardening.sql): a customer's
// 10 changes in 24 hours, the table caps, the open-hours range cap and username_available's
// length guard. The coach's direct writes being revoked is in rls.test.ts. The clock is at
// Sat 26 Sep 2026 12:00 MYT; the change limit counts real time (now()).
import { describe, expect, it } from 'vitest'

import { SEED } from './fixture'
import { hasDatabase, type TestDb, useTestDb } from './helpers'

const CHECK_VIOLATION = '23514'
const TOO_MANY_CHANGES = { message: 'too_many_changes', detail: { limit: 10 } }

/** The error of SQL that must fail: its message and parsed detail. */
async function failure(db: TestDb, sql: string, params?: readonly unknown[]) {
  const error = await db.expectFailure(sql, params)
  const detail: unknown = error.detail ? JSON.parse(error.detail) : null
  return { message: error.message, detail }
}

/** Records `count` earlier changes for an account, `hoursAgo` hours back (as the owner). */
async function earlierChanges(db: TestDb, username: string, count: number, hoursAgo = 1) {
  await db.asOwner()
  await db.query(
    `insert into public.booking_changes (account_id, changed_at)
     select $1, now() - make_interval(hours => $3) from generate_series(1, $2)`,
    [await db.idOf(username), count, hoursAgo],
  )
}

/** The changes recorded for an account (as the owner). */
async function changes(db: TestDb, username: string) {
  await db.asOwner()
  const { rows } = await db.query<{ n: number }>(
    'select count(*)::int as n from public.booking_changes where account_id = $1',
    [await db.idOf(username)],
  )
  return rows[0]?.n
}

const BOOK = 'select public.book_lesson($1, $2, 60, $3)'
const CANCEL = 'select public.cancel_booking($1)'

describe.skipIf(!hasDatabase)('a customer’s booking changes', () => {
  const db = useTestDb()

  it('allows 10 in 24 hours, then refuses cancelling', async () => {
    await earlierChanges(db, 'meiling', 9)
    await db.as('meiling')
    await db.query(BOOK, [SEED.groups.aimanSofia, '2026-09-29 19:30+08', 1])
    expect(await failure(db, CANCEL, [SEED.bookings.aimanSofiaSat3])).toEqual(TOO_MANY_CHANGES)
    expect(await changes(db, 'meiling')).toBe(10)
  })

  it('refuses an 11th booking', async () => {
    await earlierChanges(db, 'meiling', 10)
    await db.as('meiling')
    expect(await failure(db, BOOK, [SEED.groups.aimanSofia, '2026-09-29 19:30+08', 1])).toEqual(
      TOO_MANY_CHANGES,
    )
    expect(await changes(db, 'meiling')).toBe(10)
  })

  it('counts a repeat-weekly booking once', async () => {
    await earlierChanges(db, 'meiling', 9)
    await db.as('meiling')
    const { rows } = await db.query<{ ids: string[] }>(
      'select public.book_lesson($1, $2, 60, 3) as ids',
      [SEED.groups.aimanSofia, '2026-09-29 19:30+08'],
    )
    expect(rows[0]?.ids).toHaveLength(3)
    expect(await changes(db, 'meiling')).toBe(10)
  })

  it('forgets changes older than 24 hours', async () => {
    await earlierChanges(db, 'meiling', 10, 25)
    await db.as('meiling')
    await db.query(CANCEL, [SEED.bookings.aimanSofiaSat3])
    expect(await changes(db, 'meiling')).toBe(11)
  })

  it('never limits or counts the coach', async () => {
    await earlierChanges(db, 'meiling', 10)
    await db.as('herman')
    await db.query(CANCEL, [SEED.bookings.aimanSofiaSat3])
    await db.query('select public.coach_book($1, $2, 60, 1, false, false, false)', [
      SEED.groups.aimanSofia,
      '2026-09-29 19:30+08',
    ])
    expect(await changes(db, 'meiling')).toBe(10)
    expect(await changes(db, 'herman')).toBe(0)
  })

  it('records nothing when the change is refused', async () => {
    await db.as('meiling')
    // Wei Jie's lesson isn't hers (not_your_booking).
    await db.expectFailure(CANCEL, [SEED.bookings.weiJieFri2])
    expect(await changes(db, 'meiling')).toBe(0)
  })
})

describe.skipIf(!hasDatabase)('table caps', () => {
  const db = useTestDb()

  it.each([
    [
      'payment instructions over 2000 characters',
      `update public.settings set payment_instructions = repeat('x', 2001)`,
    ],
    [
      'a time-off note over 500 characters',
      `insert into public.availability_exceptions (starts_at, ends_at, kind, note)
       values ('2026-10-07 15:00+08', '2026-10-07 17:30+08', 'closed', repeat('x', 501))`,
    ],
    [
      'a cancel reason over 500 characters',
      `update public.bookings set cancel_reason = repeat('x', 501)
       where id = '${SEED.bookings.aimanSofiaSat3}'`,
    ],
    [
      'a payment for more than 100 lessons',
      `insert into public.payments (group_id, lessons, amount_cents, method, paid_on)
       values ('${SEED.groups.hana}', 101, 0, 'cash', '2026-09-26')`,
    ],
    [
      'a payment over RM 100,000',
      `insert into public.payments (group_id, lessons, amount_cents, method, paid_on)
       values ('${SEED.groups.hana}', 4, 10000001, 'cash', '2026-09-26')`,
    ],
    [
      'a starting balance over 10,000 lessons',
      `update public.groups set opening_used_lessons = 10001 where id = '${SEED.groups.hana}'`,
    ],
  ])('refuses %s', async (_, sql) => {
    const error = await db.expectFailure(sql)
    expect(error.code).toBe(CHECK_VIOLATION)
  })

  /** Weekly ranges: `perDay` half-hour ranges an hour apart on each of the 7 days. */
  function rules(perDay: number) {
    return JSON.stringify(
      Array.from({ length: 7 }, (_, day) =>
        Array.from({ length: perDay }, (_, i) => ({
          weekday: day + 1,
          opens_at: `${String(6 + i).padStart(2, '0')}:00`,
          closes_at: `${String(6 + i).padStart(2, '0')}:30`,
        })),
      ).flat(),
    )
  }

  it('takes up to 50 open-hours ranges and refuses more', async () => {
    await db.as('herman')
    await db.query('select public.set_open_hours($1::jsonb)', [rules(7)]) // 49
    expect(await failure(db, 'select public.set_open_hours($1::jsonb)', [rules(8)])).toEqual({
      message: 'too_many_rules',
      detail: null,
    })
  })

  it('answers false for a username longer than 64 characters, and still checks others', async () => {
    await db.asAnon()
    const { rows } = await db.query<{ long: boolean; free: boolean; taken: boolean }>(
      `select public.username_available(repeat('a', 65)) as long,
              public.username_available('brand.new') as free,
              public.username_available('meiling') as taken`,
    )
    expect(rows[0]).toEqual({ long: false, free: true, taken: false })
  })
})
