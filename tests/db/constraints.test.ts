// Table constraints and triggers: no overlapping lessons (BR-14), group membership
// rules (BR-6), the profile trigger (TECH_SPEC §9), the settings row and app_now().
import { describe, expect, it } from 'vitest'

import { FIXTURE_NOW, SEED } from './fixture'
import { hasDatabase, myt, useTestDb } from './helpers'

// Priya's lesson on Tue 29 Sep is 17:30–18:30 MYT.
function insertBooking(startsAt: string, endsAt: string, status = 'booked') {
  return [
    `insert into public.bookings (group_id, starts_at, ends_at, location, status)
     values ($1, $2, $3, 'Palm Court', $4)`,
    [SEED.groups.aimanSofia, startsAt, endsAt, status],
  ] as const
}

describe.skipIf(!hasDatabase)('bookings_no_overlap', () => {
  const db = useTestDb()

  it('refuses a booked lesson that overlaps another booked lesson', async () => {
    const error = await db.expectFailure(
      ...insertBooking('2026-09-29 18:00+08', '2026-09-29 19:00+08'),
    )
    expect(error.constraint).toBe('bookings_no_overlap')
  })

  it('refuses two overlapping bookings inserted together', async () => {
    const error = await db.expectFailure(
      `insert into public.bookings (group_id, starts_at, ends_at, location)
       values ($1, '2026-09-30 17:30+08', '2026-09-30 18:30+08', 'Palm Court'),
              ($1, '2026-09-30 18:00+08', '2026-09-30 19:00+08', 'Palm Court')`,
      [SEED.groups.aimanSofia],
    )
    expect(error.constraint).toBe('bookings_no_overlap')
  })

  it('allows overlapping a cancelled or excused lesson', async () => {
    await db.query(...insertBooking('2026-09-29 18:00+08', '2026-09-29 19:00+08', 'cancelled'))
    await db.query(...insertBooking('2026-09-29 17:30+08', '2026-09-29 18:30+08', 'excused'))
    await db.query(`update public.bookings set status = 'cancelled' where id = $1`, [
      SEED.bookings.priyaTue29,
    ])
    await db.query(...insertBooking('2026-09-29 17:30+08', '2026-09-29 18:30+08'))
  })

  it('refuses to bring back a cancelled lesson whose time was taken', async () => {
    await db.query(`update public.bookings set status = 'cancelled' where id = $1`, [
      SEED.bookings.priyaTue29,
    ])
    await db.query(...insertBooking('2026-09-29 18:00+08', '2026-09-29 19:00+08'))
    const error = await db.expectFailure(
      `update public.bookings set status = 'booked' where id = $1`,
      [SEED.bookings.priyaTue29],
    )
    expect(error.constraint).toBe('bookings_no_overlap')
  })

  it('allows back-to-back lessons at the database level (the travel gap is checked by functions)', async () => {
    await db.query(...insertBooking('2026-09-29 18:30+08', '2026-09-29 19:30+08'))
  })
})

describe.skipIf(!hasDatabase)('booking rows', () => {
  const db = useTestDb()

  it.each([
    ['30 minutes', '2026-09-30 17:30+08', '2026-09-30 18:00+08'],
    ['90 minutes', '2026-09-30 17:30+08', '2026-09-30 19:00+08'],
    ['3 hours', '2026-09-30 17:30+08', '2026-09-30 20:30+08'],
  ])('refuses a %s lesson (lessons are 1 or 2 hours)', async (_, startsAt, endsAt) => {
    const error = await db.expectFailure(...insertBooking(startsAt, endsAt))
    expect(error.constraint).toBe('bookings_length')
  })

  it('refuses a lesson that ends before it starts', async () => {
    const error = await db.expectFailure(
      ...insertBooking('2026-09-30 18:30+08', '2026-09-30 17:30+08'),
    )
    expect(error.code).toBe('23514')
  })
})

