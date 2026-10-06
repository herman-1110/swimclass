// The mail queue (prompt 11; TECH_SPEC §5.5, §7, §8; PRD BR-32, BR-33, BR-37):
// queue_daily_emails (the evening reminders and the coach's digest), claim_outbox and
// ack_outbox (what the mail-queue Edge Function hands to the Apps Script poller), and the
// coach's email_log. The clock is set per test.
//
// Once mail-queue runs on dev, daily_jobs and the outbox may already hold real rows. The tests
// clear what they depend on inside their own transaction (it is rolled back) and read only the
// rows they add.
import { describe, expect, it } from 'vitest'

import { SEED } from './fixture'
import { hasDatabase, type TestDb, useTestDb } from './helpers'

type Email = {
  id: number
  to_email: string
  kind: string
  dedupe_key: string
  subject: string
  body_text: string
  body_html: string
}

/** The outbox rows this test's transaction added (their created_at is its now()). */
async function outbox(db: TestDb, kind?: string) {
  await db.asOwner()
  const { rows } = await db.query<Email>(
    `select id, to_email, kind, dedupe_key, subject, body_text, body_html from public.email_outbox
     where created_at = now() and ($1::text is null or kind = $1)
     order by id`,
    [kind ?? null],
  )
  return rows
}

/**
 * Sets the clock (MYT) and forgets a date's daily jobs and emails if dev already holds them.
 * Also approves any sign-ups waiting on dev, so the digest says exactly what the seed implies.
 */
async function prepare(db: TestDb, clock: string, forDate: string) {
  await db.asOwner()
  await db.setNow(`${clock}+08`)
  await db.query('delete from public.daily_jobs where for_date = $1', [forDate])
  await db.query(
    `delete from public.email_outbox
     where dedupe_key like 'reminder:%:' || $1 or dedupe_key = 'digest:' || $1`,
    [forDate],
  )
  await db.query(
    `update public.profiles set approved = true where role = 'customer' and not approved`,
  )
}

/** queue_daily_emails as the owner (the service role in production): how many it queued. */
async function queue(db: TestDb, forDate: string) {
  await db.asOwner()
  const { rows } = await db.query<{ n: number }>('select public.queue_daily_emails($1) as n', [
    forDate,
  ])
  return rows[0]?.n
}

/** Queues the daily emails for a date at a clock (MYT), after `prepare`. */
async function queueAt(db: TestDb, clock: string, forDate: string) {
  await prepare(db, clock, forDate)
  return queue(db, forDate)
}

async function jobs(db: TestDb, forDate: string) {
  const { rows } = await db.query<{ job: string }>(
    'select job from public.daily_jobs where for_date = $1 order by job',
    [forDate],
  )
  return rows.map((r) => r.job)
}

async function setSettings(db: TestDb, set: string) {
  await db.asOwner()
  await db.query(`update public.settings set ${set} where id = 1`)
}

const FOOTER = 'Sent by Swim Class. Reply to this email to reach your coach.'

