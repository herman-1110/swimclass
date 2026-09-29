// group_balance, booking_ledger and group_details against the seed (TECH_SPEC §4, §10).
import { describe, expect, it } from 'vitest'

import { SEED } from './fixture'
import { hasDatabase, myt, useTestDb } from './helpers'

type Expected = {
  group: string
  packageNo: number
  usedInPackage: number
  booked: number
  left: number
  unpaid: boolean
  unpaidSince: Date | null
  lastLessonAt: Date | null
  paid: number
  used: number
  canStillBook: number
  lastPaidOn: string | null
  lastMethod: string | null
}

// The first ten rows are the expected table in TECH_SPEC §10 (clock Sat 26 Sep 12:00
// MYT); paid, used, can-still-book and last-paid columns follow from the seed and the
// §4 formulas.
const TECH_SPEC_TABLE: Expected[] = [
  {
    group: 'Aiman & Sofia',
    packageNo: 4,
    usedInPackage: 0,
    booked: 2,
    left: 2,
    unpaid: false,
    unpaidSince: null,
    lastLessonAt: null,
    paid: 16,
    used: 12,
    canStillBook: 6,
    lastPaidOn: '2026-09-19',
    lastMethod: 'fpx',
  },
  {
    group: 'Sofia',
    packageNo: 2,
    usedInPackage: 3,
    booked: 1,
    left: 0,
    unpaid: false,
    unpaidSince: null,
    lastLessonAt: myt('2026-10-04 17:00'),
    paid: 8,
    used: 7,
    canStillBook: 4,
    lastPaidOn: '2026-08-29',
    lastMethod: 'transfer',
  },
  {
    group: 'Hana',
    packageNo: 6,
    usedInPackage: 0,
    booked: 2,
    left: 2,
    unpaid: true,
    unpaidSince: myt('2026-09-26 19:30'),
    lastLessonAt: null,
    paid: 20,
    used: 20,
    canStillBook: 2,
    lastPaidOn: '2026-08-22',
    lastMethod: 'cash',
  },
  {
    group: 'Wei Jie',
    packageNo: 2,
    usedInPackage: 2,
    booked: 1,
    left: 1,
    unpaid: true,
    unpaidSince: myt('2026-09-18 19:30'),
    lastLessonAt: null,
    paid: 4,
    used: 6,
    canStillBook: 1,
    lastPaidOn: '2026-08-16',
    lastMethod: 'fpx',
  },
  {
    group: 'Priya',
    packageNo: 4,
    usedInPackage: 2,
    booked: 2,
    left: 0,
    unpaid: false,
    unpaidSince: null,
    lastLessonAt: myt('2026-10-01 17:30'),
    paid: 16,
    used: 14,
    canStillBook: 4,
    lastPaidOn: '2026-09-05',
    lastMethod: 'cash',
  },
  {
    group: 'Adam, Alya & Amir',
    packageNo: 1,
    usedInPackage: 1,
    booked: 1,
    left: 2,
    unpaid: false,
    unpaidSince: null,
    lastLessonAt: null,
    paid: 4,
    used: 1,
    canStillBook: 6,
    lastPaidOn: '2026-09-18',
    lastMethod: 'cash',
  },
  {
    group: 'Jun Hao',
    packageNo: 2,
    usedInPackage: 1,
    booked: 1,
    left: 2,
    unpaid: false,
    unpaidSince: null,
    lastLessonAt: null,
    paid: 8,
    used: 5,
    canStillBook: 6,
    lastPaidOn: '2026-09-01',
    lastMethod: 'transfer',
  },
  {
    group: 'Chloe',
    packageNo: 3,
    usedInPackage: 0,
    booked: 2,
    left: 2,
    unpaid: false,
    unpaidSince: null,
    lastLessonAt: null,
    paid: 12,
    used: 8,
    canStillBook: 6,
    lastPaidOn: '2026-09-20',
    lastMethod: 'fpx',
  },
  {
    group: 'Ethan',
    packageNo: 7,
    usedInPackage: 1,
    booked: 1,
    left: 2,
    unpaid: false,
    unpaidSince: null,
    lastLessonAt: null,
    paid: 28,
    used: 25,
    canStillBook: 6,
    lastPaidOn: '2026-09-12',
    lastMethod: 'cash',
  },
  {
    group: 'Kai',
    packageNo: 1,
    usedInPackage: 0,
    booked: 1,
    left: 3,
    unpaid: false,
    unpaidSince: null,
    lastLessonAt: null,
    paid: 4,
    used: 0,
    canStillBook: 7,
    lastPaidOn: '2026-09-24',
    lastMethod: 'fpx',
  },
]