describe.skipIf(!hasDatabase)('group members', () => {
  const db = useTestDb()

  async function newGroup(account: string, location = 'Palm Court') {
    const accountId = await db.idOf(account)
    const { rows } = await db.query<{ id: string }>(
      'insert into public.groups (account_id, location) values ($1, $2) returning id',
      [accountId, location],
    )
    return rows[0].id
  }

  async function newStudent(account: string, name: string) {
    const accountId = await db.idOf(account)
    const { rows } = await db.query<{ id: string }>(
      'insert into public.students (account_id, name) values ($1, $2) returning id',
      [accountId, name],
    )
    return rows[0].id
  }

  function addMember(groupId: string, studentId: string) {
    return [
      'insert into public.group_members (group_id, student_id) values ($1, $2)',
      [groupId, studentId],
    ] as const
  }

  it('refuses a student from another account', async () => {
    // Hana belongs to farah; the group belongs to meiling.
    const group = await newGroup('meiling')
    await db.query(...addMember(group, SEED.students.aiman))
    const error = await db.expectFailure(...addMember(group, SEED.students.hana))
    expect(error.message).toBe('student_other_account')
  })

  it('refuses a 4th member', async () => {
    const error = await db.expectFailure(
      ...addMember(SEED.groups.adamAlyaAmir, await newStudent('zulaikha', 'Aisyah')),
    )
    expect(error.message).toBe('group_full')
  })

  it('refuses 4 members inserted in one statement', async () => {
    const group = await newGroup('zulaikha')
    const extra = await newStudent('zulaikha', 'Aisyah')
    const error = await db.expectFailure(
      `insert into public.group_members (group_id, student_id)
       select $1, unnest($2::uuid[])`,
      [
        group,
        [
          SEED.students.adam,
          'b0000000-0000-4000-8000-000000000007',
          'b0000000-0000-4000-8000-000000000008',
          extra,
        ],
      ],
    )
    expect(error.message).toBe('group_full')
  })

  it('follows max_students_per_lesson', async () => {
    await db.query('update public.settings set max_students_per_lesson = 1 where id = 1')
    const group = await newGroup('meiling')
    await db.query(...addMember(group, SEED.students.aiman))
    const error = await db.expectFailure(...addMember(group, SEED.students.sofia))
    expect(error.message).toBe('group_full')
  })

  it('refuses a group left without members when the transaction ends', async () => {
    await newGroup('meiling')
    const error = await db.expectFailure('set constraints groups_not_empty immediate')
    expect(error.message).toBe('group_empty')
  })

  it('refuses removing the last member of a group', async () => {
    await db.query('delete from public.group_members where group_id = $1', [SEED.groups.sofia])
    const error = await db.expectFailure('set constraints group_members_not_empty immediate')
    expect(error.message).toBe('group_empty')
  })

  it('allows a group and its members added in the same transaction', async () => {
    const group = await newGroup('meiling')
    await db.query(...addMember(group, SEED.students.aiman))
    await db.query('set constraints all immediate')
  })

  it('refuses moving a group or a student to another account', async () => {
    const farah = await db.idOf('farah')
    const group = await db.expectFailure('update public.groups set account_id = $1 where id = $2', [
      farah,
      SEED.groups.sofia,
    ])
    expect(group.message).toBe('student_other_account')
    const student = await db.expectFailure(
      'update public.students set account_id = $1 where id = $2',
      [farah, SEED.students.sofia],
    )
    expect(student.message).toBe('student_other_account')
  })
})

