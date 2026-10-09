// Groups and accounts (TECH_SPEC §5.3, prompt 04; PRD BR-1, BR-2, BR-6, BR-7, BR-25):
// create_group, update_group, set_group_active, delete_group, approve_account and
// username_available against the seed, with the clock at Sat 26 Sep 2026 12:00 MYT.
import { describe, expect, it } from 'vitest'

import { SEED } from './fixture'
import { hasDatabase, type TestDb, useTestDb } from './helpers'

const PERMISSION_DENIED = '42501'
const MISSING_GROUP = 'c0000000-0000-4000-8000-0000000000ff'

type GroupOptions = {
  firstPackagePaid?: boolean
  amountCents?: number | null
  method?: string | null
  openingUsed?: number | null
  openingPaid?: number | null
}

const CREATE_GROUP = 'select public.create_group($1, $2, $3, $4, $5, $6, $7, $8) as id'

/** create_group's parameters; `students` is sent as JSON (undefined sends SQL null). */
function createGroupParams(
  accountId: string,
  students: unknown,
  location: string | null,
  o: GroupOptions = {},
) {
  return [
    accountId,
    students === undefined ? null : JSON.stringify(students),
    location,
    o.firstPackagePaid ?? false,
    o.amountCents ?? null,
    o.method ?? null,
    o.openingUsed ?? 0,
    o.openingPaid ?? 0,
  ]
}

async function createGroup(
  db: TestDb,
  accountId: string,
  students: unknown,
  location: string | null,
  options: GroupOptions = {},
) {
  const { rows } = await db.query<{ id: string }>(
    CREATE_GROUP,
    createGroupParams(accountId, students, location, options),
  )
  return rows[0]?.id ?? ''
}

/** The error of SQL that must fail: its message and parsed detail. */
async function failure(db: TestDb, sql: string, params?: readonly unknown[]) {
  const error = await db.expectFailure(sql, params)
  const detail: unknown = error.detail ? JSON.parse(error.detail) : null
  return { message: error.message, detail }
}

/** A group as the coach sees it (read as the owner, who acts as the owner afterwards). */
async function group(db: TestDb, id: string) {
  await db.asOwner()
  const { rows } = await db.query<{
    account_id: string
    display_names: string
    type_label: string
    size: number
    location: string
    active: boolean
    opening_used_lessons: number
    opening_paid_lessons: number
  }>(
    `select account_id, display_names, type_label, size, location, active,
            opening_used_lessons, opening_paid_lessons
     from public.group_details where group_id = $1`,
    [id],
  )
  return rows[0]
}

async function paymentsOf(db: TestDb, groupId: string) {
  await db.asOwner()
  const { rows } = await db.query<{
    lessons: number
    amount_cents: number
    method: string
    paid_on: string
  }>(
    `select lessons, amount_cents, method::text, paid_on from public.payments
     where group_id = $1 order by created_at, id`,
    [groupId],
  )
  return rows
}

async function countGroups(db: TestDb) {
  await db.asOwner()
  const { rows } = await db.query<{ n: number }>('select count(*) as n from public.groups')
  return rows[0]?.n
}

/** Acts as an account that isn't in the seed (as useTestDb's `as` does for seeded ones). */
async function actAs(db: TestDb, accountId: string) {
  await db.asOwner()
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub: accountId, role: 'authenticated' }),
  ])
  await db.query('set local role authenticated')
}