// Not in the TECH_SPEC table: worked out from the seed with the §4 formulas.
const OTHER_GROUPS: Expected[] = [
  {
    group: 'Daniel',
    packageNo: 1,
    usedInPackage: 0,
    booked: 1,
    left: 3,
    unpaid: false,
    unpaidSince: null,
    lastLessonAt: null,
    paid: 4,
    used: 0,
    canStillBook: 7,
    lastPaidOn: '2026-09-21',
    lastMethod: 'cash',
  },
  {
    group: 'Aina',
    packageNo: 1,
    usedInPackage: 0,
    booked: 1,
    left: 3,
    unpaid: false,
    unpaidSince: null,
    lastLessonAt: null,
    paid: 4,
    used: 0,
    canStillBook: 7,
    lastPaidOn: '2026-09-21',
    lastMethod: 'transfer',
  },
  // Opening balance 2 used / 4 paid and no payments yet.
  {
    group: 'Nurul',
    packageNo: 1,
    usedInPackage: 2,
    booked: 1,
    left: 1,
    unpaid: false,
    unpaidSince: null,
    lastLessonAt: null,
    paid: 4,
    used: 2,
    canStillBook: 5,
    lastPaidOn: null,
    lastMethod: null,
  },
]

type BalanceRow = {
  display_names: string
  package_size: number
  paid_lessons: number
  used_lessons: number
  booked_lessons: number
  package_no: number
  used_in_package: number
  booked_in_package: number
  left_in_package: number
  unpaid: boolean
  unpaid_since: Date | null
  can_still_book: number
  last_lesson_at: Date | null
  last_paid_on: string | null
  last_payment_method: string | null
}

const BALANCES_SQL = `
  select d.display_names, b.*
  from public.group_balance b
  join public.group_details d using (group_id)
  order by d.display_names`

function actual(row: BalanceRow) {
  return {
    group: row.display_names,
    packageNo: row.package_no,
    usedInPackage: row.used_in_package,
    booked: row.booked_in_package,
    left: row.left_in_package,
    unpaid: row.unpaid,
    unpaidSince: row.unpaid_since,
    lastLessonAt: row.last_lesson_at,
    paid: row.paid_lessons,
    used: row.used_lessons,
    canStillBook: row.can_still_book,
    lastPaidOn: row.last_paid_on,
    lastMethod: row.last_payment_method,
  }
}

function byGroup(a: { group: string }, b: { group: string }) {
  return a.group.localeCompare(b.group)
}

