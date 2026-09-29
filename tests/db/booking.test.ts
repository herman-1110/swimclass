// Booking (TECH_SPEC §5.2, prompt 04; PRD BR-10 to BR-14, BR-21, BR-31, BR-34, BR-35):
// book_lesson, coach_book and coach_slot_check against the seed, with the clock at
// Sat 26 Sep 2026 12:00 MYT unless a test says otherwise, and two bookings arriving at
// the same moment.
import pg from 'pg'
import { describe, expect, it } from 'vitest'
import {
  hasDatabase,
  myt,
  openSession,
  SEED,
  SESSION_LOCK_TIMEOUT_MS,
  useTestDb,
  type Session,
  type TestDb,
} from './helpers'

const LOCK_NOT_AVAILABLE = '55P03'
/** lock_booking_dates' advisory lock namespace (supabase/migrations/…_booking.sql). */
const DATE_LOCKS = 20260929

type Detail = Record<string, unknown> | null
type Check = { ok: boolean; reason: string | null; detail: Detail }
type Booking = {
  id: string
  group_id: string
  starts: string
  ends: string
  location: string
  status: string
  gap_override: boolean
  series_id: string | null
  created_by: string | null
}
type Email = {
  to_email: string
  kind: string
  dedupe_key: string
  subject: string
  body_text: string
  body_html: string
}

/** MYT wall-clock text as the functions write it: t('2026-09-29', '17:30'). */
function t(day: string, time: string) {
  return `${day}T${time}:00+08:00`
}

async function book(db: TestDb, groupId: string, startsAt: string, minutes = 60, weeks = 1) {
  const { rows } = await db.query<{ ids: string[] }>(
    'select public.book_lesson($1, $2, $3, $4) as ids',
    [groupId, startsAt, minutes, weeks],
  )
  return rows[0]?.ids ?? []
}

type CoachOptions = {
  weeks?: number
  ignoreOpenHours?: boolean
  gapOverride?: boolean
  ignoreCredit?: boolean
}

const COACH_BOOK = 'select public.coach_book($1, $2, $3, $4, $5, $6, $7) as ids'

function coachBookParams(groupId: string, startsAt: string, minutes = 60, o: CoachOptions = {}) {
  return [
    groupId,
    startsAt,
    minutes,
    o.weeks ?? 1,
    o.ignoreOpenHours ?? false,
    o.gapOverride ?? false,
    o.ignoreCredit ?? false,
  ]
}

async function coachBook(
  db: TestDb,
  groupId: string,
  startsAt: string,
  minutes = 60,
  options: CoachOptions = {},
) {
  const { rows } = await db.query<{ ids: string[] }>(
    COACH_BOOK,
    coachBookParams(groupId, startsAt, minutes, options),
  )
  return rows[0]?.ids ?? []
}

/** The error of SQL that must fail: its code, message and parsed detail. */
async function failure(db: TestDb, sql: string, params?: readonly unknown[]) {
  const error = await db.expectFailure(sql, params)
  const detail: unknown = error.detail ? JSON.parse(error.detail) : null
  return { code: error.code, message: error.message, detail }
}

/** Bookings by id, in start order, read as the owner (the test acts as the owner after). */
async function bookings(db: TestDb, ids: string[]) {
  await db.asOwner()
  const { rows } = await db.query<Booking>(
    `select id, group_id,
            to_char(starts_at at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI') as starts,
            to_char(ends_at at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI') as ends,
            location, status::text, gap_override, series_id, created_by
     from public.bookings
     where id = any ($1::uuid[])
     order by starts_at`,
    [ids],
  )
  return rows
}

async function countBookings(db: TestDb, groupId: string) {
  await db.asOwner()
  const { rows } = await db.query<{ n: number }>(
    'select count(*) as n from public.bookings where group_id = $1',
    [groupId],
  )
  return rows[0]?.n
}

/**
 * The outbox rows this test's transaction added, oldest first (read as the owner). Their
 * created_at is the transaction's now(); rows the dev database already had are older.
 */
async function outbox(db: TestDb) {
  await db.asOwner()
  const { rows } = await db.query<Email>(
    `select to_email, kind, dedupe_key, subject, body_text, body_html
     from public.email_outbox
     where created_at = now()
     order by id`,
  )
  return rows
}

async function slotAt(db: TestDb, weekStart: string, groupId: string, at: string, minutes = 60) {
  const { rows } = await db.query<Check>(
    `select ok, reason, detail from public.week_slots($1, $2, $3)
     where to_char(starts_at at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI') = $4`,
    [weekStart, minutes, groupId, at],
  )
  expect(rows, at).toHaveLength(1)
  return rows[0]
}

async function coachSlotCheck(
  db: TestDb,
  startsAt: string,
  minutes = 60,
  ignoreOpenHours = false,
  gapOverride = false,
) {
  const { rows } = await db.query<Check>(
    'select ok, reason, detail from public.coach_slot_check($1, $2, $3, $4, $5)',
    [SEED.groups.kai, startsAt, minutes, ignoreOpenHours, gapOverride],
  )
  expect(rows).toHaveLength(1)
  return rows[0]
}

async function balance(db: TestDb, groupId: string) {
  await db.asOwner()
  const { rows } = await db.query<{
    paid_lessons: number
    used_lessons: number
    booked_lessons: number
    package_no: number
    used_in_package: number
    booked_in_package: number
    left_in_package: number
    can_still_book: number
    unpaid: boolean
    unpaid_since: Date | null
    last_lesson_at: Date | null
  }>('select * from public.group_balance where group_id = $1', [groupId])
  return rows[0]
}

