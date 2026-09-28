// supabase/snippets/shift-seed.sql, run inside the test transaction (rolled back, so
// the seed keeps its dates).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mytDateKey, mytWeekStart } from '../../src/lib/time'
import { hasDatabase, SEED, useTestDb } from './helpers'

const SNIPPET = readFileSync(
  new URL('../../supabase/snippets/shift-seed.sql', import.meta.url),
  'utf8',
)
const DAY = 24 * 60 * 60 * 1000
const SAMPLE_MONDAY = '2026-09-28'

type Row = { id: string; starts_at: Date; ends_at: Date }

describe.skipIf(!hasDatabase)('shift-seed.sql', () => {
  const db = useTestDb()

  // Where the snippet should move the sample week: next week in MYT, as of the
  // transaction's start time, which is the now() the snippet itself reads.
  async function expectedShift() {
    const { rows } = await db.query<{ now: Date }>('select now() as now')
    const now = rows[0]?.now ?? new Date()
    const nextMonday = mytDateKey(
      new Date(`${mytWeekStart(now)}T00:00:00+08:00`).getTime() + 7 * DAY,
    )
    const days = Math.round(
      (Date.parse(`${nextMonday}T00:00:00+08:00`) - Date.parse(`${SAMPLE_MONDAY}T00:00:00+08:00`)) /
        DAY,
    )
    return { nextMonday, days }
  }

  async function bookings() {
    const { rows } = await db.query<Row>(
      'select id, starts_at, ends_at from public.bookings order by id',
    )
    return rows
  }

  it('moves every booking, payment and exception by whole weeks so the sample week is next week', async () => {
    await db.query(
      `insert into public.availability_exceptions (starts_at, ends_at, kind)
       values ('2026-10-07 15:00+08', '2026-10-07 17:30+08', 'open')`,
    )
    const { nextMonday, days } = await expectedShift()
    const before = await bookings()
    const paidBefore = await db.query<{ id: string; paid_on: string }>(
      'select id, paid_on from public.payments order by id',
    )

    await db.query(SNIPPET)

    const after = await bookings()
    const shift = Math.max(days, 0) * DAY
    expect(days % 7).toBe(0)
    expect(after.map((b) => [b.id, b.starts_at.getTime(), b.ends_at.getTime()])).toEqual(
      before.map((b) => [b.id, b.starts_at.getTime() + shift, b.ends_at.getTime() + shift]),
    )
    const junHao = after.find((b) => b.id === SEED.bookings.junHaoMon28)
    expect(mytDateKey(junHao!.starts_at)).toBe(days > 0 ? nextMonday : SAMPLE_MONDAY)

    const paidAfter = await db.query<{ id: string; paid_on: string }>(
      'select id, paid_on from public.payments order by id',
    )
    expect(paidAfter.rows.map((p) => p.paid_on)).toEqual(
      paidBefore.rows.map((p) =>
        mytDateKey(Date.parse(`${p.paid_on}T00:00:00+08:00`) + Math.max(days, 0) * DAY),
      ),
    )

    const { rows: exceptions } = await db.query<{ starts_at: Date }>(
      'select starts_at from public.availability_exceptions',
    )
    expect(exceptions[0]?.starts_at.getTime()).toBe(Date.parse('2026-10-07T15:00:00+08:00') + shift)
  })

  it('changes nothing when run again in the same week', async () => {
    await db.query(SNIPPET)
    const once = await bookings()
    await db.query(SNIPPET)
    expect(await bookings()).toEqual(once)
  })

  it('keeps every balance the same relative to the shifted clock', async () => {
    type Balance = {
      unpaid_since: Date | null
      last_lesson_at: Date | null
      last_paid_on: string | null
    }
    const balances = async () =>
      (await db.query<Balance>('select * from public.group_balance order by group_id')).rows.map(
        (row) => ({
          ...row,
          unpaid_since: row.unpaid_since?.getTime() ?? null,
          last_lesson_at: row.last_lesson_at?.getTime() ?? null,
        }),
      )
    const { days } = await expectedShift()
    const before = await balances()
    await db.query(SNIPPET)
    const shift = Math.max(days, 0) * DAY
    await db.setNow(new Date(Date.parse('2026-09-26T12:00:00+08:00') + shift).toISOString())
    const after = await balances()
    expect(after).toEqual(
      before.map((row) => ({
        ...row,
        unpaid_since: row.unpaid_since === null ? null : row.unpaid_since + shift,
        last_lesson_at: row.last_lesson_at === null ? null : row.last_lesson_at + shift,
        last_paid_on:
          row.last_paid_on === null
            ? null
            : mytDateKey(Date.parse(`${row.last_paid_on}T00:00:00+08:00`) + shift),
      })),
    )
  })
})