describe.skipIf(!hasDatabase)('group_balance at Sat 26 Sep 2026 12:00 MYT', () => {
  const db = useTestDb()

  it('matches the TECH_SPEC §10 table for all ten groups (as the coach)', async () => {
    await db.as('herman')
    const { rows } = await db.query<BalanceRow>(BALANCES_SQL)
    const got = rows.map(actual)
    for (const want of TECH_SPEC_TABLE) {
      expect(
        got.find((g) => g.group === want.group),
        want.group,
      ).toEqual(want)
    }
  })

  it('matches the formulas for the three groups the table leaves out', async () => {
    await db.as('herman')
    const { rows } = await db.query<BalanceRow>(BALANCES_SQL)
    const got = rows.map(actual)
    for (const want of OTHER_GROUPS) {
      expect(
        got.find((g) => g.group === want.group),
        want.group,
      ).toEqual(want)
    }
    expect(got.map((g) => g.group).sort()).toEqual(
      [...TECH_SPEC_TABLE, ...OTHER_GROUPS].map((g) => g.group).sort(),
    )
  })

  it('counts the booked lessons of a package the same way as all booked lessons here', async () => {
    // In the seed every group's booked lessons fit in its current package.
    await db.as('herman')
    const { rows } = await db.query<BalanceRow>(BALANCES_SQL)
    for (const row of rows) {
      expect(row.booked_in_package, row.display_names).toBe(row.booked_lessons)
      expect(row.package_size).toBe(4)
    }
  })

  it('gives a customer the same numbers for her own groups', async () => {
    // Customers can't read `settings`; the views must still know the package size.
    await db.as('meiling')
    const { rows } = await db.query<BalanceRow>(BALANCES_SQL)
    expect(rows.map(actual).sort(byGroup)).toEqual(
      TECH_SPEC_TABLE.filter((g) => g.group === 'Aiman & Sofia' || g.group === 'Sofia').sort(
        byGroup,
      ),
    )
  })

  it('counts a lesson as used once its end time has passed (BR-19)', async () => {
    // Aiman & Sofia's lesson on Sat 26 Sep ends at 18:00.
    const balance = async () => {
      const { rows } = await db.query<BalanceRow>(
        'select * from public.group_balance where group_id = $1',
        [SEED.groups.aimanSofia],
      )
      return rows[0]
    }
    await db.setNow('2026-09-26 17:59:59+08')
    expect(await balance()).toMatchObject({ used_lessons: 12, booked_lessons: 2 })
    await db.setNow('2026-09-26 18:00+08')
    expect(await balance()).toMatchObject({
      used_lessons: 13,
      booked_lessons: 1,
      package_no: 4,
      used_in_package: 1,
      booked_in_package: 1,
      left_in_package: 2,
    })
  })

  it("doesn't count cancelled or excused lessons (BR-19)", async () => {
    await db.query(`update public.bookings set status = 'cancelled' where id = $1`, [
      SEED.bookings.aimanSofiaSat3,
    ])
    await db.query(`update public.bookings set status = 'excused' where id = $1`, [
      SEED.bookings.weiJieFri25,
    ])
    const { rows } = await db.query<BalanceRow>(
      `select d.display_names, b.* from public.group_balance b join public.group_details d using (group_id)
       where group_id in ($1, $2) order by d.display_names`,
      [SEED.groups.aimanSofia, SEED.groups.weiJie],
    )
    expect(rows.map(actual)).toEqual([
      expect.objectContaining({ group: 'Aiman & Sofia', used: 12, booked: 1, left: 3 }),
      // Still unpaid: lesson 5 (Fri 18 Sep) is past the 4 paid lessons.
      expect.objectContaining({
        group: 'Wei Jie',
        used: 5,
        packageNo: 2,
        usedInPackage: 1,
        booked: 1,
        left: 2,
        unpaid: true,
        unpaidSince: myt('2026-09-18 19:30'),
        canStillBook: 2,
      }),
    ])
  })

  it('turns Hana from Unpaid to Paid when a payment is recorded', async () => {
    await db.query(
      `insert into public.payments (group_id, lessons, amount_cents, method, paid_on)
       values ($1, 4, 24000, 'cash', '2026-09-26')`,
      [SEED.groups.hana],
    )
    const { rows } = await db.query<BalanceRow>(
      'select * from public.group_balance where group_id = $1',
      [SEED.groups.hana],
    )
    expect(rows[0]).toMatchObject({
      paid_lessons: 24,
      unpaid: false,
      unpaid_since: null,
      last_paid_on: '2026-09-26',
      last_payment_method: 'cash',
      can_still_book: 6,
    })
  })

  it('leaves unpaid_since empty when the first unpaid lesson is in the opening balance', async () => {
    // 3 lessons used before the system and none paid: unpaid since before go-live.
    await db.query(
      'update public.groups set opening_used_lessons = 3, opening_paid_lessons = 0 where id = $1',
      [SEED.groups.nurul],
    )
    const { rows } = await db.query<BalanceRow>(
      'select * from public.group_balance where group_id = $1',
      [SEED.groups.nurul],
    )
    expect(rows[0]).toMatchObject({ unpaid: true, unpaid_since: null, used_lessons: 3 })
  })

  it('follows the package size setting', async () => {
    await db.query('update public.settings set lessons_per_package = 5 where id = 1')
    const { rows } = await db.query<BalanceRow>(
      'select * from public.group_balance where group_id = $1',
      [SEED.groups.priya],
    )
    // 14 used: Package 3 has lessons 11–15, so 4 used in it and 1 of the 2 booked fits.
    expect(rows[0]).toMatchObject({
      package_size: 5,
      package_no: 3,
      used_in_package: 4,
      booked_in_package: 1,
      left_in_package: 0,
      can_still_book: 5,
    })
  })
})

type LedgerRow = {
  booking_id: string
  lessons: number
  first_index: number
  last_index: number
  package_no: number
  lesson_in_package: number
  used: boolean
}