describe.skipIf(!hasDatabase)('book_lesson', () => {
  const db = useTestDb()

  it('books a free time for a customer’s own group; it then shows as hers, and as another lesson to others', async () => {
    const meiling = await db.idOf('meiling')
    await db.as('meiling')
    const ids = await book(db, SEED.groups.aimanSofia, '2026-09-29 19:30+08')
    expect(ids).toHaveLength(1)

    expect(await slotAt(db, '2026-09-28', SEED.groups.aimanSofia, '2026-09-29 19:30')).toEqual({
      ok: false,
      reason: 'overlap_mine',
      detail: {
        starts_at: t('2026-09-29', '19:30'),
        ends_at: t('2026-09-29', '20:30'),
        names: 'Aiman & Sofia',
      },
    })
    await db.as('priya')
    expect(await slotAt(db, '2026-09-28', SEED.groups.priya, '2026-09-29 19:30')).toEqual({
      ok: false,
      reason: 'overlap_other',
      detail: { starts_at: t('2026-09-29', '19:30'), ends_at: t('2026-09-29', '20:30') },
    })

    const [row] = await bookings(db, ids)
    expect(row).toEqual({
      id: ids[0],
      group_id: SEED.groups.aimanSofia,
      starts: '2026-09-29 19:30',
      ends: '2026-09-29 20:30',
      location: 'Palm Court',
      status: 'booked',
      gap_override: false,
      series_id: expect.any(String) as string,
      created_by: meiling,
    })
  })

  it('booking "Sofia" (1-to-1) on Tue 29 Sep 7:30 pm makes the group Unpaid, into Package 3', async () => {
    await db.as('meiling')
    const [id] = await book(db, SEED.groups.sofia, '2026-09-29 19:30+08')
    // group_balance counts packages by lessons used (7 of 8 paid: still Package 2, with
    // no lesson left in it); the new lesson is the ninth, the first of Package 3.
    expect(await balance(db, SEED.groups.sofia)).toMatchObject({
      paid_lessons: 8,
      used_lessons: 7,
      booked_lessons: 2,
      package_no: 2,
      used_in_package: 3,
      booked_in_package: 1,
      left_in_package: 0,
      unpaid: true,
      // Lesson 9, the first one not paid for, is Sunday's.
      unpaid_since: myt('2026-10-04 17:00'),
      last_lesson_at: null,
      can_still_book: 3,
    })
    // Lessons are numbered in start order (BR-23): the new Tuesday lesson takes the last
    // place in Package 2, so Sunday's becomes the first lesson of Package 3.
    const { rows } = await db.query<{
      booking_id: string
      package_no: number
      lesson_in_package: number
    }>(
      `select booking_id, package_no, lesson_in_package from public.booking_ledger
       where group_id = $1 and not used order by starts_at`,
      [SEED.groups.sofia],
    )
    expect(rows).toEqual([
      { booking_id: id, package_no: 2, lesson_in_package: 4 },
      { booking_id: SEED.bookings.sofiaSun4, package_no: 3, lesson_in_package: 1 },
    ])
  })

  it('lets Wei Jie book one more lesson, then refuses the next with credit_exceeded (BR-21)', async () => {
    await db.as('weijie')
    expect(await book(db, SEED.groups.weiJie, '2026-09-29 19:30+08')).toHaveLength(1)
    expect(
      await failure(db, 'select public.book_lesson($1, $2, 60)', [
        SEED.groups.weiJie,
        '2026-09-30 17:30+08',
      ]),
    ).toMatchObject({
      message: 'credit_exceeded',
      detail: { needed: 1, can_still_book: 0 },
    })
    expect(await countBookings(db, SEED.groups.weiJie)).toBe(4)
  })

  it('counts a 2-hour lesson as 2 against the credit', async () => {
    await db.as('weijie')
    expect(
      await failure(db, 'select public.book_lesson($1, $2, 120)', [
        SEED.groups.weiJie,
        '2026-09-30 17:30+08',
      ]),
    ).toMatchObject({ message: 'credit_exceeded', detail: { needed: 2, can_still_book: 1 } })
  })

  it('repeats weekly at the same MYT time, all weeks in one series (BR-13)', async () => {
    await db.as('meiling')
    const ids = await book(db, SEED.groups.aimanSofia, '2026-09-29 19:30+08', 60, 3)
    const rows = await bookings(db, ids)
    expect(rows.map((r) => r.starts)).toEqual([
      '2026-09-29 19:30',
      '2026-10-06 19:30',
      '2026-10-13 19:30',
    ])
    expect(new Set(rows.map((r) => r.series_id)).size).toBe(1)
    expect(rows.map((r) => r.id)).toEqual(ids)
  })

  it('books nothing when any week clashes, and lists the clashing dates (BR-13)', async () => {
    // Tue 6 Oct 19:30 is taken; Tue 13 Oct 19:30 is too soon after a lesson ending 19:00.
    await db.query(
      `insert into public.bookings (group_id, starts_at, ends_at, location)
       values ($1, '2026-10-06 19:30+08', '2026-10-06 20:30+08', 'Sunrise Res.'),
              ($1, '2026-10-13 18:00+08', '2026-10-13 19:00+08', 'Sunrise Res.')`,
      [SEED.groups.hana],
    )
    const before = await countBookings(db, SEED.groups.aimanSofia)
    await db.as('meiling')
    expect(
      await failure(db, 'select public.book_lesson($1, $2, 60, 3)', [
        SEED.groups.aimanSofia,
        '2026-09-29 19:30+08',
      ]),
    ).toEqual({
      code: 'P0001',
      message: 'repeat_conflict',
      detail: {
        dates: ['2026-10-06', '2026-10-13'],
        clashes: [
          {
            date: '2026-10-06',
            reason: 'overlap_other',
            detail: { starts_at: t('2026-10-06', '19:30'), ends_at: t('2026-10-06', '20:30') },
          },
          {
            date: '2026-10-13',
            reason: 'gap_after',
            detail: { ends_at: t('2026-10-13', '19:00') },
          },
        ],
      },
    })
    expect(await countBookings(db, SEED.groups.aimanSofia)).toBe(before)
    expect(await outbox(db)).toEqual([])
  })

  it('lists weeks after the booking window as clashes too', async () => {
    // Clock Sat 26 Sep: customers can book up to Sun 25 Oct.
    await db.as('meiling')
    expect(
      await failure(db, 'select public.book_lesson($1, $2, 60, 3)', [
        SEED.groups.aimanSofia,
        '2026-10-13 19:30+08',
      ]),
    ).toMatchObject({
      message: 'repeat_conflict',
      detail: {
        dates: ['2026-10-27'],
        clashes: [{ date: '2026-10-27', reason: 'outside_window', detail: null }],
      },
    })
  })

  it('refuses a single lesson with slot_check’s reason and detail, as the Book screen shows it', async () => {
    await db.as('meiling')
    const cases: [string | null, number, string, Detail][] = [
      [
        '2026-09-29 17:30+08',
        60,
        'overlap_other',
        { starts_at: t('2026-09-29', '17:30'), ends_at: t('2026-09-29', '18:30') },
      ],
      ['2026-09-29 18:30+08', 60, 'gap_after', { ends_at: t('2026-09-29', '18:30') }],
      ['2026-09-30 19:00+08', 60, 'gap_before', { starts_at: t('2026-09-30', '20:30') }],
      [
        '2026-10-03 09:00+08',
        60,
        'overlap_mine',
        {
          starts_at: t('2026-10-03', '09:00'),
          ends_at: t('2026-10-03', '10:00'),
          names: 'Aiman & Sofia',
        },
      ],
      ['2026-09-26 11:00+08', 60, 'past', null],
      [null, 60, 'past', null],
      ['2026-10-26 17:30+08', 60, 'outside_window', null],
      ['2026-09-29 19:45+08', 60, 'off_step', null],
      ['2026-09-29 12:00+08', 60, 'outside_open_hours', null],
      ['2026-09-29 19:30+08', 90, 'invalid_length', null],
    ]
    for (const [startsAt, minutes, message, detail] of cases) {
      expect(
        await failure(db, 'select public.book_lesson($1, $2, $3)', [
          SEED.groups.aimanSofia,
          startsAt,
          minutes,
        ]),
        `${startsAt} ${minutes}`,
      ).toEqual({ code: 'P0001', message, detail })
    }
    for (const weeks of [0, 53, null]) {
      expect(
        await failure(db, 'select public.book_lesson($1, $2, 60, $3)', [
          SEED.groups.aimanSofia,
          '2026-09-29 19:30+08',
          weeks,
        ]),
        String(weeks),
      ).toMatchObject({ message: 'invalid_repeat' })
    }
    expect(await countBookings(db, SEED.groups.aimanSofia)).toBe(2)
  })

  it('refuses accounts waiting for approval, other people’s groups and inactive groups', async () => {
    await db.query(`update public.profiles set approved = false where username = 'nurul'`)
    await db.query('update public.groups set active = false where id = $1', [SEED.groups.sofia])

    await db.as('nurul')
    expect(
      await failure(db, 'select public.book_lesson($1, $2, 60)', [
        SEED.groups.nurul,
        '2026-09-29 19:30+08',
      ]),
    ).toMatchObject({ message: 'not_approved' })

    for (const [who, group] of [
      ['meiling', SEED.groups.hana],
      ['meiling', 'c0000000-0000-4000-8000-0000000000ff'],
      // The coach books through coach_book.
      ['herman', SEED.groups.hana],
    ] as const) {
      await db.as(who)
      expect(
        await failure(db, 'select public.book_lesson($1, $2, 60)', [group, '2026-09-29 19:30+08']),
        `${who} ${group}`,
      ).toMatchObject({ message: 'not_your_group' })
    }

    await db.as('meiling')
    expect(
      await failure(db, 'select public.book_lesson($1, $2, 60)', [
        SEED.groups.sofia,
        '2026-09-29 19:30+08',
      ]),
    ).toMatchObject({ message: 'group_inactive' })
  })

  it('once one booking is in, the same time is refused for everyone else (what the loser of a race sees)', async () => {
    await db.as('meiling')
    await book(db, SEED.groups.aimanSofia, '2026-10-20 19:30+08')
    await db.as('priya')
    expect(
      await failure(db, 'select public.book_lesson($1, $2, 60)', [
        SEED.groups.priya,
        '2026-10-20 19:30+08',
      ]),
    ).toMatchObject({ message: 'overlap_other' })
  })

  it('the travel gap counts across midnight: Sat 23:00 then Sun 00:00 is refused with gap_after', async () => {
    await db.query(
      `insert into public.availability_exceptions (kind, starts_at, ends_at)
       values ('open', '2026-10-24 22:00+08', '2026-10-25 02:00+08')`,
    )
    await db.as('meiling')
    await book(db, SEED.groups.aimanSofia, '2026-10-24 23:00+08')
    await db.as('priya')
    expect(
      await failure(db, 'select public.book_lesson($1, $2, 60)', [
        SEED.groups.priya,
        '2026-10-25 00:00+08',
      ]),
    ).toEqual({
      code: 'P0001',
      message: 'gap_after',
      detail: { ends_at: t('2026-10-25', '00:00') },
    })
  })

  it('and Sun 00:00 then Sat 23:00 is refused with gap_before', async () => {
    await db.query(
      `insert into public.availability_exceptions (kind, starts_at, ends_at)
       values ('open', '2026-10-24 22:00+08', '2026-10-25 02:00+08')`,
    )
    await db.as('priya')
    await book(db, SEED.groups.priya, '2026-10-25 00:00+08')
    await db.as('meiling')
    expect(
      await failure(db, 'select public.book_lesson($1, $2, 60)', [
        SEED.groups.aimanSofia,
        '2026-10-24 23:00+08',
      ]),
    ).toEqual({
      code: 'P0001',
      message: 'gap_before',
      detail: { starts_at: t('2026-10-25', '00:00') },
    })
  })
})

