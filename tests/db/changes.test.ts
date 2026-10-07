// Cancelling, excusing and payments (TECH_SPEC §5.2, prompt 04; PRD BR-15 to BR-20,
// BR-26, BR-34, BR-35): cancel_booking, excuse_booking, record_payment and
// add_free_lesson against the seed, with the clock at Sat 26 Sep 2026 12:00 MYT unless a
// test says otherwise.
import { describe, expect, it } from 'vitest'

import { SEED } from './fixture'
import { hasDatabase, myt, type TestDb, useTestDb } from './helpers'

type Email = {
  to_email: string
  kind: string
  dedupe_key: string
  subject: string
  body_text: string
}

/** MYT wall-clock text as the functions write it: t('2026-10-03', '03:00'). */
function t(day: string, time: string) {
  return `${day}T${time}:00+08:00`
}

/** The error of SQL that must fail: its message and parsed detail. */
async function failure(db: TestDb, sql: string, params?: readonly unknown[]) {
  const error = await db.expectFailure(sql, params)
  const detail: unknown = error.detail ? JSON.parse(error.detail) : null
  return { message: error.message, detail }
}

async function cancel(db: TestDb, bookingId: string, reason: string | null = null) {
  await db.query('select public.cancel_booking($1, $2)', [bookingId, reason])
}

/** A booking's state, read as the owner (the test acts as the owner afterwards). */
async function booking(db: TestDb, id: string) {
  await db.asOwner()
  const { rows } = await db.query<{
    status: string
    cancelled_at: Date | null
    cancelled_by: string | null
    cancel_reason: string | null
  }>(
    'select status::text, cancelled_at, cancelled_by, cancel_reason from public.bookings where id = $1',
    [id],
  )
  return rows[0]
}

/** The outbox rows this test's transaction added (their created_at is its now()). */
async function outbox(db: TestDb) {
  await db.asOwner()
  const { rows } = await db.query<Email & { body_html: string }>(
    `select to_email, kind, dedupe_key, subject, body_text, body_html from public.email_outbox
     where created_at = now()
     order by id`,
  )
  return rows
}

async function balance(db: TestDb, groupId: string) {
  await db.asOwner()
  const { rows } = await db.query<{
    paid_lessons: number
    used_lessons: number
    booked_lessons: number
    can_still_book: number
    unpaid: boolean
    unpaid_since: Date | null
    last_paid_on: string | null
    last_payment_method: string | null
  }>('select * from public.group_balance where group_id = $1', [groupId])
  return rows[0]
}

type Payment = {
  lessons: number
  amount_cents: number
  method: string
  paid_on: string
  note: string | null
  created_by: string | null
}

async function payment(db: TestDb, id: string) {
  await db.asOwner()
  const { rows } = await db.query<Payment>(
    'select lessons, amount_cents, method::text, paid_on, note, created_by from public.payments where id = $1',
    [id],
  )
  return rows[0]
}

async function recordPayment(
  db: TestDb,
  groupId: string,
  lessons: number | null,
  amountCents: number | null,
  method: string | null,
  paidOn: string | null = null,
  note: string | null = null,
) {
  const { rows } = await db.query<{ id: string }>(
    'select public.record_payment($1, $2, $3, $4, $5, $6) as id',
    [groupId, lessons, amountCents, method, paidOn, note],
  )
  return rows[0]?.id ?? ''
}