describe.skipIf(!hasDatabase)('queue_daily_emails: reminders (BR-32)', () => {
  const db = useTestDb()

  it('queues one reminder per account with lessons tomorrow at reminder_time, once', async () => {
    expect(await queueAt(db, '2026-10-02 20:05', '2026-10-03')).toBe(4)
    const reminders = await outbox(db, 'reminder')
    const meiling = await db.idOf('meiling')
    const farah = await db.idOf('farah')
    const zulaikha = await db.idOf('zulaikha')
    expect(reminders.map((e) => [e.to_email, e.dedupe_key, e.subject]).sort()).toEqual([
      ['farah@example.com', `reminder:${farah}:2026-10-03`, 'Swim lesson tomorrow, Sat 3 Oct'],
      ['meiling@example.com', `reminder:${meiling}:2026-10-03`, 'Swim lesson tomorrow, Sat 3 Oct'],
      [
        'zulaikha@example.com',
        `reminder:${zulaikha}:2026-10-03`,
        'Swim lesson tomorrow, Sat 3 Oct',
      ],
    ])
    expect(reminders.find((e) => e.to_email === 'meiling@example.com')).toMatchObject({
      body_text: [
        'Hi Mei Ling,',
        '',
        'Your swim lesson tomorrow, Sat 3 Oct:',
        '',
        '9:00–10:00 am for Aiman & Sofia at Palm Court',
        'Free to cancel or reschedule until 3:00 am, Sat 3 Oct.',
        '',
        'See your lessons: {{site_url}}/my-classes',
        '',
        FOOTER,
      ].join('\n'),
      body_html: [
        '<p>Hi Mei Ling,</p>',
        '<p>Your swim lesson tomorrow, Sat 3 Oct:</p>',
        '<p>9:00–10:00 am for Aiman &amp; Sofia at Palm Court<br>Free to cancel or reschedule until 3:00 am, Sat 3 Oct.</p>',
        '<p>See your lessons: <a href="{{site_url}}/my-classes">{{site_url}}/my-classes</a></p>',
        `<p>${FOOTER}</p>`,
      ].join('\n'),
    })
    expect(await jobs(db, '2026-10-03')).toEqual(['digest', 'reminder'])

    // Every later poll that evening adds nothing.
    expect(await queue(db, '2026-10-03')).toBe(0)
    await db.setNow('2026-10-02 23:55+08')
    expect(await queue(db, '2026-10-03')).toBe(0)
    expect(await outbox(db)).toHaveLength(4)
  })

  it('lists every lesson of the account in one email, each with its deadline', async () => {
    await db.as('herman')
    await db.query(`select public.coach_book($1, '2026-10-03 19:00+08', 60)`, [SEED.groups.sofia])
    await queueAt(db, '2026-10-02 20:05', '2026-10-03')
    const meiling = (await outbox(db, 'reminder')).find((e) => e.to_email === 'meiling@example.com')
    expect(meiling?.subject).toBe('Swim lessons tomorrow, Sat 3 Oct')
    expect(meiling?.body_text).toContain(
      [
        'Your 2 swim lessons tomorrow, Sat 3 Oct:',
        '',
        '9:00–10:00 am for Aiman & Sofia at Palm Court',
        'Free to cancel or reschedule until 3:00 am, Sat 3 Oct.',
        '',
        '7:00–8:00 pm for Sofia at Palm Court',
        'Free to cancel or reschedule until 1:00 pm, Sat 3 Oct.',
      ].join('\n'),
    )
  })

  it('says when a lesson can no longer be cancelled', async () => {
    await setSettings(db, 'cancel_cutoff_hours = 24')
    await queueAt(db, '2026-10-02 20:05', '2026-10-03')
    const farah = (await outbox(db, 'reminder')).find((e) => e.to_email === 'farah@example.com')
    expect(farah?.body_text).toContain(
      "5:00–6:00 pm for Hana at Sunrise Res.\nIt starts in less than 24 hours, so it can't be cancelled.",
    )
  })

  it('leaves out cancelled lessons', async () => {
    const { rows } = await db.query<{ id: string }>(
      `select id from public.bookings where group_id = $1 and starts_at = '2026-10-03 17:00+08'`,
      [SEED.groups.hana],
    )
    await db.as('herman')
    await db.query('select public.cancel_booking($1)', [rows[0]?.id])
    await queueAt(db, '2026-10-02 20:05', '2026-10-03')
    expect((await outbox(db, 'reminder')).map((e) => e.to_email).sort()).toEqual([
      'meiling@example.com',
      'zulaikha@example.com',
    ])
  })

  it('queues nothing before reminder_time or once the day has begun', async () => {
    expect(await queueAt(db, '2026-10-02 19:59', '2026-10-03')).toBe(0)
    expect(await jobs(db, '2026-10-03')).toEqual([])
    expect(await queueAt(db, '2026-10-03 00:00', '2026-10-03')).toBe(0)
    expect(await jobs(db, '2026-10-03')).toEqual([])
    expect(await outbox(db)).toEqual([])
  })
})