describe.skipIf(!hasDatabase)('booking emails (TECH_SPEC §8, BR-34, BR-35, BR-37)', () => {
  const db = useTestDb()

  it('queues one confirmation to the customer, in plain text and HTML', async () => {
    await db.as('meiling')
    const [id] = await book(db, SEED.groups.aimanSofia, '2026-09-29 19:30+08')
    const [row] = await bookings(db, [id ?? ''])
    const text = [
      'Hi Mei Ling,',
      '',
      'Your lesson for Aiman & Sofia is booked:',
      'Tue 29 Sep, 7:30–8:30 pm at Palm Court',
      '',
      'Free to cancel or reschedule until 1:30 pm, Tue 29 Sep.',
      'See your lessons: {{site_url}}/classes',
      '',
      'Sent by Swim Class. Reply to this email to reach your coach.',
    ].join('\n')
    const html = [
      '<p>Hi Mei Ling,</p>',
      '<p>Your lesson for Aiman &amp; Sofia is booked:<br>Tue 29 Sep, 7:30–8:30 pm at Palm Court</p>',
      '<p>Free to cancel or reschedule until 1:30 pm, Tue 29 Sep.<br>See your lessons: ' +
        '<a href="{{site_url}}/classes">{{site_url}}/classes</a></p>',
      '<p>Sent by Swim Class. Reply to this email to reach your coach.</p>',
    ].join('\n')
    // More than 24 hours away: no late alert.
    expect(await outbox(db)).toEqual([
      {
        to_email: 'meiling@example.com',
        kind: 'booked',
        dedupe_key: `booked:${row?.series_id}`,
        subject: 'Booked: Aiman & Sofia, Tue 29 Sep, 7:30–8:30 pm',
        body_text: text,
        body_html: html,
      },
    ])
  })

  it('lists every lesson of a weekly series in one email, and never queues it twice', async () => {
    await db.as('meiling')
    const ids = await book(db, SEED.groups.aimanSofia, '2026-09-29 19:30+08', 60, 2)
    const [first] = await bookings(db, ids)
    const emails = await outbox(db)
    expect(emails).toHaveLength(1)
    expect(emails[0]).toMatchObject({
      dedupe_key: `booked:${first?.series_id}`,
      subject: 'Booked: 2 lessons for Aiman & Sofia from Tue 29 Sep',
    })
    expect(emails[0]?.body_text).toContain(
      [
        'Your 2 lessons for Aiman & Sofia at Palm Court are booked:',
        'Tue 29 Sep, 7:30–8:30 pm',
        'Tue 6 Oct, 7:30–8:30 pm',
        '',
        'Free to cancel or reschedule each lesson up to 6 hours before it starts.',
      ].join('\n'),
    )
    // Queueing the same series again adds nothing (dedupe_key, BR-37).
    await db.query('select public.queue_booked_emails($1)', [first?.series_id])
    await db.query('select public.queue_booked_emails($1)', [first?.series_id])
    expect(await outbox(db)).toHaveLength(1)
  })

  it('alerts the coach when a lesson starting within 24 hours is booked', async () => {
    await db.as('meiling')
    const [id] = await book(db, SEED.groups.aimanSofia, '2026-09-27 09:00+08')
    const emails = await outbox(db)
    expect(emails.map((e) => [e.kind, e.to_email])).toEqual([
      ['booked', 'meiling@example.com'],
      ['late_alert', 'herman@example.com'],
    ])
    expect(emails[0]?.body_text).toContain(
      'Free to cancel or reschedule until 3:00 am, Sun 27 Sep.',
    )
    expect(emails[1]).toMatchObject({
      dedupe_key: `late:${id}:booked`,
      subject: 'Late booking: Aiman & Sofia, Sun 27 Sep, 9:00–10:00 am',
      body_text: [
        'Mei Ling booked a lesson that starts within 24 hours:',
        'Sun 27 Sep, 9:00–10:00 am · Aiman & Sofia (1-to-2) · Palm Court',
        '',
        'Your schedule: {{site_url}}/coach/schedule',
        '',
        'Sent by Swim Class.',
      ].join('\n'),
    })
  })

  it('counts exactly 24 hours ahead as within 24 hours, and a lesson past the cutoff as locked', async () => {
    await db.setNow('2026-09-26 09:00+08')
    await db.as('meiling')
    const [atLimit] = await book(db, SEED.groups.aimanSofia, '2026-09-27 09:00+08')
    await book(db, SEED.groups.aimanSofia, '2026-09-27 11:00+08')
    expect(
      (await outbox(db)).filter((e) => e.kind === 'late_alert').map((e) => e.dedupe_key),
    ).toEqual([`late:${atLimit}:booked`])

    // Booked 4 hours before it starts, inside the 6-hour cutoff.
    await db.setNow('2026-09-27 12:00+08')
    await db.as('meiling')
    await book(db, SEED.groups.aimanSofia, '2026-09-27 16:00+08')
    const confirmation = (await outbox(db)).find(
      (e) => e.kind === 'booked' && e.subject.includes('Sun 27 Sep, 4:00–5:00 pm'),
    )
    expect(confirmation?.body_text).toContain(
      "It starts in less than 6 hours, so it can't be cancelled.",
    )
  })

  it('says so when the first lesson of a series is already past the cutoff', async () => {
    // Tue 29 Sep 3:00 pm: tonight's 7:30 pm lesson is less than 6 hours away.
    await db.setNow('2026-09-29 15:00+08')
    await db.as('meiling')
    await book(db, SEED.groups.aimanSofia, '2026-09-29 19:30+08', 60, 2)
    const [email] = await outbox(db)
    expect(email?.body_text).toContain(
      'Free to cancel or reschedule each lesson up to 6 hours before it starts. ' +
        "The first one starts in less than 6 hours, so it can't be cancelled.",
    )
  })

  it('writes times as the app does, across noon and midnight', async () => {
    const { rows } = await db.query<{ text: string }>(
      `select public.myt_when_text(v.starts_at::timestamptz, v.ends_at::timestamptz) as text
       from (values (1, '2026-10-03 11:00+08', '2026-10-03 12:00+08'),
                    (2, '2026-10-03 12:00+08', '2026-10-03 13:00+08'),
                    (3, '2026-10-04 10:00+08', '2026-10-04 12:00+08'),
                    (4, '2026-10-10 23:00+08', '2026-10-11 00:00+08'),
                    (5, '2026-10-11 00:00+08', '2026-10-11 01:00+08')) as v (n, starts_at, ends_at)
       order by v.n`,
    )
    expect(rows.map((r) => r.text)).toEqual([
      'Sat 3 Oct, 11:00 am–12:00 pm',
      'Sat 3 Oct, 12:00–1:00 pm',
      'Sun 4 Oct, 10:00 am–12:00 pm',
      'Sat 10 Oct, 11:00 pm–12:00 am',
      'Sun 11 Oct, 12:00–1:00 am',
    ])
  })

  it('never lets free text carry the {{site_url}} placeholder (only the templates’ links do)', async () => {
    await db.query(
      `update public.profiles set display_name = 'Mei {{site_url}}@evil.example' where username = 'meiling'`,
    )
    await db.as('meiling')
    await book(db, SEED.groups.aimanSofia, '2026-09-27 09:00+08')
    const [confirmation, alert] = await outbox(db)
    expect(confirmation?.body_text).toContain('Hi Mei { {site_url}}@evil.example,')
    expect(alert?.body_text).toContain('Mei { {site_url}}@evil.example booked a lesson')
    // One link each: the template's own.
    for (const email of [confirmation, alert]) {
      expect(email?.body_html.split('<a ').length).toBe(2)
      expect(email?.body_html).not.toContain('{{site_url}}@')
    }
  })

  it('follows the booking_confirmations and late_change_alert settings, and needs a coach email', async () => {
    await db.query(
      'update public.settings set booking_confirmations = false, late_change_alert = false',
    )
    await db.as('meiling')
    await book(db, SEED.groups.aimanSofia, '2026-09-27 09:00+08')
    expect(await outbox(db)).toEqual([])

    await db.query(`update public.settings set late_change_alert = true, coach_email = ''`)
    await db.as('meiling')
    await book(db, SEED.groups.aimanSofia, '2026-09-27 11:00+08')
    expect(await outbox(db)).toEqual([])

    await db.query('update public.settings set booking_confirmations = true')
    await db.as('meiling')
    await book(db, SEED.groups.aimanSofia, '2026-09-27 16:00+08')
    expect((await outbox(db)).map((e) => e.kind)).toEqual(['booked'])
  })

  it('escapes names in the HTML version (they are free text)', async () => {
    await db.query(`update public.students set name = 'Aiman <b>' where id = $1`, [
      SEED.students.aiman,
    ])
    await db.as('meiling')
    await book(db, SEED.groups.aimanSofia, '2026-09-29 19:30+08')
    const [email] = await outbox(db)
    expect(email?.body_text).toContain('Your lesson for Aiman <b> & Sofia is booked:')
    expect(email?.body_html).toContain('Your lesson for Aiman &lt;b&gt; &amp; Sofia is booked:')
    expect(email?.body_html).not.toContain('<b>')
  })

  it('sends nothing for bookings the coach makes', async () => {
    await db.as('herman')
    await coachBook(db, SEED.groups.hana, '2026-09-27 09:00+08')
    expect(await outbox(db)).toEqual([])
  })
})