describe.skipIf(!hasDatabase)('cancel_booking (BR-15 to BR-17)', () => {
  const db = useTestDb()

  it('lets meiling cancel Sat 3 Oct 9:00 am at 2:59 am that day (the cutoff is 3:00 am)', async () => {
    const meiling = await db.idOf('meiling')
    await db.setNow('2026-10-03 02:59+08')
    await db.as('meiling')
    await cancel(db, SEED.bookings.aimanSofiaSat3)
    expect(await booking(db, SEED.bookings.aimanSofiaSat3)).toEqual({
      status: 'cancelled',
      cancelled_at: myt('2026-10-03 02:59'),
      cancelled_by: meiling,
      cancel_reason: null,
    })
  })

  it('locks it at 3:01 am, still allows it at exactly 3:00 am', async () => {
    await db.setNow('2026-10-03 03:01+08')
    await db.as('meiling')
    expect(
      await failure(db, 'select public.cancel_booking($1)', [SEED.bookings.aimanSofiaSat3]),
    ).toEqual({ message: 'locked', detail: { cutoff_at: t('2026-10-03', '03:00') } })
    await db.setNow('2026-10-03 03:00+08')
    await cancel(db, SEED.bookings.aimanSofiaSat3)
    expect(await booking(db, SEED.bookings.aimanSofiaSat3)).toMatchObject({ status: 'cancelled' })
  })

  it('lets the coach cancel it at 3:01 am, and a lesson that has already happened', async () => {
    const herman = await db.idOf('herman')
    await db.setNow('2026-10-03 03:01+08')
    await db.as('herman')
    await cancel(db, SEED.bookings.aimanSofiaSat3, 'Pool closed')
    expect(await booking(db, SEED.bookings.aimanSofiaSat3)).toMatchObject({
      status: 'cancelled',
      cancelled_by: herman,
      cancel_reason: 'Pool closed',
    })
    // Back to Sat 26 Sep: Wei Jie's lesson on Fri 25 Sep has happened; cancelled, it no
    // longer counts.
    await db.setNow('2026-09-26 12:00+08')
    await db.as('herman')
    await cancel(db, SEED.bookings.weiJieFri25)
    expect(await balance(db, SEED.groups.weiJie)).toMatchObject({ used_lessons: 5 })
  })

  it('frees the time and gives the lesson back to the package', async () => {
    await db.as('meiling')
    await cancel(db, SEED.bookings.aimanSofiaSat3)
    expect(await balance(db, SEED.groups.aimanSofia)).toMatchObject({
      booked_lessons: 1,
      can_still_book: 7,
    })
    await db.as('priya')
    const { rows } = await db.query<{ ok: boolean }>(
      `select ok from public.week_slots('2026-09-28', 60, $1)
       where starts_at = '2026-10-03 09:00+08'`,
      [SEED.groups.priya],
    )
    expect(rows).toEqual([{ ok: true }])
  })

  it('refuses other people’s lessons, lessons that aren’t booked, and accounts waiting for approval', async () => {
    await db.as('meiling')
    for (const id of [SEED.bookings.priyaTue29, 'd0000000-0000-4000-8000-0000000000ff']) {
      expect(await failure(db, 'select public.cancel_booking($1)', [id]), id).toMatchObject({
        message: 'not_your_booking',
      })
    }
    await cancel(db, SEED.bookings.aimanSofiaSat3)
    expect(
      await failure(db, 'select public.cancel_booking($1)', [SEED.bookings.aimanSofiaSat3]),
    ).toEqual({ message: 'not_booked', detail: { status: 'cancelled' } })

    await db.asOwner()
    await db.query(`update public.bookings set status = 'excused' where id = $1`, [
      SEED.bookings.priyaTue29,
    ])
    await db.as('herman')
    expect(
      await failure(db, 'select public.cancel_booking($1)', [SEED.bookings.priyaTue29]),
    ).toEqual({ message: 'not_booked', detail: { status: 'excused' } })
    expect(
      await failure(db, 'select public.cancel_booking($1)', [
        'd0000000-0000-4000-8000-0000000000ff',
      ]),
    ).toMatchObject({ message: 'not_found' })

    await db.asOwner()
    await db.query(`update public.profiles set approved = false where username = 'nurul'`)
    await db.as('nurul')
    expect(
      await failure(db, 'select public.cancel_booking($1)', [
        'd0000000-0000-4000-8000-000000000020',
      ]),
    ).toMatchObject({ message: 'not_approved' })
  })

  it('refuses a reason over 500 characters, and keeps no reason made only of blanks', async () => {
    await db.as('meiling')
    expect(
      await failure(db, 'select public.cancel_booking($1, $2)', [
        SEED.bookings.aimanSofiaSat3,
        'x'.repeat(501),
      ]),
    ).toMatchObject({ message: 'invalid_reason' })
    await cancel(db, SEED.bookings.aimanSofiaSat3, '\n\t  \n')
    expect(await booking(db, SEED.bookings.aimanSofiaSat3)).toMatchObject({
      status: 'cancelled',
      cancel_reason: null,
    })
  })
})