describe.skipIf(!hasDatabase)('booking_ledger', () => {
  const db = useTestDb()

  async function ledger(bookingId: string) {
    const { rows } = await db.query<LedgerRow>(
      'select * from public.booking_ledger where booking_id = $1',
      [bookingId],
    )
    return rows[0]
  }

  it('numbers lessons after the opening balance', async () => {
    await db.as('herman')
    // Aiman & Sofia: 12 used before the system, so Sat 26 Sep is lesson 13 (Package 4, lesson 1).
    expect(await ledger(SEED.bookings.aimanSofiaSat26)).toMatchObject({
      lessons: 1,
      first_index: 13,
      last_index: 13,
      package_no: 4,
      lesson_in_package: 1,
      used: false,
    })
    expect(await ledger(SEED.bookings.aimanSofiaSat3)).toMatchObject({
      first_index: 14,
      package_no: 4,
      lesson_in_package: 2,
    })
    // Sofia (1-to-1): 7 used, so Sun 4 Oct is lesson 8, the last of Package 2.
    expect(await ledger(SEED.bookings.sofiaSun4)).toMatchObject({
      first_index: 8,
      last_index: 8,
      package_no: 2,
      lesson_in_package: 4,
    })
  })

  it('gives a 2-hour lesson two numbers', async () => {
    await db.as('herman')
    expect(await ledger(SEED.bookings.chloeSun4)).toMatchObject({
      lessons: 2,
      first_index: 9,
      last_index: 10,
      package_no: 3,
      lesson_in_package: 1,
    })
  })

  it('marks lessons whose end time has passed as used', async () => {
    await db.as('herman')
    expect(await ledger(SEED.bookings.weiJieFri18)).toMatchObject({
      first_index: 5,
      package_no: 2,
      lesson_in_package: 1,
      used: true,
    })
    expect(await ledger(SEED.bookings.weiJieFri2)).toMatchObject({ first_index: 7, used: false })
    expect(await ledger(SEED.bookings.ethanSat26)).toMatchObject({
      first_index: 25,
      package_no: 7,
      used: true,
    })
  })

  it('skips cancelled and excused bookings', async () => {
    await db.query(`update public.bookings set status = 'excused' where id = $1`, [
      SEED.bookings.weiJieFri18,
    ])
    await db.as('herman')
    expect(await ledger(SEED.bookings.weiJieFri18)).toBeUndefined()
    expect(await ledger(SEED.bookings.weiJieFri25)).toMatchObject({ first_index: 5 })
  })

  it('has one row per booked seed booking', async () => {
    await db.as('herman')
    const { rows } = await db.query<{ n: number }>(
      'select count(*) as n from public.booking_ledger',
    )
    expect(rows[0]?.n).toBe(20)
  })
})

describe.skipIf(!hasDatabase)('group_details', () => {
  const db = useTestDb()

  it('joins names with ", " and " & " and labels the type by size', async () => {
    await db.as('herman')
    const { rows } = await db.query<{ display_names: string; type_label: string; size: number }>(
      'select display_names, type_label, size from public.group_details order by display_names',
    )
    expect(rows).toEqual([
      { display_names: 'Adam, Alya & Amir', type_label: '1-to-3', size: 3 },
      { display_names: 'Aiman & Sofia', type_label: '1-to-2', size: 2 },
      { display_names: 'Aina', type_label: '1-to-1', size: 1 },
      { display_names: 'Chloe', type_label: '1-to-1', size: 1 },
      { display_names: 'Daniel', type_label: '1-to-1', size: 1 },
      { display_names: 'Ethan', type_label: '1-to-1', size: 1 },
      { display_names: 'Hana', type_label: '1-to-1', size: 1 },
      { display_names: 'Jun Hao', type_label: '1-to-1', size: 1 },
      { display_names: 'Kai', type_label: '1-to-1', size: 1 },
      { display_names: 'Nurul', type_label: '1-to-1', size: 1 },
      { display_names: 'Priya', type_label: '1-to-1', size: 1 },
      { display_names: 'Sofia', type_label: '1-to-1', size: 1 },
      { display_names: 'Wei Jie', type_label: '1-to-1', size: 1 },
    ])
  })

  it('lists the member ids in name order', async () => {
    await db.as('meiling')
    const { rows } = await db.query<{ student_ids: string[] }>(
      'select student_ids from public.group_details where group_id = $1',
      [SEED.groups.aimanSofia],
    )
    expect(rows[0]?.student_ids).toEqual([SEED.students.aiman, SEED.students.sofia])
  })
})
