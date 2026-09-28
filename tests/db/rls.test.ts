// Row Level Security and grants: the TECH_SPEC §6 matrix and the §13 checklist.
import { describe, expect, it } from 'vitest'
import { hasDatabase, SEED, useTestDb } from './helpers'

const PERMISSION_DENIED = '42501'

describe.skipIf(!hasDatabase)('a customer (meiling)', () => {
  const db = useTestDb()

  async function names(sql: string) {
    const { rows } = await db.query<{ name: string }>(sql)
    return rows.map((r) => r.name).sort()
  }

  it('sees only her own profile', async () => {
    await db.as('meiling')
    expect(await names('select username as name from public.profiles')).toEqual(['meiling'])
  })

  it('sees only her students, groups and group members', async () => {
    await db.as('meiling')
    expect(await names('select name from public.students')).toEqual(['Aiman', 'Sofia'])
    expect(await names('select id::text as name from public.groups')).toEqual(
      [SEED.groups.aimanSofia, SEED.groups.sofia].sort(),
    )
    const { rows } = await db.query<{ n: number }>('select count(*) as n from public.group_members')
    expect(rows[0]?.n).toBe(3)
    expect(await names('select display_names as name from public.group_details')).toEqual([
      'Aiman & Sofia',
      'Sofia',
    ])
  })

  it('sees only her groups’ bookings and payments', async () => {
    await db.as('meiling')
    expect(await names('select id::text as name from public.bookings')).toEqual(
      [SEED.bookings.aimanSofiaSat26, SEED.bookings.aimanSofiaSat3, SEED.bookings.sofiaSun4].sort(),
    )
    expect(await names('select group_id::text as name from public.payments')).toEqual(
      [SEED.groups.aimanSofia, SEED.groups.sofia].sort(),
    )
    expect(await names('select booking_id::text as name from public.booking_ledger')).toHaveLength(
      3,
    )
    expect(await names('select group_id::text as name from public.group_balance')).toEqual(
      [SEED.groups.aimanSofia, SEED.groups.sofia].sort(),
    )
  })

  it('cannot read settings (she uses get_public_settings instead)', async () => {
    await db.as('meiling')
    const { rows } = await db.query('select * from public.settings')
    expect(rows).toEqual([])
  })

  it.each(['email_outbox', 'daily_jobs', 'login_attempts'])('cannot read %s', async (table) => {
    await db.as('meiling')
    const error = await db.expectFailure(`select * from public.${table}`)
    expect(error.code).toBe(PERMISSION_DENIED)
  })

  it('cannot insert bookings or payments directly', async () => {
    await db.as('meiling')
    const booking = await db.expectFailure(
      `insert into public.bookings (group_id, starts_at, ends_at, location)
       values ($1, '2026-09-29 19:30+08', '2026-09-29 20:30+08', 'Palm Court')`,
      [SEED.groups.aimanSofia],
    )
    expect(booking.code).toBe(PERMISSION_DENIED)
    const payment = await db.expectFailure(
      `insert into public.payments (group_id, lessons, amount_cents, method, paid_on)
       values ($1, 4, 0, 'cash', '2026-09-26')`,
      [SEED.groups.sofia],
    )
    expect(payment.code).toBe(PERMISSION_DENIED)
  })

  it('cannot change or delete bookings, groups or students directly', async () => {
    await db.as('meiling')
    for (const sql of [
      `update public.bookings set status = 'cancelled' where id = '${SEED.bookings.aimanSofiaSat3}'`,
      `delete from public.bookings where id = '${SEED.bookings.aimanSofiaSat3}'`,
      `update public.groups set opening_paid_lessons = 99 where id = '${SEED.groups.sofia}'`,
      `insert into public.students (account_id, name) values (auth.uid(), 'New')`,
      `insert into public.group_members (group_id, student_id)
       values ('${SEED.groups.sofia}', '${SEED.students.aiman}')`,
    ]) {
      const error = await db.expectFailure(sql)
      expect(error.code, sql).toBe(PERMISSION_DENIED)
    }
  })

  it('can change her own name and phone, but not her role, approval or username', async () => {
    await db.as('meiling')
    const updated = await db.query(
      `update public.profiles set display_name = 'Mei Ling Tan', phone = '012-345 6789'
       where username = 'meiling'`,
    )
    expect(updated.rowCount).toBe(1)
    for (const column of [`role = 'coach'`, 'approved = false', `username = 'boss'`]) {
      const error = await db.expectFailure(`update public.profiles set ${column}`)
      expect(error.code, column).toBe(PERMISSION_DENIED)
    }
  })

  it("cannot change someone else's profile", async () => {
    await db.as('meiling')
    const farah = await db.query(
      `update public.profiles set display_name = 'x' where username = 'farah'`,
    )
    expect(farah.rowCount).toBe(0)
    await db.asOwner()
    const { rows } = await db.query<{ display_name: string }>(
      `select display_name from public.profiles where username = 'farah'`,
    )
    expect(rows[0]?.display_name).toBe('Farah')
  })

  it('reads open hours and live announcements but cannot change them', async () => {
    await db.query(
      `insert into public.announcements (message, removed_at)
       values ('Pool closed on Friday', null), ('Old news', '2026-09-20 10:00+08')`,
    )
    await db.as('meiling')
    const rules = await db.query('select * from public.availability_rules')
    expect(rules.rowCount).toBe(9)
    expect(await names('select message as name from public.announcements')).toEqual([
      'Pool closed on Friday',
    ])
    for (const sql of [
      `insert into public.availability_rules (weekday, opens_at, closes_at) values (1, '06:00', '07:00')`,
      `insert into public.availability_exceptions (starts_at, ends_at, kind)
       values ('2026-10-07 15:00+08', '2026-10-07 17:30+08', 'open')`,
      `insert into public.announcements (message) values ('Free lessons for all')`,
    ]) {
      const error = await db.expectFailure(sql)
      expect(error.code, sql).toBe(PERMISSION_DENIED)
    }
    // Updates and deletes that no policy allows simply match no rows.
    expect((await db.query('delete from public.availability_rules')).rowCount).toBe(0)
    expect((await db.query('update public.announcements set pinned = false')).rowCount).toBe(0)
    expect((await db.query('update public.settings set travel_gap_minutes = 0')).rowCount).toBe(0)
  })

  it("sees when time is blocked but not the coach's note about it", async () => {
    await db.query(
      `insert into public.availability_exceptions (starts_at, ends_at, kind, note)
       values ('2026-10-06 17:30+08', '2026-10-06 19:00+08', 'closed', 'Make-up lesson for Hana')`,
    )
    await db.as('meiling')
    const { rows } = await db.query<{ kind: string; starts_at: Date }>(
      'select kind, starts_at, ends_at from public.availability_exceptions',
    )
    expect(rows).toEqual([expect.objectContaining({ kind: 'closed' })])
    for (const sql of [
      'select note from public.availability_exceptions',
      'select * from public.availability_exceptions',
    ]) {
      const error = await db.expectFailure(sql)
      expect(error.code, sql).toBe(PERMISSION_DENIED)
    }
  })
})