describe.skipIf(!hasDatabase)('cancellation emails (BR-17, BR-34, BR-35)', () => {
  const db = useTestDb()

  it('emails the customer who cancelled; no late alert more than 24 hours ahead', async () => {
    await db.as('meiling')
    await cancel(db, SEED.bookings.aimanSofiaSat3, 'Aiman has a fever')
    expect(await outbox(db)).toMatchObject([
      {
        to_email: 'meiling@example.com',
        kind: 'cancelled',
        dedupe_key: `cancelled:${SEED.bookings.aimanSofiaSat3}`,
        subject: 'Cancelled: Aiman & Sofia, Sat 3 Oct, 9:00–10:00 am',
        body_text: [
          'Hi Mei Ling,',
          '',
          'You cancelled this lesson:',
          'Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia at Palm Court',
          '',
          'The lesson goes back to your package. Book another time: {{site_url}}/book',
          '',
          'Sent by Swim Class. Reply to this email to reach your coach.',
        ].join('\n'),
      },
    ])
  })

  it('alerts the coach when a customer cancels within 24 hours of the start, with the reason', async () => {
    await db.setNow('2026-10-02 20:00+08')
    await db.as('meiling')
    await cancel(db, SEED.bookings.aimanSofiaSat3, 'Aiman has a fever')
    const emails = await outbox(db)
    expect(emails.map((e) => [e.kind, e.to_email, e.dedupe_key])).toEqual([
      ['cancelled', 'meiling@example.com', `cancelled:${SEED.bookings.aimanSofiaSat3}`],
      ['late_alert', 'herman@example.com', `late:${SEED.bookings.aimanSofiaSat3}:cancelled`],
    ])
    expect(emails[1]).toMatchObject({
      subject: 'Late cancellation: Aiman & Sofia, Sat 3 Oct, 9:00–10:00 am',
      body_text: [
        'Mei Ling cancelled a lesson that was due to start within 24 hours:',
        'Sat 3 Oct, 9:00–10:00 am · Aiman & Sofia (1-to-2) · Palm Court',
        'Reason: Aiman has a fever',
        '',
        'The time is free again. Your schedule: {{site_url}}/coach/schedule',
        '',
        'Sent by Swim Class.',
      ].join('\n'),
    })
  })

  it('tells the customer when the coach cancelled, with his reason, and doesn’t alert the coach', async () => {
    await db.setNow('2026-10-02 20:00+08')
    await db.as('herman')
    await cancel(db, SEED.bookings.aimanSofiaSat3, 'Pool closed for cleaning')
    const emails = await outbox(db)
    expect(emails.map((e) => e.kind)).toEqual(['cancelled'])
    expect(emails[0]?.body_text).toContain(
      [
        'Your coach cancelled this lesson:',
        'Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia at Palm Court',
        'Reason: Pool closed for cleaning',
      ].join('\n'),
    )
  })

  it('follows the late_change_alert setting', async () => {
    await db.query('update public.settings set late_change_alert = false')
    await db.setNow('2026-10-02 20:00+08')
    await db.as('meiling')
    await cancel(db, SEED.bookings.aimanSofiaSat3)
    expect((await outbox(db)).map((e) => e.kind)).toEqual(['cancelled'])
  })

  it('shows a reason with {{site_url}} in it as plain text, not as a link to the site', async () => {
    await db.setNow('2026-10-02 20:00+08')
    await db.as('meiling')
    await cancel(db, SEED.bookings.aimanSofiaSat3, 'Pay here {{{site_url}}@evil.example/fpx')
    const alert = (await outbox(db)).find((e) => e.kind === 'late_alert')
    expect(alert?.body_text).toContain('Reason: Pay here { { {site_url}}@evil.example/fpx')
    // Only the template's own link to the schedule.
    expect(alert?.body_html.split('<a ').length).toBe(2)
    expect(alert?.body_html).toContain('<a href="{{site_url}}/coach/schedule">')
    expect(alert?.body_text.replace(/\{\{site_url\}\}(\/[a-z/-]*)?/g, '')).not.toContain('{{')
  })

  it('writes both halves of a range that spans noon', async () => {
    await db.as('zulaikha')
    await cancel(db, 'd0000000-0000-4000-8000-000000000012') // Sat 3 Oct 11:00–12:00
    const [email] = await outbox(db)
    expect(email?.subject).toBe('Cancelled: Adam, Alya & Amir, Sat 3 Oct, 11:00 am–12:00 pm')
  })
})