describe.skipIf(!hasDatabase)('create_group', () => {
  const db = useTestDb()

  it('adds a 1-to-3 group of three new students for zulaikha, which she can then book for', async () => {
    const zulaikha = await db.idOf('zulaikha')
    await db.as('herman')
    const id = await createGroup(
      db,
      zulaikha,
      [{ name: 'Hakim' }, { name: ' Iman ' }, { name: 'Zara' }],
      'Maple Condo',
    )
    expect(await group(db, id)).toEqual({
      account_id: zulaikha,
      display_names: 'Hakim, Iman & Zara',
      type_label: '1-to-3',
      size: 3,
      location: 'Maple Condo',
      active: true,
      opening_used_lessons: 0,
      opening_paid_lessons: 0,
    })
    expect(await paymentsOf(db, id)).toEqual([])

    // Her "Who's this lesson for?" list (group_details) shows it, and she may book for it
    // on credit (one unpaid package).
    await db.as('zulaikha')
    const { rows } = await db.query<{ display_names: string; type_label: string }>(
      'select display_names, type_label from public.group_details order by display_names',
    )
    expect(rows).toEqual([
      { display_names: 'Adam, Alya & Amir', type_label: '1-to-3' },
      { display_names: 'Hakim, Iman & Zara', type_label: '1-to-3' },
    ])
    const { rows: names } = await db.query<{ name: string }>(
      'select name from public.students order by name',
    )
    expect(names.map((s) => s.name)).toEqual(['Adam', 'Alya', 'Amir', 'Hakim', 'Iman', 'Zara'])
    const booked = await db.query<{ ids: string[] }>(
      'select public.book_lesson($1, $2, 60) as ids',
      [id, '2026-09-29 19:30+08'],
    )
    expect(booked.rows[0]?.ids).toHaveLength(1)
  })

  it('mixes existing students and new ones, with starting balances and the first package paid', async () => {
    const meiling = await db.idOf('meiling')
    await db.as('herman')
    const id = await createGroup(
      db,
      meiling,
      [{ student_id: SEED.students.aiman }, { name: 'Adik' }],
      ' Palm Court ',
      {
        firstPackagePaid: true,
        amountCents: 40000,
        method: 'cash',
        openingUsed: 2,
        openingPaid: 3,
      },
    )
    expect(await group(db, id)).toMatchObject({
      display_names: 'Adik & Aiman',
      type_label: '1-to-2',
      location: 'Palm Court',
      opening_used_lessons: 2,
      opening_paid_lessons: 3,
    })
    // Dated today in MYT (the session is in Los Angeles, where it is still Fri 25 Sep).
    expect(await paymentsOf(db, id)).toEqual([
      { lessons: 4, amount_cents: 40000, method: 'cash', paid_on: '2026-09-26' },
    ])
    const { rows } = await db.query<{ paid_lessons: number; can_still_book: number }>(
      'select paid_lessons, can_still_book from public.group_balance where group_id = $1',
      [id],
    )
    expect(rows[0]).toEqual({ paid_lessons: 7, can_still_book: 9 })
  })

  it('takes the first payment from the type’s package price when no amount is given', async () => {
    const meiling = await db.idOf('meiling')
    const before = await countGroups(db)
    await db.as('herman')
    const students = [{ student_id: SEED.students.aiman }, { name: 'Adik' }]
    const paid = { firstPackagePaid: true, method: 'transfer' }
    expect(
      await failure(db, CREATE_GROUP, createGroupParams(meiling, students, 'Palm Court', paid)),
    ).toMatchObject({ message: 'price_not_set' })
    expect(await countGroups(db)).toBe(before)

    await db.query('update public.settings set price_1to2_cents = 42000 where id = 1')
    await db.as('herman')
    const id = await createGroup(db, meiling, students, 'Palm Court', paid)
    expect(await paymentsOf(db, id)).toEqual([
      { lessons: 4, amount_cents: 42000, method: 'transfer', paid_on: '2026-09-26' },
    ])
  })

  it('refuses an exact duplicate of an active group (in any order) until it is deactivated', async () => {
    const meiling = await db.idOf('meiling')
    await db.as('herman')
    const duplicates: [unknown[], string][] = [
      [
        [{ student_id: SEED.students.aiman }, { student_id: SEED.students.sofia }],
        SEED.groups.aimanSofia,
      ],
      [
        [{ student_id: SEED.students.sofia }, { student_id: SEED.students.aiman }],
        SEED.groups.aimanSofia,
      ],
      [[{ student_id: SEED.students.sofia }], SEED.groups.sofia],
    ]
    for (const [students, existing] of duplicates) {
      expect(
        await failure(db, CREATE_GROUP, createGroupParams(meiling, students, 'Palm Court')),
      ).toEqual({ message: 'duplicate_group', detail: { group_id: existing } })
    }

    // Aiman alone is a new group; a second one isn't, until the first is deactivated.
    const aiman = [{ student_id: SEED.students.aiman }]
    const first = await createGroup(db, meiling, aiman, 'Palm Court')
    expect(
      await failure(db, CREATE_GROUP, createGroupParams(meiling, aiman, 'Palm Court')),
    ).toEqual({ message: 'duplicate_group', detail: { group_id: first } })
    await db.query('select public.set_group_active($1, false)', [first])
    const second = await createGroup(db, meiling, aiman, 'Palm Court')
    expect(second).not.toBe(first)
    // …and the first can't come back while the second is active.
    expect(await failure(db, 'select public.set_group_active($1, true)', [first])).toEqual({
      message: 'duplicate_group',
      detail: { group_id: second },
    })
  })

  it('checks the students list', async () => {
    const meiling = await db.idOf('meiling')
    await db.as('herman')
    const aiman = { student_id: SEED.students.aiman }
    const cases: [unknown, string, unknown][] = [
      [[], 'invalid_students', null],
      [{ name: 'Adik' }, 'invalid_students', null],
      [null, 'invalid_students', null],
      [undefined, 'invalid_students', null],
      [[{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }], 'group_full', { max: 3 }],
      [[{ student_id: SEED.students.hana }], 'student_other_account', { index: 1 }],
      [[{ student_id: 'nope' }], 'invalid_students', { index: 1 }],
      [[{ student_id: 'b0000000-0000-4000-8000-0000000000ff' }], 'invalid_students', { index: 1 }],
      [[aiman, aiman], 'invalid_students', { index: 2 }],
      [[{ ...aiman, name: 'Adik' }], 'invalid_students', { index: 1 }],
      [[{}], 'invalid_students', { index: 1 }],
      [['Adik'], 'invalid_students', { index: 1 }],
      [[aiman, { name: '   ' }], 'invalid_name', { index: 2 }],
      [[{ name: 42 }], 'invalid_name', { index: 1 }],
      [[{ name: 'x'.repeat(101) }], 'invalid_name', { index: 1 }],
    ]
    for (const [students, message, detail] of cases) {
      expect(
        await failure(db, CREATE_GROUP, createGroupParams(meiling, students, 'Palm Court')),
        JSON.stringify(students) ?? 'undefined',
      ).toEqual({ message, detail })
    }

    await db.asOwner()
    await db.query('update public.settings set max_students_per_lesson = 2 where id = 1')
    await db.as('herman')
    expect(
      await failure(
        db,
        CREATE_GROUP,
        createGroupParams(meiling, [{ name: 'A' }, { name: 'B' }, { name: 'C' }], 'Palm Court'),
      ),
    ).toEqual({ message: 'group_full', detail: { max: 2 } })
  })

  it('checks the account, pool, starting balances and first payment', async () => {
    const meiling = await db.idOf('meiling')
    const herman = await db.idOf('herman')
    await db.as('herman')
    const adik = [{ name: 'Adik' }]
    const cases: [unknown[], string][] = [
      [createGroupParams('a0000000-0000-4000-8000-0000000000ff', adik, 'Palm Court'), 'not_found'],
      [createGroupParams(herman, adik, 'Palm Court'), 'not_customer'],
      [createGroupParams(meiling, adik, ''), 'invalid_location'],
      [createGroupParams(meiling, adik, '   '), 'invalid_location'],
      [createGroupParams(meiling, adik, null), 'invalid_location'],
      [createGroupParams(meiling, adik, 'x'.repeat(101)), 'invalid_location'],
      [createGroupParams(meiling, adik, 'Palm Court', { openingUsed: -1 }), 'invalid_opening'],
      [createGroupParams(meiling, adik, 'Palm Court', { openingPaid: -1 }), 'invalid_opening'],
      [
        createGroupParams(meiling, adik, 'Palm Court', { firstPackagePaid: true }),
        'invalid_method',
      ],
      [
        createGroupParams(meiling, adik, 'Palm Court', {
          firstPackagePaid: true,
          amountCents: -1,
          method: 'cash',
        }),
        'invalid_amount',
      ],
    ]
    for (const [params, message] of cases) {
      expect(await failure(db, CREATE_GROUP, params), message).toMatchObject({ message })
    }
    await db.as('meiling')
    expect(
      await failure(db, CREATE_GROUP, createGroupParams(meiling, adik, 'Palm Court')),
    ).toMatchObject({ message: 'not_coach' })
  })
})

