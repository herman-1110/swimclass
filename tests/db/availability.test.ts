// The availability engine (TECH_SPEC §5.1 and §10; PRD BR-8 to BR-12, BR-27, BR-29,
// BR-30): open_windows, slot_check, week_slots, week_busy and coach_week against the
// seed, with the clock at Sat 26 Sep 2026 12:00 MYT.
import { describe, expect, it } from 'vitest'

import { SEED } from './fixture'
import { hasDatabase, type TestDb, useTestDb } from './helpers'

const PERMISSION_DENIED = '42501'

type Detail = Record<string, unknown> | null
type Check = { ok: boolean; reason: string | null; detail: Detail }
type Slot = Check & { day: string; at: string; time: string }
type Window = { starts_at: string; ends_at: string }
type Busy = Window & {
  mine: boolean
  travel_before: number
  travel_after: number
  booking_id?: string
  group_id?: string
}
type BusyDay = { day: string; open: Window[]; closed: Window[]; busy: Busy[] }
type Lesson = Window & {
  booking_id: string
  group_id: string
  account_id: string
  account_name: string
  display_names: string
  type_label: string
  size: number
  location: string
  lessons: number
  status: string
  gap_override: boolean
  travel_before: number | null
  travel_after: number | null
  used: boolean | null
  package_no: number | null
  lesson_in_package: number | null
  package_size: number
  unpaid: boolean
  last_lesson: boolean
}
type Exception = Window & { id: string; kind: string; note: string | null }
type CoachDay = { day: string; open: Window[]; closed: Window[]; exceptions: Exception[] }
type CoachWeekDay = CoachDay & { lessons: Lesson[] }

const SAMPLE_WEEK = [
  '2026-09-28',
  '2026-09-29',
  '2026-09-30',
  '2026-10-01',
  '2026-10-02',
  '2026-10-03',
  '2026-10-04',
]

// TECH_SPEC §10 "Expected free start times, week of Mon 28 Sep", as MYT 24-hour times.
const FREE_1_HOUR: Record<string, string[]> = {
  '2026-09-28': ['17:30'],
  '2026-09-29': ['19:30', '20:00', '20:30', '21:00'],
  '2026-09-30': ['17:30', '18:00', '18:30'],
  '2026-10-01': [],
  '2026-10-02': ['17:30'],
  '2026-10-03': ['07:00', '19:00', '19:30', '20:00', '20:30', '21:00'],
  '2026-10-04': ['21:00'],
}
const FREE_2_HOURS: Record<string, string[]> = {
  '2026-09-28': [],
  '2026-09-29': ['19:30', '20:00'],
  '2026-09-30': ['17:30'],
  '2026-10-01': [],
  '2026-10-02': [],
  '2026-10-03': ['19:00', '19:30', '20:00'],
  '2026-10-04': [],
}

/** MYT wall-clock text as the functions write it: t('2026-09-29', '17:30'). */
function t(day: string, time: string) {
  return `${day}T${time}:00+08:00`
}

const SLOTS_SQL = `
  select day,
         to_char(starts_at at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI') as at,
         to_char(starts_at at time zone 'Asia/Kuala_Lumpur', 'HH24:MI') as time,
         ok, reason, detail
  from public.week_slots($1, $2, $3)`

async function weekSlots(db: TestDb, weekStart: string, minutes: number, groupId: string) {
  const { rows } = await db.query<Slot>(SLOTS_SQL, [weekStart, minutes, groupId])
  return rows
}

/**
 * Times per day of the week starting weekStart, every day present, for slots matching
 * `keep`. A slot outside those 7 days, or listed under the wrong day, fails the test.
 */
function timesByDay(slots: Slot[], weekStart: string, keep: (slot: Slot) => boolean) {
  const days: Record<string, string[]> = {}
  const monday = new Date(`${weekStart}T00:00:00Z`)
  for (let i = 0; i < 7; i++) {
    days[new Date(monday.getTime() + i * 86_400_000).toISOString().slice(0, 10)] = []
  }
  for (const slot of slots) {
    const day = days[slot.day]
    if (!day || !slot.at.startsWith(slot.day)) {
      throw new Error(`Start ${slot.at} listed under ${slot.day}, outside week ${weekStart}`)
    }
    if (keep(slot)) day.push(slot.time)
  }
  return days
}

function slotAt(slots: Slot[], at: string) {
  const slot = slots.find((s) => s.at === at)
  if (!slot) throw new Error(`No start time at ${at}`)
  return slot
}

/** Just the check result, so toEqual also proves no other keys (like names) came back. */
function result({ ok, reason, detail }: Check): Check {
  return { ok, reason, detail }
}

/** slot_check called directly (it has no grant, so as the owner). */
async function slotCheck(
  db: TestDb,
  startsAt: string | null,
  minutes: number | null,
  viewer = 'meiling',
  groupId: string = SEED.groups.aimanSofia,
) {
  await db.asOwner()
  const viewerId = await db.idOf(viewer)
  const { rows } = await db.query<Check>('select * from public.slot_check($1, $2, $3, $4)', [
    startsAt,
    minutes,
    groupId,
    viewerId,
  ])
  expect(rows).toHaveLength(1)
  return rows[0]
}

async function weekBusy(db: TestDb, weekStart: string) {
  const { rows } = await db.query<{ week: BusyDay[] }>('select public.week_busy($1) as week', [
    weekStart,
  ])
  return rows[0]?.week ?? []
}

async function coachWeek(db: TestDb, weekStart: string) {
  const { rows } = await db.query<{ week: CoachWeekDay[] }>(
    'select public.coach_week($1) as week',
    [weekStart],
  )
  return rows[0]?.week ?? []
}

async function openWindows(db: TestDb, day: string) {
  await db.asOwner()
  const { rows } = await db.query<Window>(
    `select public.myt_text(starts_at) as starts_at, public.myt_text(ends_at) as ends_at
     from public.open_windows($1)`,
    [day],
  )
  return rows
}

async function addException(
  db: TestDb,
  kind: 'open' | 'closed',
  startsAt: string,
  endsAt: string,
  note: string | null = null,
) {
  // The coach may write exceptions directly (TECH_SPEC §6).
  await db.as('herman')
  await db.query(
    `insert into public.availability_exceptions (kind, starts_at, ends_at, note)
     values ($1, $2, $3, $4)`,
    [kind, startsAt, endsAt, note],
  )
}

async function setSetting(db: TestDb, column: string, value: unknown) {
  await db.asOwner()
  await db.query(`update public.settings set ${column} = $1 where id = 1`, [value])
}

