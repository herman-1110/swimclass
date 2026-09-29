// Shared setup for the database tests. Each test runs inside a transaction that is
// rolled back afterwards, so the dev database keeps the seed exactly as loaded.
//
// DATABASE_URL (in .env.local) must point at the swimclass-dev project with
// supabase/seed.sql loaded, never at production. Without it the database tests are
// skipped (see docs/DEV_SETUP.md).
import { readFileSync } from 'node:fs'

import pg from 'pg'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

export const DATABASE_URL = process.env.DATABASE_URL
export const hasDatabase = Boolean(DATABASE_URL)

if (!hasDatabase) {
  console.warn('DATABASE_URL is not set, so the database tests are skipped (docs/DEV_SETUP.md).')
}

/** Sat 26 Sep 2026, 12:00 MYT: the clock the seed's expected results assume (TECH_SPEC §10). */
export const FIXTURE_NOW = '2026-09-26 12:00+08'

// `date` values stay 'YYYY-MM-DD' strings: pg would otherwise turn them into midnight
// in the device's time zone. Counts (bigint) become numbers. timestamptz stays a Date,
// which is an exact instant.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value)
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value))

const SLOW = 30_000

// Supabase signs its database certificates with its own root CA, which Node doesn't
// know, so it is pinned here (taken from the pooler's certificate chain; compare with
// Dashboard → Project Settings → Database → SSL configuration → Download certificate).
// SHA-256 80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA
const SUPABASE_CA = readFileSync(new URL('./supabase-root-2021-ca.crt', import.meta.url), 'utf8')

// The tests expect the seed exactly as loaded: not shifted by shift-seed.sql, nothing
// added, edited or cancelled. SEED_STATE fingerprints what the tests depend on (students,
// groups, members, bookings, payments, open hours, every setting, the seeded accounts'
// names, phones, roles and approval; no exceptions or announcements), independent of the
// session's time zone and date style. Extra sign-ups are fine: they have no groups or
// lessons, and the tests that email every approved customer read that list from the
// database. The outbox isn't fingerprinted: tests read only the rows they added.
// When seed.sql changes, reload the dev database and copy the new fingerprint from the
// error message into SEED_FINGERPRINT.
const SEED_FINGERPRINT = '3de5174d89dc7791f1f9d8e5032c39e9'
const SEED_STATE = `
  select
    exists (select 1 from public.profiles where username = 'meiling') as seeded,
    md5(concat_ws('|',
      (select string_agg(concat_ws(',', id, account_id, name, active), ';' order by id)
       from public.students),
      (select string_agg(concat_ws(',', id, account_id, location, active,
                                   opening_used_lessons, opening_paid_lessons), ';' order by id)
       from public.groups),
      (select string_agg(concat_ws(',', group_id, student_id), ';' order by group_id, student_id)
       from public.group_members),
      (select string_agg(concat_ws(',', id, group_id, extract(epoch from starts_at)::bigint,
                                   extract(epoch from ends_at)::bigint, status, gap_override),
                         ';' order by id)
       from public.bookings),
      (select string_agg(concat_ws(',', id, group_id, lessons, amount_cents, method,
                                   to_char(paid_on, 'YYYY-MM-DD')), ';' order by id)
       from public.payments),
      (select string_agg(concat_ws(',', weekday, to_char(opens_at, 'HH24:MI'),
                                   to_char(closes_at, 'HH24:MI')), ';' order by weekday, opens_at)
       from public.availability_rules),
      -- Every setting (jsonb keeps nulls in place and prints times the same way whatever
      -- the session's settings); updated_at changes on every save.
      (select (to_jsonb(s) - 'updated_at')::text from public.settings s),
      (select count(*) from public.availability_exceptions),
      (select count(*) from public.announcements),
      (select string_agg(concat_ws(',', id, username, display_name, coalesce(phone, '-'), role,
                                   approved), ';' order by id)
       from public.profiles
       where id::text like 'a0000000-0000-4000-8000-%')
    )) as fingerprint`