describe.skipIf(!hasDatabase)('update_group', () => {
  const db = useTestDb()

  it('moves the group’s upcoming lessons to its new pool; past lessons keep theirs', async () => {
    await db.as('herman')
    await db.query('select public.update_group($1, $2)', [SEED.groups.weiJie, ' Kiara Park '])
    expect(await group(db, SEED.groups.weiJie)).toMatchObject({ location: 'Kiara Park' })
    const { rows } = await db.query<{ id: string; location: string }>(
      'select id, location from public.bookings where group_id = $1 order by starts_at',
      [SEED.groups.weiJie],
    )
    expect(rows).toEqual([
      { id: SEED.bookings.weiJieFri18, location: 'Palm Court' },
      { id: SEED.bookings.weiJieFri25, location: 'Palm Court' },
      { id: SEED.bookings.weiJieFri2, location: 'Kiara Park' },
    ])
  })

  it('changes the starting balances; null leaves a value as it is', async () => {
    await db.as('herman')
    await db.query('select public.update_group($1, null, 3, 5)', [SEED.groups.nurul])
    await db.as('herman')
    await db.query('select public.update_group($1)', [SEED.groups.nurul])
    expect(await group(db, SEED.groups.nurul)).toMatchObject({
      location: 'Seri Maya',
      opening_used_lessons: 3,
      opening_paid_lessons: 5,
    })
  })

  it('refuses bad values, groups that don’t exist, and customers', async () => {
    await db.as('herman')
    const sql = 'select public.update_group($1, $2, $3, $4)'
    const cases: [unknown[], string][] = [
      [[SEED.groups.nurul, '  ', null, null], 'invalid_location'],
      [[SEED.groups.nurul, 'x'.repeat(101), null, null], 'invalid_location'],
      [[SEED.groups.nurul, null, -1, null], 'invalid_opening'],
      [[SEED.groups.nurul, null, null, -1], 'invalid_opening'],
      [[MISSING_GROUP, 'Seri Maya', null, null], 'not_found'],
    ]
    for (const [params, message] of cases) {
      expect(await failure(db, sql, params), message).toMatchObject({ message })
    }
    await db.as('nurul')
    expect(await failure(db, sql, [SEED.groups.nurul, 'Home', null, null])).toMatchObject({
      message: 'not_coach',
    })
  })
})