describe.skipIf(!hasDatabase)('queue_daily_emails: the coach digest (BR-33)', () => {
  const db = useTestDb()

  const SCHEDULE = 'Your schedule: {{site_url}}/coach/schedule\n\nSent by Swim Class.'

  it('lists tomorrow’s 3 lessons in order with the travel gaps and the unpaid group', async () => {
    await queueAt(db, '2026-10-02 20:05', '2026-10-03')
    const digests = await outbox(db, 'digest')
    expect(digests).toHaveLength(1)
    expect(digests[0]).toMatchObject({
      to_email: 'herman@example.com',
      dedupe_key: 'digest:2026-10-03',
      subject: 'Tomorrow: 3 lessons, first at 9:00 am',
      body_text: [
        'Tomorrow, Sat 3 Oct: 3 lessons.',
        '',
        '9:00–10:00 am · Aiman & Sofia (1-to-2) · Palm Court',
        'Travel gap to the next lesson: 1 hour',
        '',
        '11:00 am–12:00 pm · Adam, Alya & Amir (1-to-3) · Maple Condo',
        'Travel gap to the next lesson: 5 hours',
        '',
        '5:00–6:00 pm · Hana (1-to-1) · Sunrise Res.',
        '',
        'Unpaid:',
        'Hana: collect payment (no 1-to-1 price in Settings)',
        '',
        SCHEDULE,
      ].join('\n'),
    })
    expect(digests[0]?.body_html).toContain(
      '<a href="{{site_url}}/coach/schedule">{{site_url}}/coach/schedule</a>',
    )
  })

  it('no longer lists Hana as unpaid once her payment is recorded', async () => {
    await db.setNow('2026-10-02 20:00+08')
    await db.as('herman')
    await db.query(`select public.record_payment($1, 4, 24000, 'cash')`, [SEED.groups.hana])
    await queueAt(db, '2026-10-02 20:05', '2026-10-03')
    const digest = (await outbox(db, 'digest'))[0]
    expect(digest?.body_text).toContain(
      '5:00–6:00 pm · Hana (1-to-1) · Sunrise Res.\n\n' + SCHEDULE,
    )
    expect(digest?.body_text).not.toContain('Unpaid')
  })

  it('shows what to collect at the group’s price and flags a gap shorter than usual', async () => {
    // Fri 2 Oct: Wei Jie (unpaid, 3 lessons past his payments: one package) and Kai, booked by
    // the coach with a gap override 30 minutes after him.
    await setSettings(db, 'price_1to1_cents = 24000')
    await queueAt(db, '2026-10-01 20:05', '2026-10-02')
    expect((await outbox(db, 'digest'))[0]).toMatchObject({
      subject: 'Tomorrow: 2 lessons, first at 7:30 pm',
      body_text: [
        'Tomorrow, Fri 2 Oct: 2 lessons.',
        '',
        '7:30–8:30 pm · Wei Jie (1-to-1) · Palm Court',
        'Travel gap to the next lesson: 30 min (less than your usual 1 hour)',
        '',
        '9:00–10:00 pm · Kai (1-to-1) · Palm Court',
        '',
        'Unpaid:',
        'Wei Jie: collect RM 240',
        '',
        SCHEDULE,
      ].join('\n'),
    })
  })

  it('flags groups on their last paid lesson', async () => {
    await queueAt(db, '2026-10-03 20:05', '2026-10-04')
    const digest = (await outbox(db, 'digest'))[0]
    expect(digest?.subject).toBe('Tomorrow: 4 lessons, first at 8:00 am')
    expect(digest?.body_text).toContain('Last paid lesson:\nSofia at 5:00 pm\n\n' + SCHEDULE)
  })

  it('lists sign-ups waiting for approval by username, not the name they typed', async () => {
    await prepare(db, '2026-10-02 20:05', '2026-10-03')
    await db.query(
      `insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
               'authenticated', 'p11.waiting@example.com',
               '{"username": "p11.waiting", "display_name": "Visit evil.example now", "phone": ""}')`,
    )
    await queue(db, '2026-10-03')
    const digest = (await outbox(db, 'digest'))[0]
    expect(digest?.body_text).toContain(
      'Waiting for approval: 1 (p11.waiting)\n' +
        'Approve or remove them on Students & payments: {{site_url}}/coach/students\n\n' +
        SCHEDULE,
    )
    expect(digest?.body_text).not.toContain('evil')
  })

  it('still comes on a day with no lessons', async () => {
    await queueAt(db, '2026-10-05 20:05', '2026-10-06')
    expect(await outbox(db)).toMatchObject([
      {
        kind: 'digest',
        subject: 'Tomorrow: no lessons',
        body_text: 'No lessons tomorrow, Tue 6 Oct.\n\n' + SCHEDULE,
      },
    ])
  })

  it('waits for digest_time, which may differ from reminder_time', async () => {
    await setSettings(db, `digest_time = '21:00'`)
    await queueAt(db, '2026-10-02 20:05', '2026-10-03')
    expect(await jobs(db, '2026-10-03')).toEqual(['reminder'])
    expect(await outbox(db, 'digest')).toEqual([])
    await db.setNow('2026-10-02 21:00+08')
    await queue(db, '2026-10-03')
    expect(await jobs(db, '2026-10-03')).toEqual(['digest', 'reminder'])
    expect(await outbox(db, 'digest')).toHaveLength(1)
  })

  it('sends no digest while coach_email is empty, and still records the job', async () => {
    await setSettings(db, `coach_email = ''`)
    expect(await queueAt(db, '2026-10-02 20:05', '2026-10-03')).toBe(3)
    expect(await outbox(db, 'digest')).toEqual([])
    expect(await jobs(db, '2026-10-03')).toEqual(['digest', 'reminder'])
  })
})