/** Opens a connection to the test database and checks that it holds the seed as loaded. */
export async function connect(): Promise<pg.Client> {
  if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')
  const { hostname } = new URL(DATABASE_URL)
  const local = hostname === 'localhost' || hostname === '127.0.0.1'
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: local ? false : { ca: SUPABASE_CA },
  })
  await client.connect()
  const { rows } = await client.query<{ seeded: boolean; fingerprint: string }>(SEED_STATE)
  const state = rows[0]
  const problem = !state?.seeded
    ? 'The seed is missing. DATABASE_URL must point at swimclass-dev with supabase/seed.sql loaded.'
    : state.fingerprint !== SEED_FINGERPRINT
      ? 'The dev database has changed since the seed was loaded (sample week shifted, or ' +
        'lessons, students, open hours or settings added or edited). Reload it with ' +
        'npx supabase db reset --linked, after checking that npx supabase projects list marks ' +
        `swimclass-dev as linked (docs/DEV_SETUP.md §3). Fingerprint ${state.fingerprint}.`
      : null
  if (problem) {
    await client.end()
    throw new Error(problem)
  }
  // Nothing may ever commit on the shared dev database. Tests write only inside their
  // own `begin read write` transaction (see `begin`), which is always rolled back. A
  // statement that runs outside one (for example the rest of a test body that carries on
  // after the test timed out and its transaction was rolled back) is read-only, so a
  // write fails instead of committing.
  await client.query('set default_transaction_read_only = on')
  return client
}

export type TestDb = {
  /** Runs SQL as whoever the test is currently acting as. */
  query<R extends pg.QueryResultRow = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<pg.QueryResult<R>>
  /** Acts as a signed-in user (role authenticated with that user's JWT claims). */
  as(username: string): Promise<void>
  /** Acts as a signed-out visitor (role anon). */
  asAnon(): Promise<void>
  /** Back to the connection's own role (postgres), which bypasses RLS. */
  asOwner(): Promise<void>
  /** Pins app_now(); null clears it so app_now() is the real time again. */
  setNow(at: string | null): Promise<void>
  /** The seeded account id for a username. */
  idOf(username: string): Promise<string>
  /** Runs SQL that must fail and returns the error; the transaction stays usable. */
  expectFailure(sql: string, params?: readonly unknown[]): Promise<pg.DatabaseError>
}

/**
 * Registers hooks for the surrounding `describe`: one connection per file, and per
 * test a transaction (rolled back afterwards) with the clock pinned to FIXTURE_NOW,
 * acting as the owner. The session time zone is set far from Malaysia so SQL that
 * relies on it instead of Asia/Kuala_Lumpur fails.
 */
export function useTestDb(): TestDb {
  let client: pg.Client | undefined
  const db = actingOn(() => {
    if (!client) throw new Error('Not connected')
    return client
  })

  beforeAll(async () => {
    client = await connect()
  }, SLOW)

  afterAll(async () => {
    await client?.end()
  })

  beforeEach(async () => {
    await begin(db)
  }, SLOW)

  afterEach(async () => {
    await db.query('rollback')
  }, SLOW)

  return db
}

/**
 * Starts a test transaction (the only place writes are allowed, see `connect`): the time
 * zone far from Malaysia, the clock at FIXTURE_NOW.
 */
async function begin(db: TestDb) {
  await db.query('begin read write')
  await db.query(`set local timezone = 'America/Los_Angeles'`)
  await db.setNow(FIXTURE_NOW)
}

/** How long a concurrency-test session waits for another session's lock. */
export const SESSION_LOCK_TIMEOUT_MS = 3_000

export type Session = TestDb & {
  /** The server process id, to find this session's locks in pg_locks. */
  pid: number
  /** Rolls the session's transaction back and disconnects. */
  close(): Promise<void>
}

/**
 * A second connection for concurrency tests, like a second browser: its own
 * transaction, set up like a test's (clock, time zone, acting as the owner until `as`).
 * It never commits: close() rolls it back, so the dev database keeps the seed. As
 * neither of two racing sessions commits, the one that has to wait for the other's lock
 * gives up after SESSION_LOCK_TIMEOUT_MS (lock_timeout) instead of waiting for a commit
 * that never comes. Always close() it, in a `finally`.
 */
export async function openSession(): Promise<Session> {
  const client = await connect()
  const db = actingOn(() => client)
  try {
    await begin(db)
    await db.query(`set local lock_timeout = '${SESSION_LOCK_TIMEOUT_MS}ms'`)
    await db.query(`set local statement_timeout = '20s'`)
    const { rows } = await db.query<{ pid: number }>('select pg_backend_pid() as pid')
    const pid = rows[0]?.pid
    if (!pid) throw new Error('No backend process id')
    return {
      ...db,
      pid,
      async close() {
        try {
          await client.query('rollback')
        } finally {
          await client.end()
        }
      },
    }
  } catch (error) {
    await client.end()
    throw error
  }
}