describe.skipIf(!hasDatabase)('set_group_active', () => {
  const db = useTestDb()

  it('won’t deactivate a group with upcoming lessons', async () => {
    await db.as('herman')
    expect(
      await failure(db, 'select public.set_group_active($1, false)', [SEED.groups.aimanSofia]),
    ).toEqual({ message: 'has_upcoming_lessons', detail: { count: 2 } })
  })

  it('deactivates it once they are cancelled, so customers can’t book for it; and back', async () => {
    await db.as('herman')
    await db.query('select public.cancel_booking($1)', [SEED.bookings.sofiaSun4])
    await db.query('select public.set_group_active($1, false)', [SEED.groups.sofia])
    expect(await group(db, SEED.groups.sofia)).toMatchObject({ active: false })

    await db.as('meiling')
    expect(
      await failure(db, 'select public.book_lesson($1, $2, 60)', [
        SEED.groups.sofia,
        '2026-09-29 19:30+08',
      ]),
    ).toMatchObject({ message: 'group_inactive' })

    await db.as('herman')
    await db.query('select public.set_group_active($1, true)', [SEED.groups.sofia])
    // Setting it to what it already is changes nothing.
    await db.query('select public.set_group_active($1, true)', [SEED.groups.sofia])
    expect(await group(db, SEED.groups.sofia)).toMatchObject({ active: true })
  })

  it('refuses a missing value, groups that don’t exist, and customers', async () => {
    await db.as('herman')
    expect(
      await failure(db, 'select public.set_group_active($1, null)', [SEED.groups.nurul]),
    ).toMatchObject({ message: 'invalid_active' })
    expect(
      await failure(db, 'select public.set_group_active($1, false)', [MISSING_GROUP]),
    ).toMatchObject({ message: 'not_found' })
    await db.as('meiling')
    expect(
      await failure(db, 'select public.set_group_active($1, false)', [SEED.groups.sofia]),
    ).toMatchObject({ message: 'not_coach' })
  })
})