describe.skipIf(!hasDatabase)('excuse_booking (BR-18)', () => {
  const db = useTestDb()

  it('excuses a lesson that has happened, which then stops counting', async () => {
    await db.as('herman')
    await db.query('select public.excuse_booking($1)', [SEED.bookings.weiJieFri25])
    expect(await booking(db, SEED.bookings.weiJieFri25)).toMatchObject({ status: 'excused' })
    expect(await balance(db, SEED.groups.weiJie)).toMatchObject({
      used_lessons: 5,
      can_still_book: 2,
    })
  })

  it('refuses lessons that haven’t started (cancel them instead), ones not booked, and customers', async () => {
    await db.as('herman')
    expect(
      await failure(db, 'select public.excuse_booking($1)', [SEED.bookings.aimanSofiaSat3]),
    ).toMatchObject({ message: 'not_started' })
    await cancel(db, SEED.bookings.aimanSofiaSat3)
    expect(
      await failure(db, 'select public.excuse_booking($1)', [SEED.bookings.aimanSofiaSat3]),
    ).toEqual({ message: 'not_booked', detail: { status: 'cancelled' } })
    expect(
      await failure(db, 'select public.excuse_booking($1)', [
        'd0000000-0000-4000-8000-0000000000ff',
      ]),
    ).toMatchObject({ message: 'not_found' })
    await db.as('weijie')
    expect(
      await failure(db, 'select public.excuse_booking($1)', [SEED.bookings.weiJieFri25]),
    ).toMatchObject({ message: 'not_coach' })
  })
})

describe.skipIf(!hasDatabase)('record_payment and add_free_lesson (BR-20, BR-26)', () => {
  const db = useTestDb()

  it('recording Hana’s payment turns her from Unpaid to Paid, dated today in MYT', async () => {
    const herman = await db.idOf('herman')
    await db.as('herman')
    const id = await recordPayment(db, SEED.groups.hana, 4, 24000, 'cash')
    // The session is in Los Angeles, where it is still Fri 25 Sep.
    expect(await payment(db, id)).toEqual({
      lessons: 4,
      amount_cents: 24000,
      method: 'cash',
      paid_on: '2026-09-26',
      note: null,
      created_by: herman,
    })
    expect(await balance(db, SEED.groups.hana)).toMatchObject({
      paid_lessons: 24,
      unpaid: false,
      unpaid_since: null,
      last_paid_on: '2026-09-26',
      last_payment_method: 'cash',
    })
  })

  it('takes the amount from the type’s package price when none is given, pro rata', async () => {
    await db.query(
      'update public.settings set price_1to1_cents = 26000, price_1to2_cents = 40000 where id = 1',
    )
    await db.as('herman')
    const cases: [string, number, number][] = [
      [SEED.groups.hana, 4, 26000],
      [SEED.groups.hana, 2, 13000],
      // 3 before 4: after 4, Aiman & Sofia's 20 paid lessons would reach one package past
      // their last booked lesson, and the payment limit would refuse the 3.
      [SEED.groups.aimanSofia, 3, 30000],
      [SEED.groups.aimanSofia, 4, 40000],
    ]
    for (const [group, lessons, amount] of cases) {
      const id = await recordPayment(db, group, lessons, null, 'transfer', '2026-09-20', ' Term 3 ')
      expect(await payment(db, id), `${group} ${lessons}`).toMatchObject({
        lessons,
        amount_cents: amount,
        paid_on: '2026-09-20',
        note: 'Term 3',
      })
      await db.as('herman')
    }
  })

  it('refuses bad input', async () => {
    await db.as('herman')
    const sql = 'select public.record_payment($1, $2, $3, $4, $5, $6)'
    const cases: [unknown[], string][] = [
      [[SEED.groups.hana, 0, 100, 'cash', null, null], 'invalid_lessons'],
      [[SEED.groups.hana, -4, 100, 'cash', null, null], 'invalid_lessons'],
      [[SEED.groups.hana, null, 100, 'cash', null, null], 'invalid_lessons'],
      [[SEED.groups.hana, 4, -1, 'cash', null, null], 'invalid_amount'],
      [[SEED.groups.hana, 4, 100, null, null, null], 'invalid_method'],
      [[SEED.groups.hana, 4, 100, 'cash', '2026-09-27', null], 'invalid_date'],
      [[SEED.groups.hana, 4, 100, 'cash', null, 'x'.repeat(501)], 'invalid_note'],
      // The prices aren't set in the seed.
      [[SEED.groups.hana, 4, null, 'cash', null, null], 'price_not_set'],
      [['c0000000-0000-4000-8000-0000000000ff', 4, 100, 'cash', null, null], 'not_found'],
    ]
    for (const [params, message] of cases) {
      expect(await failure(db, sql, params), message).toMatchObject({ message })
    }
    await db.as('farah')
    expect(await failure(db, sql, [SEED.groups.hana, 4, 100, 'cash', null, null])).toMatchObject({
      message: 'not_coach',
    })
  })

  it('adds a free lesson: 1 lesson, RM 0, method free, today', async () => {
    await db.as('herman')
    const { rows } = await db.query<{ id: string }>('select public.add_free_lesson($1, $2) as id', [
      SEED.groups.nurul,
      'Birthday',
    ])
    expect(await payment(db, rows[0]?.id ?? '')).toMatchObject({
      lessons: 1,
      amount_cents: 0,
      method: 'free',
      paid_on: '2026-09-26',
      note: 'Birthday',
    })
    expect(await balance(db, SEED.groups.nurul)).toMatchObject({
      paid_lessons: 5,
      can_still_book: 6,
    })
  })

  it('refuses a free lesson for customers and for a group that doesn’t exist', async () => {
    await db.as('nurul')
    expect(
      await failure(db, 'select public.add_free_lesson($1)', [SEED.groups.nurul]),
    ).toMatchObject({ message: 'not_coach' })
    await db.as('herman')
    expect(
      await failure(db, 'select public.add_free_lesson($1)', [
        'c0000000-0000-4000-8000-0000000000ff',
      ]),
    ).toMatchObject({ message: 'not_found' })
    expect(
      await failure(db, 'select public.add_free_lesson($1, $2)', [
        SEED.groups.nurul,
        'x'.repeat(501),
      ]),
    ).toMatchObject({ message: 'invalid_note' })
  })
})