describe.skipIf(!hasDatabase)('claim_outbox and ack_outbox (TECH_SPEC §7)', () => {
  const db = useTestDb()

  type Row = { id: number; kind: string; attempts: number; last_error: string | null }

  /** Empties the outbox (inside the test's transaction) and adds rows queued at the times given. */
  async function fill(rows: { kind: string; at: string }[]) {
    await db.asOwner()
    await db.query('delete from public.email_outbox')
    const ids: number[] = []
    for (const [n, row] of rows.entries()) {
      const { rows: added } = await db.query<{ id: number }>(
        `insert into public.email_outbox (to_email, subject, body_text, kind, dedupe_key, created_at)
         values ('someone@example.com', 'Subject', 'Body', $1, 'test:' || $2, $3)
         returning id`,
        [row.kind, n, `${row.at}+08`],
      )
      ids.push(added[0]?.id ?? 0)
    }
    return ids
  }

  async function claim(limit: number | null) {
    const { rows } = await db.query<Row>(
      'select id, kind, attempts, last_error from public.claim_outbox($1)',
      [limit],
    )
    return rows
  }

  async function ack(id: number | undefined, ok: boolean, error: string | null = null) {
    const { rows } = await db.query<{ done: boolean }>(
      'select public.ack_outbox($1, $2, $3) as done',
      [id, ok, error],
    )
    return rows[0]?.done
  }

  async function row(id: number | undefined) {
    const { rows } = await db.query<{
      claimed_at: Date | null
      sent_at: Date | null
      attempts: number
      last_error: string | null
    }>('select claimed_at, sent_at, attempts, last_error from public.email_outbox where id = $1', [
      id,
    ])
    return rows[0]
  }

  it('hands out reminders, digests and late alerts first, then the oldest', async () => {
    const [broadcast, booked, reminder, lateAlert, digest] = await fill([
      { kind: 'broadcast', at: '2026-09-25 09:00' },
      { kind: 'booked', at: '2026-09-25 10:00' },
      { kind: 'reminder', at: '2026-09-25 20:00' },
      { kind: 'late_alert', at: '2026-09-25 21:00' },
      { kind: 'digest', at: '2026-09-25 20:00' },
    ])
    expect((await claim(4)).map((r) => r.id)).toEqual([reminder, digest, lateAlert, broadcast])
    expect(await row(reminder)).toMatchObject({
      claimed_at: new Date('2026-09-26T12:00:00+08:00'),
      sent_at: null,
      attempts: 0,
    })
    // Claimed rows aren't handed out again while their claim is fresh.
    expect((await claim(10)).map((r) => r.id)).toEqual([booked])
    expect(await claim(10)).toEqual([])
  })

  it('caps a claim at 50 rows', async () => {
    await fill(Array.from({ length: 55 }, () => ({ kind: 'booked', at: '2026-09-25 09:00' })))
    expect(await claim(100)).toHaveLength(50)
    expect(await claim(100)).toHaveLength(5)
    await fill([{ kind: 'booked', at: '2026-09-25 09:00' }])
    expect(await claim(0)).toEqual([])
    expect(await claim(null)).toEqual([])
  })

  it('marks a row sent only while it is claimed', async () => {
    const [first, second] = await fill([
      { kind: 'booked', at: '2026-09-25 09:00' },
      { kind: 'booked', at: '2026-09-25 10:00' },
    ])
    await claim(1)
    expect(await ack(second, true)).toBe(false) // never claimed
    expect(await ack(first, true)).toBe(true)
    expect(await row(first)).toMatchObject({
      sent_at: new Date('2026-09-26T12:00:00+08:00'),
    })
    expect(await ack(first, true)).toBe(false) // already sent
    expect((await claim(10)).map((r) => r.id)).toEqual([second])
  })

  it('retries a failed email up to 5 times and keeps the first 500 characters of the error', async () => {
    const [id] = await fill([{ kind: 'booked', at: '2026-09-25 09:00' }])
    for (let attempt = 1; attempt <= 5; attempt++) {
      expect((await claim(10)).map((r) => r.id)).toEqual([id])
      expect(await ack(id, false, `Try ${attempt}: ${'x'.repeat(600)}`)).toBe(true)
      expect(await row(id)).toMatchObject({ claimed_at: null, attempts: attempt })
    }
    expect(await claim(10)).toEqual([])
    const given = await row(id)
    expect(given?.last_error).toHaveLength(500)
    expect(given?.last_error?.startsWith('Try 5: xxx')).toBe(true)
    expect(given?.sent_at).toBeNull()
  })

  it('hands a claim out again after 15 minutes without an answer, as a failed try', async () => {
    const [id] = await fill([{ kind: 'reminder', at: '2026-09-26 11:00' }])
    await claim(10)
    await db.setNow('2026-09-26 12:14+08')
    expect(await claim(10)).toEqual([])
    await db.setNow('2026-09-26 12:15+08')
    expect(await claim(10)).toEqual([
      {
        id,
        kind: 'reminder',
        attempts: 1,
        last_error: "The mailer took it but didn't say whether it was sent.",
      },
    ])
  })

  it('deletes rows sent, or given up on, more than 90 days ago', async () => {
    const [old, recent, gaveUp, waiting] = await fill([
      { kind: 'booked', at: '2026-06-01 09:00' },
      { kind: 'booked', at: '2026-06-01 09:00' },
      { kind: 'booked', at: '2026-06-01 09:00' },
      { kind: 'booked', at: '2026-06-01 09:00' },
    ])
    await db.query(`update public.email_outbox set sent_at = '2026-06-27 11:59+08' where id = $1`, [
      old,
    ])
    await db.query(`update public.email_outbox set sent_at = '2026-06-28 12:00+08' where id = $1`, [
      recent,
    ])
    await db.query(`update public.email_outbox set attempts = 5 where id = $1`, [gaveUp])
    expect((await claim(10)).map((r) => r.id)).toEqual([waiting])
    const { rows } = await db.query<{ id: number }>(
      'select id from public.email_outbox order by id',
    )
    expect(rows.map((r) => r.id)).toEqual([recent, waiting])
  })

  it('is for the service role only', async () => {
    const { rows } = await db.query<{ role: string; queue: boolean; claim: boolean; ack: boolean }>(
      `select r.rolname as role,
              has_function_privilege(r.oid, 'public.queue_daily_emails(date)', 'execute') as queue,
              has_function_privilege(r.oid, 'public.claim_outbox(int)', 'execute') as claim,
              has_function_privilege(r.oid, 'public.ack_outbox(bigint, boolean, text)', 'execute') as ack
       from pg_roles r
       where r.rolname in ('anon', 'authenticated', 'service_role')
       order by r.rolname`,
    )
    expect(rows).toEqual([
      { role: 'anon', queue: false, claim: false, ack: false },
      { role: 'authenticated', queue: false, claim: false, ack: false },
      { role: 'service_role', queue: true, claim: true, ack: true },
    ])
    await fill([{ kind: 'booked', at: '2026-09-25 09:00' }])
    await db.query('set local role service_role')
    expect(await claim(10)).toHaveLength(1)
  })
})