describe.skipIf(!hasDatabase)('delete_group (Herman, 9 Oct 2026)', () => {
  const db = useTestDb()
  const sql = 'select public.delete_group($1)'

  /** How many of the group's rows are left in each table (read as the owner). */
  async function left(groupId: string, studentId: string) {
    await db.asOwner()
    const { rows } = await db.query<Record<string, number>>(
      `select (select count(*)::int from public.groups where id = $1) as groups,
              (select count(*)::int from public.group_members where group_id = $1) as members,
              (select count(*)::int from public.bookings where group_id = $1) as lessons,
              (select count(*)::int from public.payments where group_id = $1) as payments,
              (select count(*)::int from public.students where id = $2) as student`,
      [groupId, studentId],
    )
    return rows[0]
  }

  it('won’t delete a group with upcoming lessons, as Deactivate won’t', async () => {
    await db.as('herman')
    expect(await failure(db, sql, [SEED.groups.aimanSofia])).toEqual({
      message: 'group_has_upcoming_lessons',
      detail: { count: 2 },
    })
  })

  it('deletes Sofia’s group with its lessons and payment; Sofia stays in Aiman & Sofia', async () => {
    await db.as('herman')
    await db.query('select public.cancel_booking($1)', [SEED.bookings.sofiaSun4])
    expect(await left(SEED.groups.sofia, SEED.students.sofia)).toEqual({
      groups: 1,
      members: 1,
      lessons: 1,
      payments: 1,
      student: 1,
    })
    await db.as('herman')
    await db.query(sql, [SEED.groups.sofia])
    expect(await left(SEED.groups.sofia, SEED.students.sofia)).toEqual({
      groups: 0,
      members: 0,
      lessons: 0,
      payments: 0,
      student: 1,
    })
    expect(await group(db, SEED.groups.aimanSofia)).toMatchObject({
      display_names: 'Aiman & Sofia',
      active: true,
    })
    await db.as('herman')
    expect(await failure(db, sql, [SEED.groups.sofia])).toMatchObject({ message: 'not_found' })
  })

  it('takes a new student added with the group, and its first payment, with it', async () => {
    await db.as('herman')
    const meiling = await db.idOf('meiling')
    const id = await createGroup(db, meiling, [{ name: 'Lina' }], 'Palm Court', {
      firstPackagePaid: true,
      amountCents: 24000,
      method: 'cash',
    })
    await db.asOwner()
    const { rows } = await db.query<{ student_id: string }>(
      'select student_id from public.group_members where group_id = $1',
      [id],
    )
    const lina = rows[0]?.student_id ?? ''
    expect(await left(id, lina)).toMatchObject({ groups: 1, payments: 1, student: 1 })
    await db.as('herman')
    await db.query(sql, [id])
    expect(await left(id, lina)).toEqual({
      groups: 0,
      members: 0,
      lessons: 0,
      payments: 0,
      student: 0,
    })
    // The account stays.
    await db.asOwner()
    const account = await db.query('select 1 from public.profiles where id = $1', [meiling])
    expect(account.rows).toHaveLength(1)
  })

  it('refuses a group with an online payment, groups that don’t exist, and customers', async () => {
    await db.as('herman')
    await db.query('select public.cancel_booking($1)', [SEED.bookings.sofiaSun4])
    await db.asOwner()
    await db.query("update public.payments set gateway_ref = 'fpx-test-2' where group_id = $1", [
      SEED.groups.sofia,
    ])
    await db.as('herman')
    expect(await failure(db, sql, [SEED.groups.sofia])).toMatchObject({
      message: 'group_online_payment',
    })
    expect(await group(db, SEED.groups.sofia)).toBeDefined()
    await db.as('herman')
    expect(await failure(db, sql, [MISSING_GROUP])).toMatchObject({ message: 'not_found' })
    await db.as('meiling')
    expect(await failure(db, sql, [SEED.groups.sofia])).toMatchObject({ message: 'not_coach' })
  })
})