describe.skipIf(!hasDatabase)('coach_book (BR-31)', () => {
  const db = useTestDb()

  it('books any group for the coach; overlaps are refused whatever the options', async () => {
    const herman = await db.idOf('herman')
    await db.as('herman')
    const ids = await coachBook(db, SEED.groups.hana, '2026-09-29 19:30+08')
    expect(await bookings(db, ids)).toEqual([
      expect.objectContaining({
        starts: '2026-09-29 19:30',
        location: 'Sunrise Res.',
        gap_override: false,
        created_by: herman,
      }),
    ])
    await db.as('herman')
    const all = { ignoreOpenHours: true, gapOverride: true, ignoreCredit: true }
    expect(
      await failure(
        db,
        COACH_BOOK,
        coachBookParams(SEED.groups.hana, '2026-09-29 17:30+08', 60, all),
      ),
    ).toEqual({
      code: 'P0001',
      message: 'overlap_other',
      detail: { starts_at: t('2026-09-29', '17:30'), ends_at: t('2026-09-29', '18:30') },
    })
  })

  it('books outside open hours only when asked, on any whole minute, even across midnight', async () => {
    await db.as('herman')
    expect(
      await failure(db, COACH_BOOK, coachBookParams(SEED.groups.hana, '2026-09-29 12:00+08')),
    ).toMatchObject({ message: 'outside_open_hours' })
    const noon = await coachBook(db, SEED.groups.hana, '2026-09-29 12:10+08', 60, {
      ignoreOpenHours: true,
    })
    const late = await coachBook(db, SEED.groups.kai, '2026-10-10 23:30+08', 60, {
      ignoreOpenHours: true,
    })
    expect((await bookings(db, [...noon, ...late])).map((b) => [b.starts, b.ends])).toEqual([
      ['2026-09-29 12:10', '2026-09-29 13:10'],
      ['2026-10-10 23:30', '2026-10-11 00:30'],
    ])
    await db.as('herman')
    expect(
      await failure(
        db,
        COACH_BOOK,
        coachBookParams(SEED.groups.hana, '2026-09-30 12:10:30+08', 60, { ignoreOpenHours: true }),
      ),
    ).toMatchObject({ message: 'off_step' })
  })

  it('skips the travel gap only when asked, and marks only the weeks that needed it', async () => {
    await db.as('herman')
    // Wed 30 Sep 19:00–20:00 ends 30 minutes before Daniel's 20:30 lesson.
    expect(
      await failure(db, COACH_BOOK, coachBookParams(SEED.groups.kai, '2026-09-30 19:00+08')),
    ).toEqual({
      code: 'P0001',
      message: 'gap_before',
      detail: { starts_at: t('2026-09-30', '20:30') },
    })
    const ids = await coachBook(db, SEED.groups.kai, '2026-09-30 19:00+08', 60, {
      weeks: 2,
      gapOverride: true,
    })
    expect((await bookings(db, ids)).map((b) => [b.starts, b.gap_override])).toEqual([
      ['2026-09-30 19:00', true],
      ['2026-10-07 19:00', false],
    ])
  })

  it('may book in the past, where the lesson counts as used, and beyond the booking window (Herman)', async () => {
    await db.as('herman')
    const past = await coachBook(db, SEED.groups.hana, '2026-09-25 17:30+08')
    expect(past).toHaveLength(1)
    expect(await balance(db, SEED.groups.hana)).toMatchObject({ used_lessons: 21 })
    await db.as('herman')
    expect(await coachBook(db, SEED.groups.hana, '2026-10-26 17:30+08')).toHaveLength(1)
  })

  it('keeps the credit limit unless asked to ignore it; the balance may then go negative', async () => {
    await db.as('herman')
    expect(
      await failure(
        db,
        COACH_BOOK,
        coachBookParams(SEED.groups.weiJie, '2026-09-30 17:30+08', 120),
      ),
    ).toMatchObject({ message: 'credit_exceeded', detail: { needed: 2, can_still_book: 1 } })
    await coachBook(db, SEED.groups.weiJie, '2026-09-30 17:30+08', 120, { ignoreCredit: true })
    expect(await balance(db, SEED.groups.weiJie)).toMatchObject({ can_still_book: -1 })
  })

  it('repeats at the same MYT time across the US clock change (the session is in Los Angeles)', async () => {
    await db.as('herman')
    const ids = await coachBook(db, SEED.groups.kai, '2026-10-27 19:30+08', 60, { weeks: 3 })
    expect((await bookings(db, ids)).map((b) => b.starts)).toEqual([
      '2026-10-27 19:30',
      '2026-11-03 19:30',
      '2026-11-10 19:30',
    ])
  })

  it('refuses customers, groups that don’t exist and inactive groups', async () => {
    await db.query('update public.groups set active = false where id = $1', [SEED.groups.sofia])
    await db.as('meiling')
    expect(
      await failure(db, COACH_BOOK, coachBookParams(SEED.groups.aimanSofia, '2026-09-29 19:30+08')),
    ).toMatchObject({ message: 'not_coach' })
    await db.as('herman')
    expect(
      await failure(
        db,
        COACH_BOOK,
        coachBookParams('c0000000-0000-4000-8000-0000000000ff', '2026-09-29 19:30+08'),
      ),
    ).toMatchObject({ message: 'not_found' })
    expect(
      await failure(db, COACH_BOOK, coachBookParams(SEED.groups.sofia, '2026-09-29 19:30+08')),
    ).toMatchObject({ message: 'group_inactive' })
  })
})