describe.skipIf(!hasDatabase)('open_windows', () => {
  const db = useTestDb()

  it('follows the weekly template: Mon–Fri 17:30–22:00, Sat and Sun 07:00–12:00 and 16:00–22:00', async () => {
    for (const day of SAMPLE_WEEK.slice(0, 5)) {
      expect(await openWindows(db, day)).toEqual([
        { starts_at: t(day, '17:30'), ends_at: t(day, '22:00') },
      ])
    }
    for (const day of SAMPLE_WEEK.slice(5)) {
      expect(await openWindows(db, day)).toEqual([
        { starts_at: t(day, '07:00'), ends_at: t(day, '12:00') },
        { starts_at: t(day, '16:00'), ends_at: t(day, '22:00') },
      ])
    }
  })

  it('merges an open exception with the rule it touches and subtracts closed exceptions', async () => {
    await addException(db, 'open', '2026-10-07 15:00+08', '2026-10-07 17:30+08')
    expect(await openWindows(db, '2026-10-07')).toEqual([
      { starts_at: t('2026-10-07', '15:00'), ends_at: t('2026-10-07', '22:00') },
    ])
    await addException(db, 'closed', '2026-10-07 18:00+08', '2026-10-07 19:00+08')
    expect(await openWindows(db, '2026-10-07')).toEqual([
      { starts_at: t('2026-10-07', '15:00'), ends_at: t('2026-10-07', '18:00') },
      { starts_at: t('2026-10-07', '19:00'), ends_at: t('2026-10-07', '22:00') },
    ])
    // Only that date changes (BR-30): the template stays as it was.
    expect(await openWindows(db, '2026-09-30')).toEqual([
      { starts_at: t('2026-09-30', '17:30'), ends_at: t('2026-09-30', '22:00') },
    ])
    expect(await openWindows(db, '2026-10-14')).toEqual([
      { starts_at: t('2026-10-14', '17:30'), ends_at: t('2026-10-14', '22:00') },
    ])
  })

  it('cuts exceptions at midnight MYT, so a closed range over several days closes each day', async () => {
    await addException(db, 'closed', '2026-10-06 12:00+08', '2026-10-08 18:00+08')
    expect(await openWindows(db, '2026-10-05')).toHaveLength(1)
    expect(await openWindows(db, '2026-10-06')).toEqual([])
    expect(await openWindows(db, '2026-10-07')).toEqual([])
    expect(await openWindows(db, '2026-10-08')).toEqual([
      { starts_at: t('2026-10-08', '18:00'), ends_at: t('2026-10-08', '22:00') },
    ])

    await addException(db, 'open', '2026-10-10 22:00+08', '2026-10-11 02:00+08')
    expect(await openWindows(db, '2026-10-10')).toEqual([
      { starts_at: t('2026-10-10', '07:00'), ends_at: t('2026-10-10', '12:00') },
      { starts_at: t('2026-10-10', '16:00'), ends_at: t('2026-10-11', '00:00') },
    ])
    expect(await openWindows(db, '2026-10-11')).toEqual([
      { starts_at: t('2026-10-11', '00:00'), ends_at: t('2026-10-11', '02:00') },
      { starts_at: t('2026-10-11', '07:00'), ends_at: t('2026-10-11', '12:00') },
      { starts_at: t('2026-10-11', '16:00'), ends_at: t('2026-10-11', '22:00') },
    ])
  })
})