describe.skipIf(!hasDatabase)('an account waiting for approval', () => {
  const db = useTestDb()

  it('sees open hours but no one else’s data', async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
               'authenticated', 'stranger@example.com', '{"username": "stranger"}')
       returning id`,
    )
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: rows[0]?.id, role: 'authenticated' }),
    ])
    await db.query('set local role authenticated')
    const count = async (table: string) =>
      (await db.query<{ n: number }>(`select count(*) as n from public.${table}`)).rows[0]?.n
    expect(await count('profiles')).toBe(1)
    expect(await count('availability_rules')).toBe(9)
    for (const table of ['students', 'groups', 'group_members', 'bookings', 'payments']) {
      expect(await count(table), table).toBe(0)
    }
    expect(await count('group_balance')).toBe(0)
    const approved = await db.query<{ approved: boolean }>(
      'select public.is_approved() as approved',
    )
    expect(approved.rows[0]?.approved).toBe(false)
  })
})

describe.skipIf(!hasDatabase)('the coach (herman)', () => {
  const db = useTestDb()

  it('can read everything customers own', async () => {
    const tables = [
      'profiles',
      'students',
      'groups',
      'group_members',
      'bookings',
      'payments',
      'availability_rules',
      'settings',
      'group_details',
      'booking_ledger',
      'group_balance',
    ]
    const count = async () => {
      const counts: Record<string, number> = {}
      for (const table of tables) {
        const { rows } = await db.query<{ n: number }>(`select count(*) as n from public.${table}`)
        counts[table] = rows[0]?.n ?? -1
      }
      return counts
    }
    // The owner bypasses RLS, so it sees every row.
    const all = await count()
    await db.as('herman')
    expect(await count()).toEqual(all)
    expect(all).toMatchObject({
      students: 15,
      groups: 13,
      group_members: 16,
      bookings: 20,
      payments: 12,
      settings: 1,
      group_balance: 13,
    })
  })

  it('reads removed announcements too', async () => {
    await db.query(
      `insert into public.announcements (message, removed_at) values ('Old news', '2026-09-20 10:00+08')`,
    )
    await db.as('herman')
    expect((await db.query('select * from public.announcements')).rowCount).toBe(1)
  })

  it('can change open hours, announcements and settings directly', async () => {
    await db.as('herman')
    await db.query(
      `insert into public.availability_exceptions (starts_at, ends_at, kind, note)
       values ('2026-10-07 15:00+08', '2026-10-07 17:30+08', 'open', 'Extra time')`,
    )
    await db.query(`insert into public.announcements (message) values ('Pool closed on Friday')`)
    const settings = await db.query('update public.settings set travel_gap_minutes = 45')
    expect(settings.rowCount).toBe(1)
  })

  it('writes bookings and payments only through functions', async () => {
    await db.as('herman')
    const error = await db.expectFailure(
      `insert into public.payments (group_id, lessons, amount_cents, method, paid_on)
       values ($1, 4, 0, 'cash', '2026-09-26')`,
      [SEED.groups.hana],
    )
    expect(error.code).toBe(PERMISSION_DENIED)
  })

  it.each(['email_outbox', 'daily_jobs', 'login_attempts'])(
    'cannot read %s either (service role only)',
    async (table) => {
      await db.as('herman')
      const error = await db.expectFailure(`select * from public.${table}`)
      expect(error.code).toBe(PERMISSION_DENIED)
    },
  )
})

describe.skipIf(!hasDatabase)('signed-out visitors (anon)', () => {
  const db = useTestDb()

  it.each(['profiles', 'bookings', 'availability_rules', 'settings', 'group_balance'])(
    'cannot read %s',
    async (table) => {
      await db.asAnon()
      const error = await db.expectFailure(`select * from public.${table}`)
      expect(error.code).toBe(PERMISSION_DENIED)
    },
  )
})

describe.skipIf(!hasDatabase)('security checklist (TECH_SPEC §13)', () => {
  const db = useTestDb()

  it('has RLS enabled on every table', async () => {
    const { rows } = await db.query<{ name: string }>(
      `select relname as name from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`,
    )
    expect(rows).toEqual([])
  })

  it('makes every view security_invoker', async () => {
    const { rows } = await db.query<{ name: string }>(
      `select relname as name from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'v'
         and not coalesce('security_invoker=true' = any (reloptions), false)`,
    )
    expect(rows).toEqual([])
  })

  it('gives anon no table or view privileges', async () => {
    const { rows } = await db.query<{ name: string }>(
      `select c.relname as name from pg_class c
       where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v', 'm')
         and (has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate, references, trigger')
              or has_any_column_privilege('anon', c.oid, 'select, insert, update, references'))`,
    )
    expect(rows).toEqual([])
  })

  it('grants direct writes to signed-in users only where TECH_SPEC §6 allows them', async () => {
    const { rows } = await db.query<{ name: string; privilege: string }>(
      `select c.relname as name, p.privilege
       from pg_class c
       cross join unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) as p (privilege)
       where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v')
         and (has_table_privilege('authenticated', c.oid, p.privilege)
              or (p.privilege in ('INSERT', 'UPDATE')
                  and has_any_column_privilege('authenticated', c.oid, p.privilege)))
       order by 1, 2`,
    )
    expect(rows.map((r) => `${r.name} ${r.privilege}`)).toEqual([
      'announcements DELETE',
      'announcements INSERT',
      'announcements UPDATE',
      'availability_exceptions DELETE',
      'availability_exceptions INSERT',
      'availability_exceptions UPDATE',
      'availability_rules DELETE',
      'availability_rules INSERT',
      'availability_rules UPDATE',
      'profiles UPDATE', // display_name and phone only (checked above)
      'settings UPDATE',
    ])
  })

  it('lets anon execute no function', async () => {
    // Prompt 04 adds username_available here, and only that.
    const { rows } = await db.query<{ name: string }>(
      `select p.oid::regprocedure::text as name from pg_proc p
       where p.pronamespace = 'public'::regnamespace
         and has_function_privilege('anon', p.oid, 'execute')`,
    )
    expect(rows).toEqual([])
  })

  it('lets signed-in users execute only the functions meant for them', async () => {
    // New functions start with no grants (TECH_SPEC §6). Later prompts add every RPC the
    // browser calls, from customers or the coach; update this list deliberately when they do.
    const { rows } = await db.query<{ name: string }>(
      `select p.oid::regprocedure::text as name from pg_proc p
       where p.pronamespace = 'public'::regnamespace
         and has_function_privilege('authenticated', p.oid, 'execute')
       order by 1`,
    )
    expect(rows.map((r) => r.name)).toEqual([
      'app_now()',
      'is_approved()',
      'is_coach()',
      'lessons_for(timestamp with time zone,timestamp with time zone)',
      'my_account_id()',
      'package_settings()',
    ])
  })

  it('sets an empty search_path on every function', async () => {
    const { rows } = await db.query<{ name: string }>(
      `select p.oid::regprocedure::text as name from pg_proc p
       where p.pronamespace = 'public'::regnamespace
         and not coalesce('search_path=""' = any (p.proconfig), false)`,
    )
    expect(rows).toEqual([])
  })
})