describe.skipIf(!hasDatabase)('coach_slot_check (the Add booking dialog)', () => {
  const db = useTestDb()

  it('gives the clash reason with the coach’s options applied', async () => {
    await db.as('herman')
    const ok = { ok: true, reason: null, detail: null }
    expect(await coachSlotCheck(db, '2026-09-29 19:30+08')).toEqual(ok)
    expect(await coachSlotCheck(db, '2026-09-29 12:00+08')).toMatchObject({
      reason: 'outside_open_hours',
    })
    expect(await coachSlotCheck(db, '2026-09-29 12:10+08', 60, true)).toEqual(ok)
    expect(await coachSlotCheck(db, '2026-09-29 12:10:30+08', 60, true)).toMatchObject({
      reason: 'off_step',
    })
    expect(await coachSlotCheck(db, '2026-09-30 19:00+08')).toEqual({
      ok: false,
      reason: 'gap_before',
      detail: { starts_at: t('2026-09-30', '20:30') },
    })
    expect(await coachSlotCheck(db, '2026-09-30 19:00+08', 60, false, true)).toEqual(ok)
    // Overlaps are never optional, and show the coach times only.
    expect(await coachSlotCheck(db, '2026-09-29 17:30+08', 60, true, true)).toEqual({
      ok: false,
      reason: 'overlap_other',
      detail: { starts_at: t('2026-09-29', '17:30'), ends_at: t('2026-09-29', '18:30') },
    })
    // The past and beyond the booking window are fine for the coach.
    expect(await coachSlotCheck(db, '2026-09-25 17:30+08')).toEqual(ok)
    expect(await coachSlotCheck(db, '2026-10-26 17:30+08')).toEqual(ok)
    expect(await coachSlotCheck(db, '2026-09-29 19:30+08', 90)).toMatchObject({
      reason: 'invalid_length',
    })
  })

  it('refuses customers and groups that don’t exist', async () => {
    await db.as('meiling')
    expect(
      await failure(db, 'select * from public.coach_slot_check($1, $2, 60)', [
        SEED.groups.aimanSofia,
        '2026-09-29 19:30+08',
      ]),
    ).toMatchObject({ message: 'not_coach' })
    await db.as('herman')
    expect(
      await failure(db, 'select * from public.coach_slot_check($1, $2, 60)', [
        'c0000000-0000-4000-8000-0000000000ff',
        '2026-09-29 19:30+08',
      ]),
    ).toMatchObject({ message: 'not_found' })
  })
})