describe.skipIf(!hasDatabase)('week_slots: the TECH_SPEC §10 sample week', () => {
  const db = useTestDb()

  it('free 1-hour starts for meiling with "Aiman & Sofia" match the table', async () => {
    await db.as('meiling')
    const slots = await weekSlots(db, '2026-09-28', 60, SEED.groups.aimanSofia)
    expect(timesByDay(slots, '2026-09-28', (s) => s.ok)).toEqual(FREE_1_HOUR)
  })

  it('free 2-hour starts for meiling with "Aiman & Sofia" match the table', async () => {
    await db.as('meiling')
    const slots = await weekSlots(db, '2026-09-28', 120, SEED.groups.aimanSofia)
    expect(timesByDay(slots, '2026-09-28', (s) => s.ok)).toEqual(FREE_2_HOURS)
  })

  it('gives any customer group the same free starts', async () => {
    await db.as('farah')
    const oneHour = await weekSlots(db, '2026-09-28', 60, SEED.groups.hana)
    expect(timesByDay(oneHour, '2026-09-28', (s) => s.ok)).toEqual(FREE_1_HOUR)
    await db.as('meiling')
    const sofia = await weekSlots(db, '2026-09-28', 120, SEED.groups.sofia)
    expect(timesByDay(sofia, '2026-09-28', (s) => s.ok)).toEqual(FREE_2_HOURS)
  })

  it('lists every start in open hours, free or not, stepping 30 minutes from each window start', async () => {
    await db.as('meiling')
    const oneHour = await weekSlots(db, '2026-09-28', 60, SEED.groups.aimanSofia)
    const weekday = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00']
    const weekend = [
      ...['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'],
      ...['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'],
      ...['20:30', '21:00'],
    ]
    expect(timesByDay(oneHour, '2026-09-28', () => true)).toEqual({
      '2026-09-28': weekday,
      '2026-09-29': weekday,
      '2026-09-30': weekday,
      '2026-10-01': weekday,
      '2026-10-02': weekday,
      '2026-10-03': weekend,
      '2026-10-04': weekend,
    })
    const twoHours = await weekSlots(db, '2026-09-28', 120, SEED.groups.aimanSofia)
    expect(twoHours.filter((s) => s.day === '2026-09-29').map((s) => s.time)).toEqual([
      '17:30',
      '18:00',
      '18:30',
      '19:00',
      '19:30',
      '20:00',
    ])
    expect(twoHours.filter((s) => s.day === '2026-10-03')).toHaveLength(16)
    // In start order, free ones without a reason.
    const order = oneHour.map((s) => s.at)
    expect(order).toEqual([...order].sort())
    for (const slot of oneHour.filter((s) => s.ok)) {
      expect(slot).toMatchObject({ reason: null, detail: null })
    }
  })

  it('returns every expected reason with the right detail (viewer meiling)', async () => {
    await db.as('meiling')
    const slots = await weekSlots(db, '2026-09-28', 60, SEED.groups.aimanSofia)
    const priya = { starts_at: t('2026-09-29', '17:30'), ends_at: t('2026-09-29', '18:30') }
    const expected: [string, string, Detail][] = [
      ['2026-09-29 17:30', 'overlap_other', priya],
      ['2026-09-29 18:00', 'overlap_other', priya],
      ['2026-09-29 18:30', 'gap_after', { ends_at: t('2026-09-29', '18:30') }],
      ['2026-09-29 19:00', 'gap_after', { ends_at: t('2026-09-29', '18:30') }],
      ['2026-09-30 19:00', 'gap_before', { starts_at: t('2026-09-30', '20:30') }],
      [
        '2026-10-03 09:00',
        'overlap_mine',
        {
          starts_at: t('2026-10-03', '09:00'),
          ends_at: t('2026-10-03', '10:00'),
          names: 'Aiman & Sofia',
        },
      ],
      ['2026-10-03 10:00', 'gap_after', { ends_at: t('2026-10-03', '10:00') }],
      [
        '2026-10-04 17:00',
        'overlap_mine',
        { starts_at: t('2026-10-04', '17:00'), ends_at: t('2026-10-04', '18:00'), names: 'Sofia' },
      ],
    ]
    for (const [at, reason, detail] of expected) {
      expect(result(slotAt(slots, at)), at).toEqual({ ok: false, reason, detail })
    }
  })

  it('shows other customers’ overlapping lessons with times only', async () => {
    await db.as('priya')
    const slots = await weekSlots(db, '2026-09-28', 60, SEED.groups.priya)
    expect(result(slotAt(slots, '2026-10-03 09:00'))).toEqual({
      ok: false,
      reason: 'overlap_other',
      detail: { starts_at: t('2026-10-03', '09:00'), ends_at: t('2026-10-03', '10:00') },
    })
    expect(result(slotAt(slots, '2026-09-29 17:30'))).toEqual({
      ok: false,
      reason: 'overlap_mine',
      detail: {
        starts_at: t('2026-09-29', '17:30'),
        ends_at: t('2026-09-29', '18:30'),
        names: 'Priya',
      },
    })
  })

  it('gives outside_window for Mon 26 Oct and past for earlier today', async () => {
    await db.as('meiling')
    const late = await weekSlots(db, '2026-10-26', 60, SEED.groups.aimanSofia)
    expect(slotAt(late, '2026-10-26 17:30')).toMatchObject({
      ok: false,
      reason: 'outside_window',
      detail: null,
    })
    expect(late.every((s) => s.reason === 'outside_window')).toBe(true)

    const thisWeek = await weekSlots(db, '2026-09-21', 60, SEED.groups.aimanSofia)
    for (const at of ['2026-09-21 17:30', '2026-09-26 07:00', '2026-09-26 11:00']) {
      expect(slotAt(thisWeek, at), at).toMatchObject({ ok: false, reason: 'past', detail: null })
    }
    // Later today isn't past: 16:00 ends right before Aiman & Sofia's 17:00 lesson.
    expect(slotAt(thisWeek, '2026-09-26 16:00')).toMatchObject({
      reason: 'gap_before',
      detail: { starts_at: t('2026-09-26', '17:00') },
    })
    expect(slotAt(thisWeek, '2026-09-26 21:00')).toMatchObject({
      reason: 'gap_after',
      detail: { ends_at: t('2026-09-26', '20:30') },
    })
  })

  it('adds 3:00–5:00 pm starts on Wed 7 Oct for an open exception, that day only, and a closed exception removes them', async () => {
    await db.as('meiling')
    const before = await weekSlots(db, '2026-10-05', 60, SEED.groups.aimanSofia)
    const beforeFree = timesByDay(before, '2026-10-05', (s) => s.ok)
    const nextWeek = await weekSlots(db, '2026-10-12', 60, SEED.groups.aimanSofia)

    await addException(db, 'open', '2026-10-07 15:00+08', '2026-10-07 17:30+08')
    await db.as('meiling')
    const opened = await weekSlots(db, '2026-10-05', 60, SEED.groups.aimanSofia)
    const openedFree = timesByDay(opened, '2026-10-05', (s) => s.ok)
    expect(openedFree).toEqual({
      ...beforeFree,
      '2026-10-07': [
        '15:00',
        '15:30',
        '16:00',
        '16:30',
        '17:00',
        ...(beforeFree['2026-10-07'] ?? []),
      ],
    })
    expect(await weekSlots(db, '2026-10-12', 60, SEED.groups.aimanSofia)).toEqual(nextWeek)

    await addException(db, 'closed', '2026-10-07 15:00+08', '2026-10-07 17:30+08')
    await db.as('meiling')
    const closed = await weekSlots(db, '2026-10-05', 60, SEED.groups.aimanSofia)
    expect(timesByDay(closed, '2026-10-05', (s) => s.ok)).toEqual(beforeFree)
    expect(closed).toEqual(before)
  })

  it('ignores cancelled and excused lessons', async () => {
    await db.query(`update public.bookings set status = 'cancelled' where id = $1`, [
      SEED.bookings.priyaTue29,
    ])
    await db.as('meiling')
    let slots = await weekSlots(db, '2026-09-28', 60, SEED.groups.aimanSofia)
    expect(timesByDay(slots, '2026-09-28', (s) => s.ok)['2026-09-29']).toEqual([
      '17:30',
      '18:00',
      '18:30',
      '19:00',
      '19:30',
      '20:00',
      '20:30',
      '21:00',
    ])
    await db.asOwner()
    await db.query(`update public.bookings set status = 'excused' where id = $1`, [
      SEED.bookings.priyaTue29,
    ])
    await db.as('meiling')
    slots = await weekSlots(db, '2026-09-28', 60, SEED.groups.aimanSofia)
    expect(slotAt(slots, '2026-09-29 17:30')).toMatchObject({ ok: true })
  })

  it('gives the same answers whatever the session time zone', async () => {
    await db.as('meiling')
    const reference = await weekSlots(db, '2026-09-28', 60, SEED.groups.aimanSofia)
    for (const zone of ['UTC', 'Pacific/Kiritimati', 'Pacific/Pago_Pago']) {
      await db.query(`select set_config('timezone', $1, true)`, [zone])
      expect(await weekSlots(db, '2026-09-28', 60, SEED.groups.aimanSofia), zone).toEqual(reference)
    }
  })
})

