// The account's language (HANDOFF v0.26 stage 4; migration …20261008100000_profile_language):
// profiles.language, set at sign-up and by the account holder, and the four student emails in
// Chinese. The English emails are checked as before by booking, admin and emails tests.
import { describe, expect, it } from 'vitest'

import { SEED } from './fixture'
import { hasDatabase, type TestDb, useTestDb } from './helpers'

const CHECK_VIOLATION = '23514'

type Email = { subject: string; body_text: string; body_html: string }

async function setLanguage(db: TestDb, username: string, language: 'en' | 'zh' | null) {
  await db.asOwner()
  await db.query('update public.profiles set language = $1 where username = $2', [
    language,
    username,
  ])
}

async function email(db: TestDb, sql: string, params: readonly unknown[]) {
  await db.asOwner()
  const { rows } = await db.query<Email>(sql, params)
  expect(rows).toHaveLength(1)
  return rows[0]
}

describe.skipIf(!hasDatabase)('profiles.language', () => {
  const db = useTestDb()

  async function signUp(meta: Record<string, unknown>) {
    const { rows } = await db.query<{ id: string }>(
      `insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
               'authenticated', $1, $2)
       returning id`,
      [`${String(meta.username)}@example.com`, JSON.stringify(meta)],
    )
    const profile = await db.query<{ language: string | null }>(
      'select language from public.profiles where id = $1',
      [rows[0]?.id],
    )
    return profile.rows[0]?.language
  }

  it('takes the language Sign up sends, and nothing else', async () => {
    expect(await signUp({ username: 'zh.user', language: 'zh' })).toBe('zh')
    expect(await signUp({ username: 'en.user', language: 'en' })).toBe('en')
    expect(await signUp({ username: 'fr.user', language: 'fr' })).toBeNull()
    expect(await signUp({ username: 'no.choice' })).toBeNull()
  })

  it('lets the account holder set her own language, English or Chinese only', async () => {
    await db.as('meiling')
    const own = await db.query(
      `update public.profiles set language = 'zh' where username = 'meiling'`,
    )
    expect(own.rowCount).toBe(1)
    const error = await db.expectFailure(
      `update public.profiles set language = 'fr' where username = 'meiling'`,
    )
    expect(error.code).toBe(CHECK_VIOLATION)
    const farah = await db.query(
      `update public.profiles set language = 'zh' where username = 'farah'`,
    )
    expect(farah.rowCount).toBe(0)
  })
})

describe.skipIf(!hasDatabase)('the student emails in Chinese', () => {
  const db = useTestDb()

  it('confirms a booking in Chinese, with the cancel deadline', async () => {
    await setLanguage(db, 'meiling', 'zh')
    await db.as('meiling')
    const { rows } = await db.query<{ ids: string[] }>(
      `select public.book_lesson($1, '2026-09-29 19:30+08', 60) as ids`,
      [SEED.groups.aimanSofia],
    )
    await db.asOwner()
    const series = await db.query<{ series_id: string }>(
      'select series_id from public.bookings where id = $1',
      [rows[0]?.ids[0]],
    )
    const booked = await email(db, 'select * from public.email_booked($1)', [
      series.rows[0]?.series_id,
    ])
    expect(booked.subject).toBe('已预约：Aiman & Sofia，9月29日 周二 晚上7:30–8:30')
    expect(booked.body_text).toContain('Mei Ling，你好：')
    expect(booked.body_text).toContain('9月29日 周二 晚上7:30–8:30，地点：Palm Court')
    expect(booked.body_text).toContain('9月29日 周二 下午1:30前可以免费取消或改期。')
    expect(booked.body_html).toContain('<a href="{{site_url}}/my-classes">')
  })

  it('says the coach cancelled, with his reason as typed', async () => {
    await setLanguage(db, 'meiling', 'zh')
    await db.as('herman')
    await db.query(`select public.cancel_booking($1, 'Pool closed for maintenance')`, [
      SEED.bookings.sofiaSun4,
    ])
    const cancelled = await email(db, 'select * from public.email_cancelled($1)', [
      SEED.bookings.sofiaSun4,
    ])
    expect(cancelled.subject).toBe('已取消：Sofia，10月4日 周日 下午5:00–晚上6:00')
    expect(cancelled.body_text).toContain('教练取消了这节课：')
    expect(cancelled.body_text).toContain('原因：Pool closed for maintenance')
    expect(cancelled.body_text).toContain('这节课已回到你的配套。预约别的时间：{{site_url}}/book')
  })

  it('sends the coach’s message in Chinese around his words', async () => {
    await setLanguage(db, 'meiling', 'zh')
    await db.as('herman')
    const { rows } = await db.query<{ id: string }>(
      `select public.post_announcement('Pool closed Friday.') as id`,
    )
    const broadcast = await email(db, 'select * from public.email_broadcast($1, $2)', [
      rows[0]?.id,
      await db.idOf('meiling'),
    ])
    expect(broadcast.subject).toBe('教练的消息')
    expect(broadcast.body_text).toContain('Mei Ling，你好：\n\nPool closed Friday.')
  })

  it('reminds in Chinese, and keeps English for an account that never chose', async () => {
    await setLanguage(db, 'meiling', 'zh')
    const reminder = await email(db, 'select * from public.email_reminder($1, $2)', [
      await db.idOf('meiling'),
      '2026-10-03',
    ])
    expect(reminder.subject).toBe('明天的游泳课，10月3日 周六')
    expect(reminder.body_text).toContain('上午9:00–10:00，Aiman & Sofia，地点：Palm Court')
    expect(reminder.body_text).toContain('10月3日 周六 上午3:00前可以免费取消或改期。')

    await setLanguage(db, 'meiling', null)
    const english = await email(db, 'select * from public.email_reminder($1, $2)', [
      await db.idOf('meiling'),
      '2026-10-03',
    ])
    expect(english.subject).toBe('Swim lesson tomorrow, Sat 3 Oct')
  })
})