type Lock = { locktype: string; day: string | null }

type Call = readonly [Session, string, readonly unknown[]]

describe.skipIf(!hasDatabase)(
  'two bookings at the same moment (BR-14; nothing is committed)',
  () => {
    const db = useTestDb()
    const RACE_TIMEOUT = SESSION_LOCK_TIMEOUT_MS + 20_000

    /** Ungranted locks the session is waiting for; polls until it waits for something. */
    async function locksWaitedFor(pid: number) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const { rows } = await db.query<Lock>(
          `select locktype,
                case when locktype = 'advisory' and classid = $2 and objsubid = 2
                     then to_char((date '2000-01-01' + objid::text::int)::timestamp, 'YYYY-MM-DD')
                end as day
         from pg_catalog.pg_locks
         where pid = $1 and not granted`,
          [pid, DATE_LOCKS],
        )
        if (rows.length > 0) return rows
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      return []
    }

    /** The booking-date locks a session holds. */
    async function dateLocksHeld(pid: number) {
      const { rows } = await db.query<{ day: string }>(
        `select to_char((date '2000-01-01' + objid::text::int)::timestamp, 'YYYY-MM-DD') as day
       from pg_catalog.pg_locks
       where pid = $1 and granted and locktype = 'advisory' and classid = $2 and objsubid = 2
       order by 1`,
        [pid, DATE_LOCKS],
      )
      return rows.map((r) => r.day)
    }

    /** Whether the session holds its place in the queue for a groups row (a tuple lock). */
    async function holdsGroupRowPlace(pid: number) {
      const { rows } = await db.query<{ n: number }>(
        `select count(*) as n from pg_catalog.pg_locks
         where pid = $1 and granted and locktype = 'tuple'
           and relation = 'public.groups'::regclass`,
        [pid],
      )
      return (rows[0]?.n ?? 0) > 0
    }

    /**
     * Sends both calls at the same moment. The first to finish must succeed; the other
     * waits for its lock, and as the winner never commits, gives up after the lock
     * timeout. In the app it would wait until the winner commits, then see its lesson and
     * be refused (the tests above show those errors). The loser's locks are read while it
     * is still waiting: once it gives up, its transaction is aborted and they are gone.
     */
    async function race(first: Call, second: Call) {
      const calls = [first, second] as const
      const outcomes = calls.map(([session, sql, params]) =>
        session.query(sql, params).then(
          () => null,
          (error: unknown) => error,
        ),
      )
      const winnerIndex = await Promise.race(outcomes.map((outcome, i) => outcome.then(() => i)))
      const winner = calls[winnerIndex === 0 ? 0 : 1][0]
      const loser = calls[winnerIndex === 0 ? 1 : 0][0]
      const waitedFor = await locksWaitedFor(loser.pid)
      const loserDateLocks = await dateLocksHeld(loser.pid)
      const loserHoldsGroupRowPlace = await holdsGroupRowPlace(loser.pid)
      const winnerError = await outcomes[winnerIndex === 0 ? 0 : 1]
      const loserError = await outcomes[winnerIndex === 0 ? 1 : 0]
      return {
        winner,
        loser,
        waitedFor,
        loserDateLocks,
        loserHoldsGroupRowPlace,
        winnerError,
        loserError,
      }
    }

    function codeOf(error: unknown) {
      return error instanceof pg.DatabaseError ? error.code : String(error)
    }

    it(
      'the same slot: exactly one succeeds; the other waits for the date lock',
      async () => {
        const a = await openSession()
        const b = await openSession()
        try {
          await a.as('meiling')
          await b.as('priya')
          const sql = 'select public.book_lesson($1, $2, 60)'
          const result = await race(
            [a, sql, [SEED.groups.aimanSofia, '2026-10-20 19:30+08']],
            [b, sql, [SEED.groups.priya, '2026-10-20 19:30+08']],
          )
          expect(result.winnerError).toBeNull()
          expect(codeOf(result.loserError)).toBe(LOCK_NOT_AVAILABLE)
          expect(result.waitedFor).toContainEqual({ locktype: 'advisory', day: '2026-10-20' })
          expect(result.loserDateLocks).toEqual([])
          expect(await dateLocksHeld(result.winner.pid)).toEqual(['2026-10-20'])
        } finally {
          await a.close()
          await b.close()
        }
      },
      RACE_TIMEOUT,
    )

    it(
      'Wei Jie on two different dates: exactly one succeeds; the other waits for the group lock',
      async () => {
        const a = await openSession()
        const b = await openSession()
        try {
          await a.as('weijie')
          await b.as('weijie')
          const sql = 'select public.book_lesson($1, $2, 60)'
          const result = await race(
            [a, sql, [SEED.groups.weiJie, '2026-10-19 17:30+08']],
            [b, sql, [SEED.groups.weiJie, '2026-10-21 17:30+08']],
          )
          expect(result.winnerError).toBeNull()
          expect(codeOf(result.loserError)).toBe(LOCK_NOT_AVAILABLE)
          // Stuck at the group's row (the group lock comes first), holding no date lock.
          expect(result.waitedFor.length).toBeGreaterThan(0)
          expect(result.waitedFor.every((lock) => lock.locktype !== 'advisory')).toBe(true)
          expect(result.loserHoldsGroupRowPlace).toBe(true)
          expect(result.loserDateLocks).toEqual([])
        } finally {
          await a.close()
          await b.close()
        }
      },
      RACE_TIMEOUT,
    )

    it(
      'the travel gap across midnight: Sat 23:00 and Sun 00:00 at the same moment, exactly one succeeds',
      async () => {
        const a = await openSession()
        const b = await openSession()
        try {
          for (const session of [a, b]) {
            // Each session sees the extra time in its own transaction.
            await session.query(
              `insert into public.availability_exceptions (kind, starts_at, ends_at)
             values ('open', '2026-10-24 22:00+08', '2026-10-25 02:00+08')`,
            )
          }
          await a.as('meiling')
          await b.as('priya')
          const sql = 'select public.book_lesson($1, $2, 60)'
          const result = await race(
            [a, sql, [SEED.groups.aimanSofia, '2026-10-24 23:00+08']],
            [b, sql, [SEED.groups.priya, '2026-10-25 00:00+08']],
          )
          expect(result.winnerError).toBeNull()
          expect(codeOf(result.loserError)).toBe(LOCK_NOT_AVAILABLE)
          // Whichever won holds both dates: its lesson's and the one its travel gap
          // reaches into. The other waits at the first of them, holding none (dates are
          // locked in order, so nobody waits in a circle).
          expect(await dateLocksHeld(result.winner.pid)).toEqual(['2026-10-24', '2026-10-25'])
          expect(result.waitedFor).toContainEqual({ locktype: 'advisory', day: '2026-10-24' })
          expect(result.loserDateLocks).toEqual([])
        } finally {
          await a.close()
          await b.close()
        }
      },
      RACE_TIMEOUT,
    )

    it('the booking functions are volatile: after waiting for a lock, each statement sees what was committed', async () => {
      const { rows } = await db.query<{ name: string; volatility: string }>(
        `select proname as name, provolatile as volatility from pg_catalog.pg_proc
       where pronamespace = 'public'::regnamespace
         and proname in ('book_lesson', 'coach_book', 'place_bookings', 'lock_booking_dates',
                         'cancel_booking')
       order by 1`,
      )
      expect(rows).toEqual([
        { name: 'book_lesson', volatility: 'v' },
        { name: 'cancel_booking', volatility: 'v' },
        { name: 'coach_book', volatility: 'v' },
        { name: 'lock_booking_dates', volatility: 'v' },
        { name: 'place_bookings', volatility: 'v' },
      ])
    })
  },
)