describe.skipIf(!hasDatabase)('slot_check', () => {
  const db = useTestDb()

  it('says ok with no reason or detail for a free time', async () => {
    expect(await slotCheck(db, '2026-09-29 19:30+08', 60)).toEqual({
      ok: true,
      reason: null,
      detail: null,
    })
  })

  it('runs the checks in the TECH_SPEC §5.1 order, first failure wins', async () => {
    const cases: [string | null, number | null, string][] = [
      // 1. past (before anything else), then the booking window
      ['2026-09-26 12:00+08', 60, 'past'],
      ['2026-09-26 09:00+08', 90, 'past'],
      [null, 60, 'past'],
      ['2026-10-26 17:45+08', 90, 'outside_window'],
      // 2. length, then the start step
      ['2026-09-29 19:45+08', 90, 'invalid_length'],
      ['2026-09-29 19:30+08', null, 'invalid_length'],
      ['2026-09-29 19:45+08', 60, 'off_step'],
      ['2026-09-29 19:30:30+08', 60, 'off_step'],
      ['2026-09-29 17:45+08', 60, 'off_step'],
      // 2 before 3: a bad length or step outside open hours, or overrunning them
      ['2026-09-29 12:00+08', 90, 'invalid_length'],
      ['2026-09-29 21:15+08', 60, 'off_step'],
      // 3. open hours, before overlaps (Priya's lesson starts at 17:30). A start in no
      // window has no step to be off (TECH_SPEC §5.1), so 12:10 is outside open hours.
      ['2026-09-29 12:10+08', 60, 'outside_open_hours'],
      ['2026-09-29 12:00+08', 60, 'outside_open_hours'],
      ['2026-09-29 17:00+08', 60, 'outside_open_hours'],
      ['2026-09-29 21:30+08', 60, 'outside_open_hours'],
      ['2026-09-29 22:00+08', 60, 'outside_open_hours'],
      ['2026-10-03 11:30+08', 60, 'outside_open_hours'],
      ['2026-10-03 11:00+08', 120, 'outside_open_hours'],
      // 4. overlaps before the travel gap: 10:30–11:30 on Sat 3 Oct is too soon after
      // Aiman & Sofia (ends 10:00) and overlaps Adam, Alya & Amir (11:00)
      ['2026-09-29 18:00+08', 60, 'overlap_other'],
      ['2026-10-03 10:30+08', 60, 'overlap_other'],
      // 5. travel gap
      ['2026-09-29 18:30+08', 60, 'gap_after'],
    ]
    for (const [startsAt, minutes, reason] of cases) {
      const check = await slotCheck(db, startsAt, minutes)
      expect(check, `${startsAt} ${minutes}`).toMatchObject({ ok: false, reason })
    }
  })

  it('counts the start step from the start of the open window, not from midnight', async () => {
    // Block 17:30–17:45 on Tue 6 Oct: that evening's window starts at 17:45.
    await addException(db, 'closed', '2026-10-06 17:30+08', '2026-10-06 17:45+08')
    expect(await slotCheck(db, '2026-10-06 17:45+08', 60)).toMatchObject({ ok: true })
    expect(await slotCheck(db, '2026-10-06 18:00+08', 60)).toMatchObject({ reason: 'off_step' })
    expect(await slotCheck(db, '2026-10-06 18:15+08', 60)).toMatchObject({ ok: true })
    await db.as('meiling')
    const slots = await weekSlots(db, '2026-10-05', 60, SEED.groups.aimanSofia)
    expect(slots.filter((s) => s.day === '2026-10-06').map((s) => s.time)).toEqual([
      '17:45',
      '18:15',
      '18:45',
      '19:15',
      '19:45',
      '20:15',
      '20:45',
    ])
  })

  it('counts the step from the window a start is in, not from the day’s first window', async () => {
    // Block 16:00–16:15 on Sat 10 Oct: the morning window still starts at 07:00, the
    // evening one now at 16:15 (555 minutes after 07:00, not a whole number of steps).
    await addException(db, 'closed', '2026-10-10 16:00+08', '2026-10-10 16:15+08')
    expect(await slotCheck(db, '2026-10-10 07:00+08', 60)).toMatchObject({ ok: true })
    expect(await slotCheck(db, '2026-10-10 16:15+08', 60)).toMatchObject({ ok: true })
    expect(await slotCheck(db, '2026-10-10 16:30+08', 60)).toMatchObject({ reason: 'off_step' })
    await db.as('meiling')
    const slots = await weekSlots(db, '2026-10-05', 60, SEED.groups.aimanSofia)
    const saturday = slots.filter((s) => s.day === '2026-10-10').map((s) => s.time)
    expect(saturday.filter((time) => time >= '16:00')).toEqual([
      '16:15',
      '16:45',
      '17:15',
      '17:45',
      '18:15',
      '18:45',
      '19:15',
      '19:45',
      '20:15',
      '20:45',
    ])
    expect(saturday.filter((time) => time < '12:00')).toHaveLength(9)
  })

  it('reports the earliest overlapping lesson first', async () => {
    // 9:30–11:30 on Sat 3 Oct overlaps Aiman & Sofia 9:00–10:00 and Adam, Alya & Amir 11:00–12:00.
    expect(await slotCheck(db, '2026-10-03 09:30+08', 120)).toEqual({
      ok: false,
      reason: 'overlap_mine',
      detail: {
        starts_at: t('2026-10-03', '09:00'),
        ends_at: t('2026-10-03', '10:00'),
        names: 'Aiman & Sofia',
      },
    })
    expect(
      await slotCheck(db, '2026-10-03 09:30+08', 120, 'zulaikha', SEED.groups.adamAlyaAmir),
    ).toEqual({
      ok: false,
      reason: 'overlap_other',
      detail: { starts_at: t('2026-10-03', '09:00'), ends_at: t('2026-10-03', '10:00') },
    })
  })

  it('checks the travel gap in lesson start order', async () => {
    // Thu 1 Oct 19:00–20:00 is too soon after Priya (ends 18:30) and too close to Aina (20:30).
    expect(await slotCheck(db, '2026-10-01 19:00+08', 60)).toEqual({
      ok: false,
      reason: 'gap_after',
      detail: { ends_at: t('2026-10-01', '18:30') },
    })
    expect(await slotCheck(db, '2026-10-01 19:30+08', 60)).toEqual({
      ok: false,
      reason: 'gap_before',
      detail: { starts_at: t('2026-10-01', '20:30') },
    })
  })

  it('checks the travel gap after a 2-hour lesson too', async () => {
    await db.query(
      `insert into public.bookings (group_id, starts_at, ends_at, location)
       values ($1, '2026-10-06 17:30+08', '2026-10-06 19:30+08', 'Sunrise Res.')`,
      [SEED.groups.hana],
    )
    expect(await slotCheck(db, '2026-10-06 20:00+08', 60)).toEqual({
      ok: false,
      reason: 'gap_after',
      detail: { ends_at: t('2026-10-06', '19:30') },
    })
    expect(await slotCheck(db, '2026-10-06 20:30+08', 60)).toMatchObject({ ok: true })
  })

  it('always needs the full gap next to an existing lesson, even one with gap_override', async () => {
    await db.query(`update public.bookings set gap_override = true where id = $1`, [
      'd0000000-0000-4000-8000-000000000018', // Daniel, Wed 30 Sep 20:30
    ])
    expect(await slotCheck(db, '2026-09-30 19:00+08', 60)).toMatchObject({ reason: 'gap_before' })
    // Without Wei Jie's lesson, Kai's override lesson (Fri 2 Oct 21:00) still needs a
    // full hour before it.
    await db.query(`update public.bookings set status = 'cancelled' where id = $1`, [
      SEED.bookings.weiJieFri2,
    ])
    expect(await slotCheck(db, '2026-10-02 19:30+08', 60)).toEqual({
      ok: false,
      reason: 'gap_before',
      detail: { starts_at: t('2026-10-02', '21:00') },
    })
    expect(await slotCheck(db, '2026-10-02 19:00+08', 60)).toMatchObject({ ok: true })
  })

  it('ends the booking window on the Sunday of the week booking_window_weeks after this one', async () => {
    // Session zones whose date differs from Malaysia's around MYT midnight.
    for (const zone of ['America/Los_Angeles', 'UTC', 'Pacific/Kiritimati', 'Pacific/Pago_Pago']) {
      await db.query(`select set_config('timezone', $1, true)`, [zone])
      // Clock Sat 26 Sep: this week ends Sun 27 Sep, so the window runs to Sun 25 Oct.
      await db.setNow('2026-09-26 12:00+08')
      expect(await slotCheck(db, '2026-10-25 21:00+08', 60), zone).toMatchObject({ ok: true })
      expect(await slotCheck(db, '2026-10-26 17:30+08', 60), zone).toMatchObject({
        reason: 'outside_window',
      })
      // Herman's example: on Mon 28 Sep customers can book up to Sun 1 Nov.
      await db.setNow('2026-09-28 00:00+08')
      expect(await slotCheck(db, '2026-11-01 21:00+08', 60), zone).toMatchObject({ ok: true })
      expect(await slotCheck(db, '2026-11-02 17:30+08', 60), zone).toMatchObject({
        reason: 'outside_window',
      })
      // One minute earlier it is still the week of Mon 21 Sep.
      await db.setNow('2026-09-27 23:59+08')
      expect(await slotCheck(db, '2026-10-25 21:00+08', 60), zone).toMatchObject({ ok: true })
      expect(await slotCheck(db, '2026-10-26 17:30+08', 60), zone).toMatchObject({
        reason: 'outside_window',
      })
    }
  })

  it('never lets a lesson cross midnight MYT, even inside an open exception', async () => {
    await addException(db, 'open', '2026-10-10 22:00+08', '2026-10-11 02:00+08')
    expect(await slotCheck(db, '2026-10-10 23:00+08', 60)).toMatchObject({ ok: true })
    expect(await slotCheck(db, '2026-10-10 23:30+08', 60)).toMatchObject({
      reason: 'outside_open_hours',
    })
    expect(await slotCheck(db, '2026-10-11 00:00+08', 60)).toMatchObject({ ok: true })
    // The travel gap still counts across midnight.
    await db.query(
      `insert into public.bookings (group_id, starts_at, ends_at, location)
       values ($1, '2026-10-10 22:30+08', '2026-10-10 23:30+08', 'Sunrise Res.')`,
      [SEED.groups.hana],
    )
    expect(await slotCheck(db, '2026-10-11 00:00+08', 60)).toEqual({
      ok: false,
      reason: 'gap_after',
      detail: { ends_at: t('2026-10-10', '23:30') },
    })
  })
})

