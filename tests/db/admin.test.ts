// Open hours, settings and announcements (TECH_SPEC §5.4, prompt 04; PRD BR-8, BR-29,
// BR-30, BR-36): get_public_settings, set_open_hours, add_exception, remove_exception,
// update_settings, post_announcement and remove_announcement against the seed, with the
// clock at Sat 26 Sep 2026 12:00 MYT.
import { describe, expect, it } from 'vitest'

import { SEED } from './fixture'
import { hasDatabase, type TestDb, useTestDb } from './helpers'

const PERMISSION_DENIED = '42501'

type Rule = { weekday: number; opens_at: string; closes_at: string }

// The seed's weekly template (TECH_SPEC §3).
const SEED_RULES: Rule[] = [
  ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, opens_at: '17:30', closes_at: '22:00' })),
  ...[6, 7].flatMap((weekday) => [
    { weekday, opens_at: '07:00', closes_at: '12:00' },
    { weekday, opens_at: '16:00', closes_at: '22:00' },
  ]),
]

/** The error of SQL that must fail: its message and parsed detail. */
async function failure(db: TestDb, sql: string, params?: readonly unknown[]) {
  const error = await db.expectFailure(sql, params)
  const detail: unknown = error.detail ? JSON.parse(error.detail) : null
  return { message: error.message, detail }
}

async function rules(db: TestDb) {
  await db.asOwner()
  const { rows } = await db.query<Rule>(
    `select weekday, to_char(opens_at, 'HH24:MI') as opens_at, to_char(closes_at, 'HH24:MI') as closes_at
     from public.availability_rules
     order by weekday, opens_at`,
  )
  return rows
}

async function setOpenHours(db: TestDb, value: unknown) {
  await db.query('select public.set_open_hours($1)', [JSON.stringify(value)])
}

/** Start times (MYT, 24-hour) on one day of the Book screen, free or not. */
async function startsOn(db: TestDb, weekStart: string, day: string) {
  const { rows } = await db.query<{ time: string; ok: boolean }>(
    `select to_char(starts_at at time zone 'Asia/Kuala_Lumpur', 'HH24:MI') as time, ok
     from public.week_slots($1, 60, $2)
     where day = $3
     order by starts_at`,
    [weekStart, SEED.groups.aimanSofia, day],
  )
  return rows
}

async function settingsRow(db: TestDb) {
  await db.asOwner()
  const { rows } = await db.query('select * from public.settings')
  return rows[0]
}

/** Acts as an account that isn't in the seed (as useTestDb's `as` does for seeded ones). */
async function actAs(db: TestDb, accountId: string) {
  await db.asOwner()
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub: accountId, role: 'authenticated' }),
  ])
  await db.query('set local role authenticated')
}