describe.skipIf(!hasDatabase)('approve_account (BR-2)', () => {
  const db = useTestDb()

  it('approves an account waiting for approval, which can then see the schedule', async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
               'authenticated', 'newbie@example.com', '{"username": "newbie"}')
       returning id`,
    )
    const newbie = rows[0]?.id ?? ''
    await actAs(db, newbie)
    expect(await failure(db, `select public.week_busy('2026-09-28')`)).toMatchObject({
      message: 'not_approved',
    })

    await db.as('herman')
    await db.query('select public.approve_account($1)', [newbie])
    await actAs(db, newbie)
    const { rows: week } = await db.query<{ days: number }>(
      `select jsonb_array_length(public.week_busy('2026-09-28')) as days`,
    )
    expect(week[0]?.days).toBe(7)
  })

  it('refuses accounts that don’t exist, and customers', async () => {
    await db.as('herman')
    expect(
      await failure(db, 'select public.approve_account($1)', [
        'a0000000-0000-4000-8000-0000000000ff',
      ]),
    ).toMatchObject({ message: 'not_found' })
    const nurul = await db.idOf('nurul')
    await db.as('meiling')
    expect(await failure(db, 'select public.approve_account($1)', [nurul])).toMatchObject({
      message: 'not_coach',
    })
  })
})

describe.skipIf(!hasDatabase)('pending_accounts (BR-2, prompt 09)', () => {
  const db = useTestDb()

  /** A sign-up as Auth makes it (the profile trigger runs), signed up at `at`. */
  async function signUp(username: string, email: string, confirmed: boolean, at: string) {
    const { rows } = await db.query<{ id: string }>(
      `insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at,
                               raw_user_meta_data)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
               'authenticated', $1, case when $2::boolean then now() end, $3)
       returning id`,
      [email, confirmed, JSON.stringify({ username, display_name: `${username} X`, phone: '012' })],
    )
    const id = rows[0]?.id ?? ''
    await db.query('update public.profiles set created_at = $2 where id = $1', [id, at])
    return id
  }

  it('gives the coach every account waiting for approval, oldest first, with its email', async () => {
    const later = await signUp('later', 'later@example.com', false, '2026-09-26 10:00+08')
    const sooner = await signUp('sooner', 'sooner@example.com', true, '2026-09-25 09:00+08')
    await db.as('herman')
    const { rows } = await db.query('select * from public.pending_accounts()')
    expect(rows).toEqual([
      {
        id: sooner,
        username: 'sooner',
        display_name: 'sooner X',
        phone: '012',
        email: 'sooner@example.com',
        email_confirmed: true,
        created_at: new Date('2026-09-25T01:00:00Z'),
      },
      {
        id: later,
        username: 'later',
        display_name: 'later X',
        phone: '012',
        email: 'later@example.com',
        email_confirmed: false,
        created_at: new Date('2026-09-26T02:00:00Z'),
      },
    ])

    await db.query('select public.approve_account($1)', [sooner])
    const { rows: left } = await db.query<{ id: string }>(
      'select id from public.pending_accounts()',
    )
    expect(left.map((r) => r.id)).toEqual([later])
  })

  it('lists no approved accounts: the seed has none waiting', async () => {
    await db.as('herman')
    const { rows } = await db.query('select * from public.pending_accounts()')
    expect(rows).toEqual([])
  })

  it('refuses customers, and the waiting accounts themselves', async () => {
    const waiting = await signUp('waiting', 'waiting@example.com', true, '2026-09-26 10:00+08')
    await db.as('meiling')
    expect(await failure(db, 'select * from public.pending_accounts()')).toMatchObject({
      message: 'not_coach',
    })
    await actAs(db, waiting)
    expect(await failure(db, 'select * from public.pending_accounts()')).toMatchObject({
      message: 'not_coach',
    })
  })
})

describe.skipIf(!hasDatabase)('username_available (BR-1)', () => {
  const db = useTestDb()

  const cases: [string | null, boolean][] = [
    ['new.swimmer_2', true],
    ['meiling', false],
    ['MeiLing', false],
    [' meiling ', false],
    ['ab', false],
    ['has space', false],
    ['x'.repeat(31), false],
    ['', false],
    [null, false],
  ]

  it('answers visitors signing up with true or false only', async () => {
    await db.asAnon()
    for (const [username, available] of cases) {
      const { rows } = await db.query<{ available: boolean }>(
        'select public.username_available($1) as available',
        [username],
      )
      expect(rows, String(username)).toEqual([{ available }])
    }
  })

  it('works for signed-in accounts too (the coach’s form for a new account)', async () => {
    await db.as('herman')
    const { rows } = await db.query<{ taken: boolean; available: boolean }>(
      `select public.username_available('farah') as taken,
              public.username_available('farah.new') as available`,
    )
    expect(rows).toEqual([{ taken: false, available: true }])
  })

  it('is the only function a visitor may call', async () => {
    await db.asAnon()
    const error = await db.expectFailure(`select public.get_public_settings()`)
    expect(error.code).toBe(PERMISSION_DENIED)
  })
})