describe.skipIf(!hasDatabase)('the clock (TECH_SPEC §5)', () => {
  const db = useTestDb()

  it('can’t be moved through the API: only direct connections can pin app.now', async () => {
    // PostgREST connects as `authenticator`; app_now() ignores app.now for it.
    const { rows: source } = await db.query<{ source: string }>(
      `select prosrc as source from pg_catalog.pg_proc where oid = 'public.app_now()'::regprocedure`,
    )
    expect(source[0]?.source).toMatch(/session_user\s*<>\s*'authenticator'/)

    // set_config lives in pg_catalog, which the API doesn't expose. No function the API
    // can call (public, executable by anon or authenticated) sets a setting, reads
    // app.now other than app_now() itself, or takes a clock from the caller.
    const { rows } = await db.query<{ name: string }>(
      `select p.oid::regprocedure::text as name
       from pg_catalog.pg_proc p
       where p.pronamespace = 'public'::regnamespace
         and (has_function_privilege('anon', p.oid, 'execute')
              or has_function_privilege('authenticated', p.oid, 'execute'))
         and (p.prosrc ~* '(set_config|app\\.now|set\\s+(local\\s+|session\\s+)?[a-z_]+\\.)'
              or coalesce(array_to_string(p.proconfig, ','), '') ~* 'app\\.now'
              or coalesce(array_to_string(p.proargnames, ','), '') ~* '(now|clock|time_?zone)')
       order by 1`,
    )
    expect(rows.map((r) => r.name)).toEqual(['app_now()'])
    const { rows: exposed } = await db.query<{ n: number }>(
      `select count(*) as n from pg_catalog.pg_proc
       where proname in ('set_config', 'current_setting') and pronamespace = 'public'::regnamespace`,
    )
    expect(exposed[0]?.n).toBe(0)
  })

  it('so a customer can’t dodge the cancel cutoff: the check uses app_now()', async () => {
    // Direct connections (like this test) can pin the clock; the cutoff follows it.
    await db.setNow('2026-10-03 03:01+08')
    await db.as('meiling')
    expect(
      await failure(db, 'select public.cancel_booking($1)', [SEED.bookings.aimanSofiaSat3]),
    ).toMatchObject({ message: 'locked' })
  })
})
