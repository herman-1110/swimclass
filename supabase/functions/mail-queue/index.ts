// mail-queue (TECH_SPEC §7, §8): the door between the outbox and the Apps Script poller that
// sends it from the coach's Gmail every 5 minutes. Not for browsers: no CORS, and every
// request needs the header x-mail-token equal to the MAIL_TOKEN secret (compared in constant
// time; anything else is 401 unauthorized). verify_jwt is off (supabase/config.toml).
//
// POST { action: "claim", limit } → { emails: [{ id, to_email, subject, body_text, body_html,
//   kind }] }: first queue_daily_emails with tomorrow's date in Malaysia (the database decides
//   whether the reminders and the digest are due), then claim_outbox(limit) (at most 50; the
//   day's emails first), with every {{site_url}} filled in with SITE_URL's origin.
// POST { action: "ack", results: [{ id, ok, error }] } (at most 50) → { acked }: ack_outbox for
//   each; it acts only on rows still claimed and keeps the first 500 characters of an error.
// Refusals: { error } with unauthorized 401, method_not_allowed 405, invalid_request,
// unknown_action, invalid_limit, invalid_results 400; anything unexpected is unknown 500.
import { adminClient } from '../_shared/clients.ts'
import { siteOrigin } from '../_shared/http.ts'
import { fillSiteUrl, type OutboxEmail, sameToken, tomorrowInMalaysia } from './mail.ts'

const MAX_ROWS = 50

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const refuse = (code: string, status: number) => reply({ error: code }, status)

async function claim(limit: unknown): Promise<Response> {
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 0) {
    return refuse('invalid_limit', 400)
  }
  const admin = adminClient()

  // A failure here mustn't hold up the emails already queued: log it and hand them out.
  const queued = await admin.rpc('queue_daily_emails', {
    p_for_date: tomorrowInMalaysia(new Date()),
  })
  if (queued.error) console.error(`queue_daily_emails: ${queued.error.message}`)

  const claimed = await admin.rpc('claim_outbox', { p_limit: Math.min(limit, MAX_ROWS) })
  if (claimed.error) throw new Error(`claim_outbox: ${claimed.error.message}`)
  const site = siteOrigin()
  const emails = (claimed.data as OutboxEmail[]).map((row) => {
    const { id, to_email, subject, body_text, body_html, kind } = fillSiteUrl(row, site)
    return { id, to_email, subject, body_text, body_html, kind }
  })
  return reply({ emails })
}

type Result = { id: number; ok: boolean; error: string | null }

function readResults(results: unknown): Result[] | null {
  if (!Array.isArray(results) || results.length > MAX_ROWS) return null
  const read: Result[] = []
  for (const result of results as unknown[]) {
    if (typeof result !== 'object' || result === null) return null
    const { id, ok, error } = result as Record<string, unknown>
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || typeof ok !== 'boolean') return null
    read.push({ id, ok, error: error === undefined || error === null ? null : String(error) })
  }
  return read
}

async function ack(results: unknown): Promise<Response> {
  const read = readResults(results)
  if (!read) return refuse('invalid_results', 400)
  const admin = adminClient()
  let acked = 0
  for (const { id, ok, error } of read) {
    const done = await admin.rpc('ack_outbox', {
      p_id: id,
      p_ok: ok,
      p_error: error === null ? null : error.slice(0, 500),
    })
    if (done.error) throw new Error(`ack_outbox: ${done.error.message}`)
    if (done.data === true) acked++
  }
  return reply({ acked })
}

Deno.serve(async (request) => {
  try {
    const expected = Deno.env.get('MAIL_TOKEN')
    if (!expected || expected.length < 32) {
      throw new Error('The MAIL_TOKEN secret is not set (32 characters or more).')
    }
    if (!(await sameToken(request.headers.get('x-mail-token') ?? '', expected))) {
      return refuse('unauthorized', 401)
    }
    if (request.method !== 'POST') return refuse('method_not_allowed', 405)
    const body: unknown = await request.json().catch(() => null)
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return refuse('invalid_request', 400)
    }
    const { action, limit, results } = body as Record<string, unknown>
    switch (action) {
      case 'claim':
        return await claim(limit)
      case 'ack':
        return await ack(results)
      default:
        return refuse('unknown_action', 400)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Unexpected failure')
    return refuse('unknown', 500)
  }
})