describe.skipIf(!hasDatabase)('get_public_settings', () => {
  const db = useTestDb()

  it('gives customers what they need, the travel gap included, and nothing private', async () => {
    await db.as('meiling')
    const { rows } = await db.query('select * from public.get_public_settings()')
    expect(rows).toEqual([
      {
        business_name: 'Swim Class',
        lesson_lengths: [60, 120],
        start_step_minutes: 30,
        travel_gap_minutes: 60,
        cancel_cutoff_hours: 6,
        booking_window_weeks: 4,
        lessons_per_package: 4,
        price_1to1_cents: null,
        price_1to2_cents: null,
        price_1to3_cents: null,
        payment_instructions: null,
      },
    ])
  })

  it('follows the settings', async () => {
    await db.query(
      `update public.settings
       set travel_gap_minutes = 45, price_1to3_cents = 54000, payment_instructions = 'DuitNow 012-000 0001'
       where id = 1`,
    )
    await db.as('meiling')
    const { rows } = await db.query(
      'select travel_gap_minutes, price_1to3_cents, payment_instructions from public.get_public_settings()',
    )
    expect(rows).toEqual([
      {
        travel_gap_minutes: 45,
        price_1to3_cents: 54000,
        payment_instructions: 'DuitNow 012-000 0001',
      },
    ])
  })

  it('answers accounts waiting for approval too (the waiting screen shows the business name)', async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
               'authenticated', 'newbie@example.com', '{"username": "newbie"}')
       returning id`,
    )
    await actAs(db, rows[0]?.id ?? '')
    const { rows: settings } = await db.query<{ business_name: string }>(
      'select business_name from public.get_public_settings()',
    )
    expect(settings).toEqual([{ business_name: 'Swim Class' }])
  })

  it('is not for visitors', async () => {
    await db.asAnon()
    const error = await db.expectFailure('select * from public.get_public_settings()')
    expect(error.code).toBe(PERMISSION_DENIED)
  })
})

describe.skipIf(!hasDatabase)('set_open_hours (BR-29)', () => {
  const db = useTestDb()

  it('replaces the weekly template: Saturdays from 8:00 am lose the 7:00 am start', async () => {
    const changed = SEED_RULES.map((r) =>
      r.weekday === 6 && r.opens_at === '07:00' ? { ...r, opens_at: '08:00' } : r,
    )
    await db.as('herman')
    await setOpenHours(db, changed)
    expect(await rules(db)).toEqual(changed)

    await db.as('meiling')
    const saturday = await startsOn(db, '2026-09-28', '2026-10-03')
    const sunday = await startsOn(db, '2026-09-28', '2026-10-04')
    expect(saturday[0]?.time).toBe('08:00')
    expect(sunday[0]?.time).toBe('07:00')
  })

  it('closes every day for an empty list; joins touching ranges; allows a range to end at midnight', async () => {
    await db.as('herman')
    await setOpenHours(db, [])
    expect(await rules(db)).toEqual([])

    await db.as('herman')
    await setOpenHours(db, [
      { weekday: 1, opens_at: '16:00', closes_at: '17:30' },
      { weekday: 1, opens_at: '17:30', closes_at: '24:00' },
    ])
    // open_windows is internal (no grant), so as the owner.
    await db.asOwner()
    const { rows } = await db.query<{ starts_at: string; ends_at: string }>(
      `select public.myt_text(starts_at) as starts_at, public.myt_text(ends_at) as ends_at
       from public.open_windows('2026-09-28')`,
    )
    expect(rows).toEqual([
      { starts_at: '2026-09-28T16:00:00+08:00', ends_at: '2026-09-29T00:00:00+08:00' },
    ])
  })

  it('refuses bad rules and keeps the old ones', async () => {
    await db.as('herman')
    const monday = { weekday: 1, opens_at: '17:30', closes_at: '22:00' }
    const cases: [unknown, string, unknown][] = [
      [{}, 'invalid_rules', null],
      [null, 'invalid_rules', null],
      [[1], 'invalid_rules', { index: 1 }],
      [[monday, { ...monday, weekday: 8 }], 'invalid_rules', { index: 2 }],
      [[{ ...monday, weekday: 0 }], 'invalid_rules', { index: 1 }],
      [[{ ...monday, weekday: 1.5 }], 'invalid_rules', { index: 1 }],
      [[{ ...monday, opens_at: '25:00' }], 'invalid_rules', { index: 1 }],
      [[{ weekday: 1, opens_at: '17:30' }], 'invalid_rules', { index: 1 }],
      [
        [monday, { weekday: 2, opens_at: '22:00', closes_at: '17:30' }],
        'invalid_range',
        { index: 2 },
      ],
      [[{ ...monday, closes_at: '17:30' }], 'invalid_range', { index: 1 }],
      [
        [
          { weekday: 3, opens_at: '17:30', closes_at: '20:00' },
          { weekday: 3, opens_at: '19:00', closes_at: '22:00' },
        ],
        'overlapping_rules',
        { weekday: 3 },
      ],
    ]
    for (const [value, message, detail] of cases) {
      expect(
        await failure(db, 'select public.set_open_hours($1)', [JSON.stringify(value)]),
        JSON.stringify(value),
      ).toEqual({ message, detail })
    }
    expect(await rules(db)).toEqual(SEED_RULES)

    await db.as('meiling')
    expect(
      await failure(db, 'select public.set_open_hours($1)', [JSON.stringify(SEED_RULES)]),
    ).toMatchObject({ message: 'not_coach' })
  })
})

describe.skipIf(!hasDatabase)('add_exception and remove_exception (BR-30)', () => {
  const db = useTestDb()

  it('extra time on Wed 7 Oct 3:00–5:30 pm gives customers 3:00 pm starts that day only, until removed', async () => {
    await db.as('herman')
    const { rows } = await db.query<{ id: string }>(
      `select public.add_exception('open', '2026-10-07 15:00+08', '2026-10-07 17:30+08', ' Gala week ') as id`,
    )
    const id = rows[0]?.id ?? ''

    await db.as('meiling')
    expect((await startsOn(db, '2026-10-05', '2026-10-07')).slice(0, 5)).toEqual(
      ['15:00', '15:30', '16:00', '16:30', '17:00'].map((time) => ({ time, ok: true })),
    )
    expect((await startsOn(db, '2026-10-12', '2026-10-14'))[0]?.time).toBe('17:30')

    await db.as('herman')
    const { rows: notes } = await db.query<{ note: string }>(
      `select e ->> 'note' as note
       from jsonb_array_elements(public.coach_week('2026-10-05')) d,
            jsonb_array_elements(d -> 'exceptions') e`,
    )
    expect(notes).toEqual([{ note: 'Gala week' }])

    await db.query('select public.remove_exception($1)', [id])
    await db.as('meiling')
    expect((await startsOn(db, '2026-10-05', '2026-10-07'))[0]?.time).toBe('17:30')
  })

  it('Block time closes a range', async () => {
    await db.as('herman')
    await db.query(
      `select public.add_exception('closed', '2026-10-06 17:30+08', '2026-10-06 19:00+08', 'Dentist')`,
    )
    await db.as('meiling')
    expect((await startsOn(db, '2026-10-05', '2026-10-06'))[0]?.time).toBe('19:00')
  })

  it('refuses bad ranges and notes, unknown ids, and customers', async () => {
    await db.as('herman')
    const sql = 'select public.add_exception($1, $2, $3, $4)'
    const from = '2026-10-07 15:00+08'
    const to = '2026-10-07 17:30+08'
    const cases: [unknown[], string][] = [
      [[null, from, to, null], 'invalid_kind'],
      [['open', null, to, null], 'invalid_range'],
      [['open', from, null, null], 'invalid_range'],
      [['open', from, from, null], 'invalid_range'],
      [['open', to, from, null], 'invalid_range'],
      [['closed', from, to, 'x'.repeat(501)], 'invalid_note'],
    ]
    for (const [params, message] of cases) {
      expect(await failure(db, sql, params), message).toMatchObject({ message })
    }
    expect(
      await failure(db, 'select public.remove_exception($1)', [
        'f0000000-0000-4000-8000-0000000000ff',
      ]),
    ).toMatchObject({ message: 'not_found' })

    await db.as('meiling')
    expect(await failure(db, sql, ['closed', from, to, null])).toMatchObject({
      message: 'not_coach',
    })
    expect(
      await failure(db, 'select public.remove_exception($1)', [
        'f0000000-0000-4000-8000-0000000000ff',
      ]),
    ).toMatchObject({ message: 'not_coach' })
  })
})

describe.skipIf(!hasDatabase)('update_settings', () => {
  const db = useTestDb()

  it('a 30-minute travel gap frees Tue 29 Sep 7:00 pm on the Book screen straight away', async () => {
    await db.as('meiling')
    expect(
      (await startsOn(db, '2026-09-28', '2026-09-29')).find((s) => s.time === '19:00'),
    ).toEqual({ time: '19:00', ok: false })
    await db.as('herman')
    const { rows } = await db.query<{ travel_gap_minutes: number }>(
      `select travel_gap_minutes from public.update_settings('{"travel_gap_minutes": 30}')`,
    )
    expect(rows).toEqual([{ travel_gap_minutes: 30 }])
    await db.as('meiling')
    expect(
      (await startsOn(db, '2026-09-28', '2026-09-29')).find((s) => s.time === '19:00'),
    ).toEqual({ time: '19:00', ok: true })
  })

  it('changes several settings at once, trims text, tidies lesson lengths and keeps the rest', async () => {
    await db.as('herman')
    const { rows } = await db.query(
      `select business_name, coach_email, lesson_lengths, price_1to1_cents, payment_instructions,
              to_char(reminder_time, 'HH24:MI') as reminder_time, booking_confirmations,
              travel_gap_minutes
       from public.update_settings($1)`,
      [
        JSON.stringify({
          business_name: '  Herman Swim School ',
          coach_email: ' herman@swimclass.online ',
          lesson_lengths: [120, 60, 60],
          price_1to1_cents: 26000,
          payment_instructions: ' Maybank 1234 5678\nHerman ',
          reminder_time: '19:30',
          booking_confirmations: false,
        }),
      ],
    )
    expect(rows).toEqual([
      {
        business_name: 'Herman Swim School',
        coach_email: 'herman@swimclass.online',
        lesson_lengths: [60, 120],
        price_1to1_cents: 26000,
        payment_instructions: 'Maybank 1234 5678\nHerman',
        reminder_time: '19:30',
        booking_confirmations: false,
        travel_gap_minutes: 60,
      },
    ])
  })

  it('null empties the settings that may be empty', async () => {
    await db.query(
      `update public.settings
       set price_1to1_cents = 26000, payment_instructions = 'Maybank', lesson_expiry_months = 6
       where id = 1`,
    )
    await db.as('herman')
    const { rows } = await db.query(
      `select price_1to1_cents, payment_instructions, lesson_expiry_months
       from public.update_settings($1)`,
      [
        JSON.stringify({
          price_1to1_cents: null,
          payment_instructions: '   ',
          lesson_expiry_months: null,
        }),
      ],
    )
    expect(rows).toEqual([
      { price_1to1_cents: null, payment_instructions: null, lesson_expiry_months: null },
    ])
  })

  it('refuses invalid values in the database, not only in the form, and changes nothing', async () => {
    const before = await settingsRow(db)
    await db.as('herman')
    const cases: [unknown, string, unknown][] = [
      [{ travel_gap_minutes: 500 }, 'invalid_setting', { field: 'travel_gap_minutes' }],
      [{ travel_gap_minutes: -1 }, 'invalid_setting', { field: 'travel_gap_minutes' }],
      [{ travel_gap_minutes: 'abc' }, 'invalid_setting', { field: 'travel_gap_minutes' }],
      [{ travel_gap_minutes: 1.5 }, 'invalid_setting', { field: 'travel_gap_minutes' }],
      [{ start_step_minutes: 20 }, 'invalid_setting', { field: 'start_step_minutes' }],
      [{ lesson_lengths: [90] }, 'invalid_setting', { field: 'lesson_lengths' }],
      [{ lesson_lengths: [] }, 'invalid_setting', { field: 'lesson_lengths' }],
      [{ lesson_lengths: null }, 'invalid_setting', { field: 'lesson_lengths' }],
      [{ lesson_lengths: [60, 'x'] }, 'invalid_setting', { field: 'lesson_lengths' }],
      [{ coach_email: 'not an email' }, 'invalid_setting', { field: 'coach_email' }],
      [{ business_name: '   ' }, 'invalid_setting', { field: 'business_name' }],
      [{ cancel_cutoff_hours: null }, 'invalid_setting', { field: 'cancel_cutoff_hours' }],
      [{ reminder_time: '25:00' }, 'invalid_setting', { field: 'reminder_time' }],
      // Postgres reads '24:00' as a time, but the daily emails would never be due.
      [{ reminder_time: '24:00' }, 'invalid_setting', { field: 'reminder_time' }],
      [{ digest_time: '24:00' }, 'invalid_setting', { field: 'digest_time' }],
      [{ require_approval: 'yes' }, 'invalid_setting', { field: 'require_approval' }],
      [{ lesson_expiry_months: 0 }, 'invalid_setting', { field: 'lesson_expiry_months' }],
      [
        { payment_instructions: 'x'.repeat(2001) },
        'invalid_setting',
        { field: 'payment_instructions' },
      ],
      [
        { foo: 1, id: 2, updated_at: '2026-01-01', travel_gap_minutes: 30 },
        'unknown_setting',
        { keys: ['foo', 'id', 'updated_at'] },
      ],
      [[], 'invalid_settings', null],
      [null, 'invalid_settings', null],
    ]
    for (const [value, message, detail] of cases) {
      expect(
        await failure(db, 'select public.update_settings($1)', [JSON.stringify(value)]),
        JSON.stringify(value),
      ).toEqual({ message, detail })
    }
    expect(await settingsRow(db)).toEqual(before)

    await db.as('meiling')
    expect(
      await failure(db, 'select public.update_settings($1)', [
        JSON.stringify({ travel_gap_minutes: 0 }),
      ]),
    ).toMatchObject({ message: 'not_coach' })
  })
})

describe.skipIf(!hasDatabase)('post_announcement and remove_announcement (BR-36)', () => {
  const db = useTestDb()

  type Email = {
    to_email: string
    kind: string
    dedupe_key: string
    subject: string
    body_text: string
    body_html: string
  }

  /** The outbox rows this test's transaction added (their created_at is its now()). */
  async function outbox() {
    await db.asOwner()
    const { rows } = await db.query<Email>(
      `select to_email, kind, dedupe_key, subject, body_text, body_html from public.email_outbox
       where created_at = now()
       order by to_email`,
    )
    return rows
  }

  /**
   * Who a broadcast goes to, read from the database like queue_broadcast_emails does:
   * approved customers whose address is confirmed or was entered by the coach. The dev
   * database may hold extra sign-ups besides the seed's 12 customers.
   */
  async function recipients() {
    await db.asOwner()
    const { rows } = await db.query<{ email: string }>(
      `select u.email from public.profiles p join auth.users u on u.id = p.id
       where p.role = 'customer' and p.approved
         and (u.email_confirmed_at is not null or u.invited_at is not null)
       order by u.email`,
    )
    return rows.map((r) => r.email)
  }

  async function post(message: string | null, sendEmail = true, pinned = true) {
    const { rows } = await db.query<{ id: string }>(
      'select public.post_announcement($1, $2, $3) as id',
      [message, sendEmail, pinned],
    )
    return rows[0]?.id ?? ''
  }

  // The seed's customers, all approved and confirmed.
  const CUSTOMERS = [
    'aina',
    'daniel',
    'ethan',
    'farah',
    'grace',
    'junhao',
    'kai',
    'meiling',
    'nurul',
    'priya',
    'weijie',
    'zulaikha',
  ].map((username) => `${username}@example.com`)

  it('pins a banner customers see and emails every approved customer once', async () => {
    await db.as('herman')
    const id = await post('  Pool closed on Friday  ')

    await db.as('meiling')
    const { rows } = await db.query<{ message: string; pinned: boolean }>(
      'select message, pinned from public.announcements where removed_at is null',
    )
    expect(rows).toEqual([{ message: 'Pool closed on Friday', pinned: true }])

    const emails = await outbox()
    const expected = await recipients()
    expect(expected).toEqual(expect.arrayContaining(CUSTOMERS))
    expect(emails.map((e) => e.to_email)).toEqual(expected)
    expect(
      emails.every((e) => e.kind === 'broadcast' && e.subject === 'Message from your coach'),
    ).toBe(true)
    const meiling = await db.idOf('meiling')
    expect(emails.find((e) => e.to_email === 'meiling@example.com')).toMatchObject({
      dedupe_key: `broadcast:${id}:${meiling}`,
      body_text: [
        'Hi Mei Ling,',
        '',
        'Pool closed on Friday',
        '',
        'Open Swim Class: {{site_url}}',
        '',
        'Sent by Swim Class. Reply to this email to reach your coach.',
      ].join('\n'),
    })
  })

  it('emails approved customers only', async () => {
    await db.query(`update public.profiles set approved = false where username = 'nurul'`)
    await db.as('herman')
    await post('New term starts Monday')
    const emails = (await outbox()).map((e) => e.to_email)
    expect(emails).toEqual(await recipients())
    expect(emails).not.toContain('nurul@example.com')
    expect(emails).not.toContain('herman@example.com')
  })

  it('skips addresses nobody confirmed, but not the ones the coach entered (invited)', async () => {
    // kai never confirmed his address; aina was invited by the coach and hasn't yet.
    await db.query(
      `update auth.users set email_confirmed_at = null
       where email in ('kai@example.com', 'aina@example.com')`,
    )
    await db.query(`update auth.users set invited_at = now() where email = 'aina@example.com'`)
    await db.as('herman')
    await post('New term starts Monday')
    const emails = (await outbox()).map((e) => e.to_email)
    expect(emails).not.toContain('kai@example.com')
    expect(emails).toContain('aina@example.com')
    expect(emails).toEqual(await recipients())
  })

  it('can skip the email and the pin', async () => {
    await db.as('herman')
    const id = await post('Just a note', false, false)
    expect(await outbox()).toEqual([])
    const { rows } = await db.query<{ pinned: boolean; send_email: boolean }>(
      'select pinned, send_email from public.announcements where id = $1',
      [id],
    )
    expect(rows).toEqual([{ pinned: false, send_email: false }])
  })

  it('escapes the message in the HTML version', async () => {
    await db.as('herman')
    await post('<script>alert(1)</script> & more')
    const [email] = await outbox()
    expect(email?.body_html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; more')
    expect(email?.body_html).not.toContain('<script>')
  })

  it('removing it hides it from customers; queued emails stay; removing again changes nothing', async () => {
    await db.as('herman')
    const id = await post('Pool closed on Friday')
    await db.query('select public.remove_announcement($1)', [id])
    await db.as('meiling')
    expect((await db.query('select * from public.announcements')).rowCount).toBe(0)
    expect(await outbox()).toHaveLength((await recipients()).length)

    const removedAt = async () => {
      await db.asOwner()
      const { rows } = await db.query<{ removed_at: Date }>(
        'select removed_at from public.announcements where id = $1',
        [id],
      )
      return rows[0]?.removed_at
    }
    const first = await removedAt()
    await db.setNow('2026-09-27 12:00+08')
    await db.as('herman')
    await db.query('select public.remove_announcement($1)', [id])
    expect(await removedAt()).toEqual(first)
  })

  it('refuses an empty or too long message, unknown ids, and customers', async () => {
    await db.as('herman')
    for (const message of ['', '   ', '\n\t \n', null, 'x'.repeat(1001)]) {
      expect(
        await failure(db, 'select public.post_announcement($1)', [message]),
        String(message).slice(0, 10),
      ).toMatchObject({ message: 'invalid_message' })
    }
    expect(
      await failure(db, 'select public.remove_announcement($1)', [
        'f0000000-0000-4000-8000-0000000000ff',
      ]),
    ).toMatchObject({ message: 'not_found' })

    await db.as('meiling')
    expect(
      await failure(db, 'select public.post_announcement($1)', ['Free lessons for all']),
    ).toMatchObject({ message: 'not_coach' })
    expect(
      await failure(db, 'select public.remove_announcement($1)', [
        'f0000000-0000-4000-8000-0000000000ff',
      ]),
    ).toMatchObject({ message: 'not_coach' })
  })
})
