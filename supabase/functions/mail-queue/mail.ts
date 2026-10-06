// The mail-queue function's plain helpers: no Deno APIs, so the unit tests (Vitest, Node) run
// them too (mail.test.ts).

/** An outbox row as claim_outbox returns it; the mailer gets these fields. */
export type OutboxEmail = {
  id: number
  to_email: string
  subject: string
  body_text: string
  body_html: string | null
  kind: string
}

const PLACEHOLDER = '{{site_url}}'

/**
 * Fills in the site's address: the templates write their links as `{{site_url}}/my-classes`
 * (TECH_SPEC §8), so the same rows work on dev and production. Every occurrence, since an
 * HTML link has it twice. `siteUrl` is the bare origin, with no trailing slash.
 */
export function fillSiteUrl(email: OutboxEmail, siteUrl: string): OutboxEmail {
  return {
    ...email,
    subject: email.subject.replaceAll(PLACEHOLDER, siteUrl),
    body_text: email.body_text.replaceAll(PLACEHOLDER, siteUrl),
    body_html: email.body_html === null ? null : email.body_html.replaceAll(PLACEHOLDER, siteUrl),
  }
}

/** Tomorrow's date in Malaysia (UTC+8 all year), as 'YYYY-MM-DD'. */
export function tomorrowInMalaysia(now: Date): string {
  return new Date(now.getTime() + (8 + 24) * 3600_000).toISOString().slice(0, 10)
}

/**
 * Whether the token sent equals the expected one, in constant time: both are hashed first, so
 * neither their length nor where they first differ shows in how long the check takes.
 */
export async function sameToken(given: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const digest = async (token: string) =>
    new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(token)))
  const a = await digest(given)
  const b = await digest(expected)
  let difference = 0
  a.forEach((byte, i) => {
    difference |= byte ^ (b[i] ?? 0)
  })
  return difference === 0
}