describe.skipIf(!hasDatabase)(
  'record_payment: at most one package ahead (Herman, 7 Oct 2026)',
  () => {
    const db = useTestDb()
    const sql = 'select public.record_payment($1, $2, $3, $4)'

    /** A new 1-to-1 group of meiling's, added by the coach, who stays signed in. */
    async function newGroup(openingUsed = 0, openingPaid = 0) {
      const meiling = await db.idOf('meiling')
      await db.as('herman')
      const { rows } = await db.query<{ id: string }>(
        `select public.create_group($1, '[{"name": "Test Kid"}]'::jsonb, 'Palm Court',
                                  false, null, null, $2, $3) as id`,
        [meiling, openingUsed, openingPaid],
      )
      return rows[0]?.id ?? ''
    }

    /** meiling books `weeks` weekly lessons at 7:30 pm from `day`; then the coach is signed in again. */
    async function book(groupId: string, day: string, weeks: number) {
      await db.as('meiling')
      await db.query('select public.book_lesson($1, $2, 60, $3)', [
        groupId,
        `${day} 19:30+08`,
        weeks,
      ])
      await db.as('herman')
    }

    it('lets the tester’s Package 2 be paid once, then waits for a lesson booked in it', async () => {
      // Package 1 paid (as a starting balance), its 4 lessons booked.
      const group = await newGroup(0, 4)
      await book(group, '2026-09-29', 4)
      await recordPayment(db, group, 4, 0, 'cash')
      await db.as('herman')
      expect(await failure(db, sql, [group, 4, 0, 'cash'])).toEqual({
        message: 'paid_ahead',
        detail: { package_no: 2 },
      })
      // A lesson booked in Package 2 opens payments again: Package 3.
      await book(group, '2026-10-22', 1)
      await recordPayment(db, group, 4, 0, 'cash')
      await db.as('herman')
      expect(await failure(db, sql, [group, 4, 0, 'cash'])).toMatchObject({
        message: 'paid_ahead',
        detail: { package_no: 3 },
      })
      expect(await balance(db, group)).toMatchObject({ paid_lessons: 12, booked_lessons: 5 })
    })

    it('lets a new group pay for Package 1 once before it books', async () => {
      const group = await newGroup()
      await recordPayment(db, group, 4, 0, 'cash')
      await db.as('herman')
      expect(await failure(db, sql, [group, 4, 0, 'cash'])).toEqual({
        message: 'paid_ahead',
        detail: { package_no: 1 },
      })
    })

    it('refuses one payment that would pay further ahead, but always allows a whole package', async () => {
      const group = await newGroup(0, 4)
      await book(group, '2026-09-29', 4)
      expect(await failure(db, sql, [group, 12, 0, 'cash'])).toEqual({
        message: 'too_many_lessons',
        detail: { max: 4 },
      })
      // A free lesson makes 5 paid: a normal package of 4 still goes through.
      await db.query('select public.add_free_lesson($1)', [group])
      await recordPayment(db, group, 4, 0, 'cash')
      expect(await balance(db, group)).toMatchObject({ paid_lessons: 9 })
    })

    it('lets lessons used before the system be paid off in one go', async () => {
      const group = await newGroup(10, 0)
      await recordPayment(db, group, 12, 0, 'cash')
      expect(await balance(db, group)).toMatchObject({ paid_lessons: 12, used_lessons: 10 })
    })
  },
)