describe.skipIf(!hasDatabase)('settings drive the engine (CLAUDE.md rule 9)', () => {
  const db = useTestDb()

  async function tuesdayFree(minutes = 60) {
    await db.as('meiling')
    const slots = await weekSlots(db, '2026-09-28', minutes, SEED.groups.aimanSofia)
    return timesByDay(slots, '2026-09-28', (s) => s.ok)['2026-09-29']
  }

  it('travel_gap_minutes', async () => {
    await setSetting(db, 'travel_gap_minutes', 30)
    expect(await tuesdayFree()).toEqual(['19:00', '19:30', '20:00', '20:30', '21:00'])
    await setSetting(db, 'travel_gap_minutes', 0)
    expect(await tuesdayFree()).toEqual(['18:30', '19:00', '19:30', '20:00', '20:30', '21:00'])
    await setSetting(db, 'travel_gap_minutes', 90)
    expect(await tuesdayFree()).toEqual(['20:00', '20:30', '21:00'])
  })

  it('start_step_minutes', async () => {
    await setSetting(db, 'start_step_minutes', 60)
    await db.as('meiling')
    let slots = await weekSlots(db, '2026-09-28', 60, SEED.groups.aimanSofia)
    expect(slots.filter((s) => s.day === '2026-09-29').map((s) => s.time)).toEqual([
      '17:30',
      '18:30',
      '19:30',
      '20:30',
    ])
    expect(await slotCheck(db, '2026-09-29 20:00+08', 60)).toMatchObject({ reason: 'off_step' })
    await setSetting(db, 'start_step_minutes', 15)
    await db.as('meiling')
    slots = await weekSlots(db, '2026-09-28', 60, SEED.groups.aimanSofia)
    expect(slots.filter((s) => s.day === '2026-09-29')).toHaveLength(15)
    expect(slotAt(slots, '2026-09-29 19:45')).toMatchObject({ ok: true })
  })

  it('lesson_lengths', async () => {
    await setSetting(db, 'lesson_lengths', [60])
    expect(await slotCheck(db, '2026-09-29 19:30+08', 120)).toMatchObject({
      reason: 'invalid_length',
    })
    await db.as('meiling')
    const error = await db.expectFailure('select * from public.week_slots($1, 120, $2)', [
      '2026-09-28',
      SEED.groups.aimanSofia,
    ])
    expect(error.message).toBe('invalid_length')
  })

  it('booking_window_weeks', async () => {
    await setSetting(db, 'booking_window_weeks', 1)
    await db.as('meiling')
    const sample = await weekSlots(db, '2026-09-28', 60, SEED.groups.aimanSofia)
    expect(slotAt(sample, '2026-10-04 21:00')).toMatchObject({ ok: true })
    const after = await weekSlots(db, '2026-10-05', 60, SEED.groups.aimanSofia)
    expect(after).toHaveLength(8 * 5 + 20 * 2)
    expect(after.every((s) => s.reason === 'outside_window')).toBe(true)
  })
})