/** The TestDb methods on one connection. */
function actingOn(c: () => pg.Client): TestDb {
  const ids = new Map<string, string>()

  const db: TestDb = {
    query: (sql, params) => c().query(sql, params && [...params]),

    async idOf(username) {
      const cached = ids.get(username)
      if (cached) return cached
      // Only called as the owner (see `as`), so RLS doesn't hide the row.
      const { rows } = await c().query<{ id: string }>(
        'select id from public.profiles where username = $1',
        [username],
      )
      const id = rows[0]?.id
      if (!id) throw new Error(`No seeded account called ${username}`)
      ids.set(username, id)
      return id
    },

    async as(username) {
      await db.asOwner()
      const id = await db.idOf(username)
      await c().query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: id, role: 'authenticated' }),
      ])
      await c().query('set local role authenticated')
    },

    async asAnon() {
      await db.asOwner()
      await c().query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ role: 'anon' }),
      ])
      await c().query('set local role anon')
    },

    async asOwner() {
      await c().query('reset role')
      await c().query(`select set_config('request.jwt.claims', '', true)`)
    },

    async setNow(at) {
      await c().query(`select set_config('app.now', $1, true)`, [at ?? ''])
    },

    async expectFailure(sql, params) {
      await c().query('savepoint expect_failure')
      try {
        await c().query(sql, params && [...params])
      } catch (error) {
        await c().query('rollback to savepoint expect_failure')
        if (error instanceof pg.DatabaseError) return error
        throw error
      }
      await c().query('release savepoint expect_failure')
      throw new Error(`Expected this SQL to fail, but it succeeded:\n${sql}`)
    },
  }

  return db
}

/** Fixed ids from supabase/seed.sql. */
export const SEED = {
  groups: {
    aimanSofia: 'c0000000-0000-4000-8000-000000000001',
    sofia: 'c0000000-0000-4000-8000-000000000002',
    hana: 'c0000000-0000-4000-8000-000000000003',
    weiJie: 'c0000000-0000-4000-8000-000000000004',
    priya: 'c0000000-0000-4000-8000-000000000005',
    adamAlyaAmir: 'c0000000-0000-4000-8000-000000000006',
    junHao: 'c0000000-0000-4000-8000-000000000007',
    chloe: 'c0000000-0000-4000-8000-000000000008',
    ethan: 'c0000000-0000-4000-8000-000000000009',
    kai: 'c0000000-0000-4000-8000-000000000010',
    daniel: 'c0000000-0000-4000-8000-000000000011',
    aina: 'c0000000-0000-4000-8000-000000000012',
    nurul: 'c0000000-0000-4000-8000-000000000013',
  },
  students: {
    aiman: 'b0000000-0000-4000-8000-000000000001',
    sofia: 'b0000000-0000-4000-8000-000000000002',
    hana: 'b0000000-0000-4000-8000-000000000003',
    adam: 'b0000000-0000-4000-8000-000000000006',
  },
  bookings: {
    aimanSofiaSat26: 'd0000000-0000-4000-8000-000000000001',
    aimanSofiaSat3: 'd0000000-0000-4000-8000-000000000002',
    sofiaSun4: 'd0000000-0000-4000-8000-000000000003',
    weiJieFri18: 'd0000000-0000-4000-8000-000000000006',
    weiJieFri25: 'd0000000-0000-4000-8000-000000000007',
    weiJieFri2: 'd0000000-0000-4000-8000-000000000008',
    priyaTue29: 'd0000000-0000-4000-8000-000000000009',
    junHaoMon28: 'd0000000-0000-4000-8000-000000000013',
    chloeSun4: 'd0000000-0000-4000-8000-000000000014',
    ethanSat26: 'd0000000-0000-4000-8000-000000000015',
  },
} as const

/** An instant written in MYT, e.g. myt('2026-10-04 17:00'). */
export function myt(dateTime: string): Date {
  return new Date(`${dateTime.replace(' ', 'T')}:00+08:00`)
}