describe.skipIf(!hasDatabase)('profile trigger on sign-up', () => {
  const db = useTestDb()

  async function signUp(meta: Record<string, unknown>) {
    const { rows } = await db.query<{ id: string }>(
      `insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
               'authenticated', 'new.user@example.com', $1)
       returning id`,
      [JSON.stringify(meta)],
    )
    const profile = await db.query(
      'select username, display_name, phone, role, approved from public.profiles where id = $1',
      [rows[0].id],
    )
    return profile.rows[0]
  }

  it('creates a profile from the sign-up metadata, lowercasing the username', async () => {
    expect(
      await signUp({ username: 'New.User_1', display_name: ' New User ', phone: '012-111 2222' }),
    ).toEqual({
      username: 'new.user_1',
      display_name: 'New User',
      phone: '012-111 2222',
      role: 'customer',
      approved: false,
    })
  })

  it('ignores a role or approval smuggled into the metadata', async () => {
    expect(
      await signUp({ username: 'sneaky', display_name: 'Sneaky', role: 'coach', approved: true }),
    ).toMatchObject({ role: 'customer', approved: false })
  })

  it('approves new accounts straight away when require_approval is off', async () => {
    await db.query('update public.settings set require_approval = false where id = 1')
    expect(await signUp({ username: 'quick', display_name: 'Quick' })).toMatchObject({
      approved: true,
    })
  })

  it('uses the username when no name is given', async () => {
    expect(await signUp({ username: 'noname' })).toMatchObject({
      display_name: 'noname',
      phone: null,
    })
  })

  it.each([{}, { username: 'ab' }, { username: 'has space' }, { username: 'x'.repeat(31) }])(
    'refuses the sign-up for a missing or invalid username: %o',
    async (meta) => {
      const error = await db.expectFailure(
        `insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
         values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
                 'authenticated', 'bad@example.com', $1)`,
        [JSON.stringify(meta)],
      )
      expect(error.message).toBe('invalid_username')
    },
  )

  it('refuses a username that is taken, whatever its case', async () => {
    const error = await db.expectFailure(
      `insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
               'authenticated', 'copy@example.com', $1)`,
      [JSON.stringify({ username: 'MeiLing', display_name: 'Copy' })],
    )
    expect(error.constraint).toBe('profiles_username_key')
  })
})

describe.skipIf(!hasDatabase)('settings row', () => {
  const db = useTestDb()

  it('has exactly one row with the defaults and the seeded coach email', async () => {
    const { rows } = await db.query('select * from public.settings')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: 1,
      business_name: 'Swim Class',
      coach_email: 'herman@example.com',
      travel_gap_minutes: 60,
      start_step_minutes: 30,
      lesson_lengths: [60, 120],
      max_students_per_lesson: 3,
      cancel_cutoff_hours: 6,
      booking_window_weeks: 4,
      lessons_per_package: 4,
      unpaid_packages_allowed: 1,
      price_1to1_cents: null,
      lesson_expiry_months: null,
      reminder_time: '20:00:00',
      digest_time: '20:00:00',
      booking_confirmations: true,
      late_change_alert: true,
      require_approval: true,
    })
  })

  it('refuses a second row', async () => {
    const error = await db.expectFailure('insert into public.settings (id) values (2)')
    expect(error.code).toBe('23514')
  })

  it.each([
    'travel_gap_minutes = 181',
    'start_step_minutes = 20',
    `lesson_lengths = '{90}'`,
    `lesson_lengths = '{}'`,
    'max_students_per_lesson = 4',
    `coach_email = 'not an email'`,
  ])('refuses %s', async (change) => {
    const error = await db.expectFailure(`update public.settings set ${change}`)
    expect(error.code).toBe('23514')
  })

  it('records when it was last changed', async () => {
    await db.query(`update public.settings set updated_at = '2026-01-01 00:00+08'`)
    const { rows } = await db.query<{ recent: boolean }>(
      `select updated_at > now() - interval '1 minute' as recent from public.settings`,
    )
    expect(rows[0]?.recent).toBe(true)
  })
})

describe.skipIf(!hasDatabase)('app_now()', () => {
  const db = useTestDb()

  it('returns the pinned clock on a direct connection', async () => {
    const { rows } = await db.query<{ now: Date }>('select public.app_now() as now')
    expect(rows[0]?.now).toEqual(myt('2026-09-26 12:00'))
    expect(FIXTURE_NOW).toBe('2026-09-26 12:00+08')
  })

  it('returns the real time when nothing is pinned', async () => {
    await db.setNow(null)
    const { rows } = await db.query<{ same: boolean }>('select public.app_now() = now() as same')
    expect(rows[0]?.same).toBe(true)
  })

  it('works for signed-in users (the views need it)', async () => {
    await db.as('meiling')
    const { rows } = await db.query<{ now: Date }>('select public.app_now() as now')
    expect(rows[0]?.now).toEqual(myt('2026-09-26 12:00'))
  })
})