describe.skipIf(!hasDatabase)('week_busy', () => {
  const db = useTestDb()

  it('shows the sample week: open hours, lessons, meiling’s as mine, travel around each', async () => {
    await db.as('meiling')
    const week = await weekBusy(db, '2026-09-28')
    const other = (day: string, from: string, to: string, before = 60, after = 60): Busy => ({
      starts_at: t(day, from),
      ends_at: t(day, to),
      mine: false,
      travel_before: before,
      travel_after: after,
    })
    const mine = (day: string, from: string, to: string, bookingId: string, groupId: string) => ({
      ...other(day, from, to),
      mine: true,
      booking_id: bookingId,
      group_id: groupId,
    })
    const weekday = (day: string) => [{ starts_at: t(day, '17:30'), ends_at: t(day, '22:00') }]
    const weekend = (day: string) => [
      { starts_at: t(day, '07:00'), ends_at: t(day, '12:00') },
      { starts_at: t(day, '16:00'), ends_at: t(day, '22:00') },
    ]
    const [mon, tue, wed, thu, fri, sat, sun] = SAMPLE_WEEK as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ]
    expect(week).toEqual([
      { day: mon, open: weekday(mon), closed: [], busy: [other(mon, '19:30', '20:30')] },
      { day: tue, open: weekday(tue), closed: [], busy: [other(tue, '17:30', '18:30')] },
      { day: wed, open: weekday(wed), closed: [], busy: [other(wed, '20:30', '21:30')] },
      {
        day: thu,
        open: weekday(thu),
        closed: [],
        busy: [other(thu, '17:30', '18:30'), other(thu, '20:30', '21:30')],
      },
      {
        day: fri,
        open: weekday(fri),
        closed: [],
        // Kai's lesson was squeezed in with a gap override: no travel between them.
        busy: [other(fri, '19:30', '20:30', 60, 0), other(fri, '21:00', '22:00', 0, 60)],
      },
      {
        day: sat,
        open: weekend(sat),
        closed: [],
        busy: [
          mine(sat, '09:00', '10:00', SEED.bookings.aimanSofiaSat3, SEED.groups.aimanSofia),
          other(sat, '11:00', '12:00'),
          other(sat, '17:00', '18:00'),
        ],
      },
      {
        day: sun,
        open: weekend(sun),
        closed: [],
        busy: [
          other(sun, '08:00', '09:00'),
          other(sun, '10:00', '12:00'),
          mine(sun, '17:00', '18:00', SEED.bookings.sofiaSun4, SEED.groups.sofia),
          other(sun, '19:00', '20:00'),
        ],
      },
    ])
  })

  it('contains no names, locations or other accounts’ ids', async () => {
    await addException(
      db,
      'closed',
      '2026-09-30 17:30+08',
      '2026-09-30 18:30+08',
      'Farah’s dentist',
    )
    await db.as('meiling')
    const week = await weekBusy(db, '2026-09-28')
    expect(week[2]?.closed).toEqual([
      { starts_at: t('2026-09-30', '17:30'), ends_at: t('2026-09-30', '18:30') },
    ])
    const json = JSON.stringify(week).toLowerCase()
    const names = ['Farah', 'Hana', 'Wei Jie', 'Priya', 'Zulaikha', 'Adam', 'Alya', 'Amir']
    const more = ['Jun Hao', 'Grace', 'Chloe', 'Ethan', 'Kai', 'Daniel', 'Aina', 'Nurul']
    const hers = ['Mei Ling', 'Aiman', 'Sofia', 'meiling']
    const locations = ['Palm Court', 'Sunrise', 'Seri Maya', 'Maple', 'Vista', 'Kiara']
    const contacts = ['@', 'example.com', '012-000']
    for (const text of [...names, ...more, ...hers, ...locations, ...contacts, 'dentist']) {
      expect(json).not.toContain(text.toLowerCase())
    }
    const ids = json.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []
    expect(new Set(ids)).toEqual(
      new Set([
        SEED.bookings.aimanSofiaSat3,
        SEED.bookings.sofiaSun4,
        SEED.groups.aimanSofia,
        SEED.groups.sofia,
      ]),
    )
  })

  it('leaves out cancelled lessons and shows closed exceptions cut to each day', async () => {
    await db.query(`update public.bookings set status = 'cancelled' where id = $1`, [
      SEED.bookings.priyaTue29,
    ])
    await addException(db, 'closed', '2026-09-29 12:00+08', '2026-09-30 18:00+08')
    await db.as('meiling')
    const [, tue, wed] = await weekBusy(db, '2026-09-28')
    expect(tue).toEqual({
      day: '2026-09-29',
      open: [],
      closed: [{ starts_at: t('2026-09-29', '12:00'), ends_at: t('2026-09-30', '00:00') }],
      busy: [],
    })
    expect(wed?.open).toEqual([
      { starts_at: t('2026-09-30', '18:00'), ends_at: t('2026-09-30', '22:00') },
    ])
    expect(wed?.closed).toEqual([
      { starts_at: t('2026-09-30', '00:00'), ends_at: t('2026-09-30', '18:00') },
    ])
  })

  it('shortens travel so it never covers a neighbouring lesson when the gap grows', async () => {
    await setSetting(db, 'travel_gap_minutes', 90)
    await db.as('meiling')
    const week = await weekBusy(db, '2026-09-28')
    const sat = week.find((d) => d.day === '2026-10-03')
    // Aiman & Sofia ends 10:00 and Adam, Alya & Amir starts 11:00: 60 minutes apart.
    expect(sat?.busy.map((b) => [b.travel_before, b.travel_after])).toEqual([
      [90, 60],
      [60, 90],
      [90, 90],
    ])
  })

  it('draws travel from booked neighbours only: cancelled and excused lessons free it', async () => {
    await db.query(`update public.bookings set status = 'cancelled' where id = $1`, [
      'd0000000-0000-4000-8000-000000000017', // Kai's override lesson, Fri 2 Oct 21:00
    ])
    await db.query(`update public.bookings set status = 'excused' where id = $1`, [
      'd0000000-0000-4000-8000-000000000012', // Adam, Alya & Amir, Sat 3 Oct 11:00
    ])
    await setSetting(db, 'travel_gap_minutes', 90)
    await db.as('meiling')
    const week = await weekBusy(db, '2026-09-28')
    expect(week[4]?.busy).toEqual([
      {
        starts_at: t('2026-10-02', '19:30'),
        ends_at: t('2026-10-02', '20:30'),
        mine: false,
        travel_before: 90,
        travel_after: 90,
      },
    ])
    expect(week[5]?.busy.map((b) => [b.starts_at, b.travel_before, b.travel_after])).toEqual([
      [t('2026-10-03', '09:00'), 90, 90],
      [t('2026-10-03', '17:00'), 90, 90],
    ])
  })

  it('files a lesson under the day it starts and finds neighbours on other days', async () => {
    // The coach can book across midnight and outside open hours (prompt 04), so insert
    // directly. Two tight pairs 30 minutes apart: Sat 10 Oct 23:00–24:00 and Sun 11 Oct
    // 00:30–01:30 (same week), Sun 11 Oct 23:00–24:00 and Mon 12 Oct 00:30–01:30 (across
    // the week boundary), plus a lesson from Sat 17 Oct 23:30 to Sun 00:30.
    await db.query(
      `insert into public.bookings (group_id, starts_at, ends_at, location)
       values ($1, '2026-10-10 23:00+08', '2026-10-11 00:00+08', 'Sunrise Res.'),
              ($1, '2026-10-11 00:30+08', '2026-10-11 01:30+08', 'Sunrise Res.'),
              ($1, '2026-10-11 23:00+08', '2026-10-12 00:00+08', 'Sunrise Res.'),
              ($1, '2026-10-12 00:30+08', '2026-10-12 01:30+08', 'Sunrise Res.'),
              ($1, '2026-10-17 23:30+08', '2026-10-18 00:30+08', 'Sunrise Res.')`,
      [SEED.groups.hana],
    )
    const block = (b: Busy) => [b.starts_at, b.ends_at, b.travel_before, b.travel_after]
    async function expectTravel(squeezed: number) {
      await db.as('meiling')
      const week = await weekBusy(db, '2026-10-05')
      expect(week[5]?.busy.map(block)).toEqual([
        [t('2026-10-10', '23:00'), t('2026-10-11', '00:00'), 60, squeezed],
      ])
      expect(week[6]?.busy.map(block)).toEqual([
        [t('2026-10-11', '00:30'), t('2026-10-11', '01:30'), squeezed, 60],
        [t('2026-10-11', '23:00'), t('2026-10-12', '00:00'), 60, squeezed],
      ])
      expect(week.flatMap((d) => d.busy).every((b) => !b.mine)).toBe(true)
      const next = await weekBusy(db, '2026-10-12')
      expect(next[0]?.busy.map(block)).toEqual([
        [t('2026-10-12', '00:30'), t('2026-10-12', '01:30'), squeezed, 60],
      ])
      expect(next[5]?.busy.map(block)).toEqual([
        [t('2026-10-17', '23:30'), t('2026-10-18', '00:30'), 60, 60],
      ])
      expect(next[6]?.busy).toEqual([])
    }
    // Neighbours only 30 minutes away: travel shortened to 30 on both sides.
    await expectTravel(30)
    // Squeezed in by the coach: no travel between the pairs.
    await db.asOwner()
    await db.query(
      `update public.bookings set gap_override = true
       where group_id = $1 and starts_at in ('2026-10-11 00:30+08', '2026-10-12 00:30+08')`,
      [SEED.groups.hana],
    )
    await expectTravel(0)
  })

  it('shows the coach every lesson as not his, with no ids', async () => {
    await db.as('herman')
    const week = await weekBusy(db, '2026-09-28')
    const blocks = week.flatMap((d) => d.busy)
    expect(blocks).toHaveLength(14)
    expect(blocks.every((b) => !b.mine && b.booking_id === undefined)).toBe(true)
  })
})

