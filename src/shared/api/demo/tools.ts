import type { DemoAccount, DemoEmail } from '../backend'
import { demoDb } from './db'

// What demo mode's own tools show (never part of the real website): the accounts to sign
// in as, and the emails the site would have sent (the outbox the Gmail mailer empties
// in production, TECH_SPEC §8). Read as the database owner, since no account may.

export async function demoAccounts(): Promise<DemoAccount[]> {
  const db = await demoDb()
  const { rows } = await db.query<DemoAccount>(
    `select username, display_name as "displayName", role::text as role, approved
     from public.profiles
     order by role = 'coach' desc, approved desc, username`,
  )
  return rows
}

export async function demoMailbox(limit = 30): Promise<DemoEmail[]> {
  const db = await demoDb()
  const { rows } = await db.query<{ v: DemoEmail[] }>(
    `select coalesce(json_agg(x), '[]'::json) as v from (
       select id, to_email as "to", subject, body_text as text, body_html as html, kind,
              created_at as "createdAt"
       from public.email_outbox
       order by id desc
       limit $1
     ) as x`,
    [limit],
  )
  // mail-queue puts the site's address where the templates say {{site_url}} (TECH_SPEC §7).
  const site = typeof window === 'undefined' ? '' : window.location.origin
  return (rows[0]?.v ?? []).map((email) => ({
    ...email,
    subject: email.subject.replaceAll('{{site_url}}', site),
    text: email.text.replaceAll('{{site_url}}', site),
    html: email.html?.replaceAll('{{site_url}}', site) ?? null,
  }))
}