describe.skipIf(!hasDatabase)('email_log (the coach’s Email log)', () => {
  const db = useTestDb()

  it('gives the coach the latest emails, newest first, and refuses everyone else', async () => {
    await db.asOwner()
    await db.query('delete from public.email_outbox')
    await db.query(
      `insert into public.email_outbox
         (to_email, subject, body_text, kind, dedupe_key, created_at, sent_at, attempts, last_error)
       values ('a@example.com', 'S', 'B', 'booked', 'test:1', '2026-09-25 09:00+08', '2026-09-25 09:05+08', 0, null),
              ('b@example.com', 'S', 'B', 'reminder', 'test:2', '2026-09-25 20:00+08', null, 2, 'Quota'),
              ('c@example.com', 'S', 'B', 'digest', 'test:3', '2026-09-25 20:00+08', null, 0, null)`,
    )
    await db.as('herman')
    const { rows } = await db.query('select * from public.email_log(2)')
    expect(rows).toEqual([
      {
        created_at: new Date('2026-09-25T20:00:00+08:00'),
        to_email: 'c@example.com',
        kind: 'digest',
        sent_at: null,
        attempts: 0,
        last_error: null,
      },
      {
        created_at: new Date('2026-09-25T20:00:00+08:00'),
        to_email: 'b@example.com',
        kind: 'reminder',
        sent_at: null,
        attempts: 2,
        last_error: 'Quota',
      },
    ])
    expect((await db.query('select * from public.email_log()')).rows).toHaveLength(3)

    await db.as('meiling')
    expect((await db.expectFailure('select * from public.email_log()')).message).toBe('not_coach')
    await db.asAnon()
    expect((await db.expectFailure('select * from public.email_log()')).code).toBe('42501')
  })
})