describe.skipIf(!hasDatabase)('coach_week', () => {
  const db = useTestDb()

  function lessonAt(week: CoachWeekDay[], startsAt: string) {
    const lesson = week.flatMap((d) => d.lessons).find((l) => l.starts_at === startsAt)
    if (!lesson) throw new Error(`No lesson at ${startsAt}`)
    return lesson
  }

  it('gives the coach names, type, location, override, travel and balance flags', async () => {
    const meiling = await db.idOf('meiling')
    await db.as('herman')
    const week = await coachWeek(db, '2026-09-28')
    expect(week.map((d) => d.day)).toEqual(SAMPLE_WEEK)
    expect(week.map((d) => d.lessons.length)).toEqual([1, 1, 1, 2, 2, 3, 4])

    expect(lessonAt(week, t('2026-10-03', '09:00'))).toEqual({
      booking_id: SEED.bookings.aimanSofiaSat3,
      group_id: SEED.groups.aimanSofia,
      account_id: meiling,
      account_name: 'Mei Ling',
      display_names: 'Aiman & Sofia',
      type_label: '1-to-2',
      size: 2,
      location: 'Palm Court',
      starts_at: t('2026-10-03', '09:00'),
      ends_at: t('2026-10-03', '10:00'),
      lessons: 1,
      status: 'booked',
      gap_override: false,
      travel_before: 60,
      travel_after: 60,
      used: false,
      package_no: 4,
      lesson_in_package: 2,
      package_size: 4,
      unpaid: false,
      last_lesson: false,
    })
    expect(lessonAt(week, t('2026-10-02', '19:30'))).toMatchObject({
      display_names: 'Wei Jie',
      travel_after: 0,
      unpaid: true,
    })
    expect(lessonAt(week, t('2026-10-02', '21:00'))).toMatchObject({
      display_names: 'Kai',
      account_name: 'Kai',
      gap_override: true,
      travel_before: 0,
      travel_after: 60,
      package_no: 1,
      lesson_in_package: 1,
    })
    expect(lessonAt(week, t('2026-10-03', '17:00'))).toMatchObject({
      display_names: 'Hana',
      location: 'Sunrise Res.',
      unpaid: true,
    })
    expect(lessonAt(week, t('2026-10-01', '17:30'))).toMatchObject({
      display_names: 'Priya',
      last_lesson: true,
    })
    expect(lessonAt(week, t('2026-09-29', '17:30'))).toMatchObject({ last_lesson: false })
    expect(lessonAt(week, t('2026-10-04', '17:00'))).toMatchObject({
      display_names: 'Sofia',
      account_name: 'Mei Ling',
      last_lesson: true,
    })
    expect(lessonAt(week, t('2026-10-04', '10:00'))).toMatchObject({
      display_names: 'Chloe',
      lessons: 2,
      type_label: '1-to-1',
    })
    expect(lessonAt(week, t('2026-10-03', '11:00'))).toMatchObject({
      display_names: 'Adam, Alya & Amir',
      type_label: '1-to-3',
      size: 3,
    })
  })

  it('marks past lessons used and includes cancelled and excused ones without travel', async () => {
    await db.query(`update public.bookings set status = 'cancelled' where id = $1`, [
      SEED.bookings.priyaTue29,
    ])
    await db.query(`update public.bookings set status = 'excused' where id = $1`, [
      SEED.bookings.ethanSat26,
    ])
    await db.as('herman')
    const lastWeek = await coachWeek(db, '2026-09-21')
    expect(lessonAt(lastWeek, t('2026-09-26', '09:00'))).toMatchObject({
      status: 'excused',
      used: null,
      travel_before: null,
      travel_after: null,
      package_no: null,
    })
    expect(lessonAt(lastWeek, t('2026-09-26', '17:00'))).toMatchObject({
      status: 'booked',
      used: false,
    })
    expect(lessonAt(lastWeek, t('2026-09-25', '19:30'))).toMatchObject({
      display_names: 'Wei Jie',
      used: true,
    })
    const week = await coachWeek(db, '2026-09-28')
    expect(lessonAt(week, t('2026-09-29', '17:30'))).toMatchObject({
      status: 'cancelled',
      travel_before: null,
      travel_after: null,
    })
  })

  it('lists the week’s exceptions with the coach’s notes', async () => {
    await addException(
      db,
      'closed',
      '2026-09-29 12:00+08',
      '2026-09-30 18:00+08',
      'Farah’s dentist',
    )
    await addException(db, 'open', '2026-10-03 13:00+08', '2026-10-03 16:00+08', 'Gala week')
    await db.as('herman')
    const week = await coachWeek(db, '2026-09-28')
    const exceptions = (day: string) =>
      week
        .find((d) => d.day === day)
        ?.exceptions.map(({ kind, note, starts_at, ends_at }) => ({
          kind,
          note,
          starts_at,
          ends_at,
        }))
    const dentist = {
      kind: 'closed',
      note: 'Farah’s dentist',
      starts_at: t('2026-09-29', '12:00'),
      ends_at: t('2026-09-30', '18:00'),
    }
    expect(exceptions('2026-09-29')).toEqual([dentist])
    expect(exceptions('2026-09-30')).toEqual([dentist])
    // closed is cut to each day, as in week_busy.
    expect(week.find((d) => d.day === '2026-09-29')?.closed).toEqual([
      { starts_at: t('2026-09-29', '12:00'), ends_at: t('2026-09-30', '00:00') },
    ])
    expect(week.find((d) => d.day === '2026-09-30')?.closed).toEqual([
      { starts_at: t('2026-09-30', '00:00'), ends_at: t('2026-09-30', '18:00') },
    ])
    expect(week.find((d) => d.day === '2026-10-03')?.closed).toEqual([])
    expect(exceptions('2026-10-01')).toEqual([])
    expect(exceptions('2026-10-03')).toEqual([
      {
        kind: 'open',
        note: 'Gala week',
        starts_at: t('2026-10-03', '13:00'),
        ends_at: t('2026-10-03', '16:00'),
      },
    ])
    expect(week.find((d) => d.day === '2026-10-03')?.open).toEqual([
      { starts_at: t('2026-10-03', '07:00'), ends_at: t('2026-10-03', '12:00') },
      { starts_at: t('2026-10-03', '13:00'), ends_at: t('2026-10-03', '22:00') },
    ])
  })

  it('refuses customers', async () => {
    await db.as('meiling')
    const error = await db.expectFailure(`select public.coach_week('2026-09-28')`)
    expect(error.message).toBe('not_coach')
  })
})

describe.skipIf(!hasDatabase)('who may call the availability functions', () => {
  const db = useTestDb()

  it('a customer can’t ask about someone else’s group, or a group that doesn’t exist', async () => {
    await db.as('meiling')
    for (const group of [SEED.groups.hana, 'c0000000-0000-4000-8000-0000000000ff']) {
      const error = await db.expectFailure('select * from public.week_slots($1, 60, $2)', [
        '2026-09-28',
        group,
      ])
      expect(error.message).toBe('not_your_group')
    }
  })

  it('the coach may ask about any group; overlaps show him times only', async () => {
    await db.as('herman')
    const slots = await weekSlots(db, '2026-09-28', 60, SEED.groups.hana)
    expect(timesByDay(slots, '2026-09-28', (s) => s.ok)).toEqual(FREE_1_HOUR)
    expect(result(slotAt(slots, '2026-10-03 09:00'))).toEqual({
      ok: false,
      reason: 'overlap_other',
      detail: { starts_at: t('2026-10-03', '09:00'), ends_at: t('2026-10-03', '10:00') },
    })
    const error = await db.expectFailure('select * from public.week_slots($1, 60, $2)', [
      '2026-09-28',
      'c0000000-0000-4000-8000-0000000000ff',
    ])
    expect(error.message).toBe('not_found')
  })

  it('a missing week start is refused, not read as "all time"', async () => {
    for (const [who, sql] of [
      ['meiling', `select * from public.week_slots(null, 60, '${SEED.groups.aimanSofia}')`],
      ['meiling', 'select public.week_busy(null)'],
      ['herman', 'select public.coach_week(null)'],
    ] as const) {
      await db.as(who)
      const error = await db.expectFailure(sql)
      expect(error.message, sql).toBe('invalid_week')
    }
  })

  it('an account waiting for approval gets not_approved', async () => {
    await db.query(`update public.profiles set approved = false where username = 'nurul'`)
    await db.as('nurul')
    const busy = await db.expectFailure(`select public.week_busy('2026-09-28')`)
    expect(busy.message).toBe('not_approved')
    const slots = await db.expectFailure('select * from public.week_slots($1, 60, $2)', [
      '2026-09-28',
      SEED.groups.nurul,
    ])
    expect(slots.message).toBe('not_approved')
  })

  it('grants: week_slots, week_busy, coach_week and coach_slot_check to authenticated; nothing else, nothing for anon', async () => {
    const functions: [string, boolean][] = [
      ['public.week_slots(date, int, uuid)', true],
      ['public.week_busy(date)', true],
      ['public.coach_week(date)', true],
      // Prompt 04: slot_check gained the coach's options; coach_slot_check checks is_coach().
      ['public.coach_slot_check(uuid, timestamptz, int, boolean, boolean)', true],
      ['public.open_windows(date)', false],
      ['public.slot_check(timestamptz, int, uuid, uuid, boolean, boolean, boolean)', false],
      ['public.lesson_travel(timestamptz, timestamptz)', false],
      ['public.myt_text(timestamptz)', false],
    ]
    for (const [fn, granted] of functions) {
      const { rows } = await db.query<{ anon: boolean; authenticated: boolean; everyone: boolean }>(
        `select has_function_privilege('anon', $1::text, 'execute') as anon,
                has_function_privilege('authenticated', $1::text, 'execute') as authenticated,
                exists (
                  select 1 from pg_catalog.pg_proc p, aclexplode(p.proacl) a
                  where p.oid = $1::regprocedure and a.grantee = 0
                ) as everyone`,
        [fn],
      )
      expect(rows[0], fn).toEqual({ anon: false, authenticated: granted, everyone: false })
    }
  })

  it('customers can’t call the internal functions, and visitors can’t call any', async () => {
    await db.as('meiling')
    for (const sql of [
      `select * from public.open_windows('2026-09-29')`,
      `select * from public.slot_check('2026-09-29 19:30+08', 60, '${SEED.groups.hana}', null)`,
      `select * from public.lesson_travel('2026-09-28 00:00+08', '2026-10-05 00:00+08')`,
    ]) {
      const error = await db.expectFailure(sql)
      expect(error.code, sql).toBe(PERMISSION_DENIED)
    }
    await db.asAnon()
    for (const sql of [
      `select public.week_busy('2026-09-28')`,
      `select * from public.week_slots('2026-09-28', 60, '${SEED.groups.aimanSofia}')`,
      `select public.coach_week('2026-09-28')`,
    ]) {
      const error = await db.expectFailure(sql)
      expect(error.code, sql).toBe(PERMISSION_DENIED)
    }
  })
})
