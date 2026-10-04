// admin-accounts (TECH_SPEC §7): the coach's account actions that need Auth's admin API.
// The caller's JWT must be the coach's: is_coach() answers as the caller (no JWT, or an
// expired one: 401 not_signed_in; anyone else: 403 not_coach).
//
// POST { action: "create_account", username, display_name, email, phone } → { account_id }:
//   invites the email (Auth sends the invitation; its link opens /reset-password to set a
//   password) with the profile's details as metadata, then approves the account as the
//   coach (approve_account). Refusals: invalid_username, username_taken,
//   invalid_display_name, invalid_phone, invalid_email, email_taken.
// POST { action: "send_password_reset", account_id } → { ok: true }: emails that account a
//   link to /reset-password. Refusal: not_found.
import { adminClient, callerClient } from '../_shared/clients.ts'
import { type Body, json, refuse, serveFromSite, siteOrigin, text } from '../_shared/http.ts'

const USERNAME = /^[a-z0-9._]{3,30}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Where Auth's emails send the person: the page that sets a new password. */
const resetPasswordUrl = () => `${siteOrigin()}/reset-password`

type Caller = ReturnType<typeof callerClient>

async function createAccount(caller: Caller, body: Body): Promise<Response> {
  const username = text(body, 'username').toLowerCase()
  const displayName = text(body, 'display_name')
  const email = text(body, 'email').toLowerCase()
  const phone = text(body, 'phone')
  if (!USERNAME.test(username)) return refuse('invalid_username', 400)
  if (displayName.length < 1 || displayName.length > 100) return refuse('invalid_display_name', 400)
  if (phone.length > 30) return refuse('invalid_phone', 400)
  if (email.length > 254 || !EMAIL.test(email)) return refuse('invalid_email', 400)

  const usernameTaken = async () => {
    const free = await caller.rpc('username_available', { p_username: username })
    if (free.error) throw new Error(`username_available: ${free.error.message}`)
    return free.data !== true
  }
  if (await usernameTaken()) return refuse('username_taken', 409)

  const admin = adminClient()
  const invited = await admin.auth.admin.inviteUserByEmail(email, {
    data: { username, display_name: displayName, phone: phone || null },
    redirectTo: resetPasswordUrl(),
  })
  if (invited.error) {
    if (invited.error.code === 'email_exists') return refuse('email_taken', 409)
    if (invited.error.code === 'over_email_send_rate_limit') {
      return refuse('over_email_send_rate_limit', 429)
    }
    // The profile trigger refused it: most likely someone took the username meanwhile.
    if (await usernameTaken()) return refuse('username_taken', 409)
    throw new Error(`inviteUserByEmail: ${invited.error.code ?? invited.error.message}`)
  }

  // An address that signed up but never confirmed is invited again, not created: that
  // account has its own username, so it isn't the one the coach asked for.
  const accountId = invited.data.user.id
  const profile = await admin.from('profiles').select('username').eq('id', accountId).single()
  if (profile.error) throw new Error(`profiles: ${profile.error.message}`)
  if (profile.data.username !== username) return refuse('email_taken', 409)

  const approved = await caller.rpc('approve_account', { p_account_id: accountId })
  if (approved.error) throw new Error(`approve_account: ${approved.error.message}`)
  return json({ account_id: accountId })
}

async function sendPasswordReset(body: Body): Promise<Response> {
  const accountId = text(body, 'account_id')
  if (!UUID.test(accountId)) return refuse('not_found', 404)
  const admin = adminClient()
  const found = await admin.auth.admin.getUserById(accountId)
  const email = found.data.user?.email
  if (found.error || !email) return refuse('not_found', 404)
  // The secret-key client: Auth skips its CAPTCHA for admin credentials (its source says so for
  // service_role; not yet tried with an sb_secret_ key, HANDOFF v0.13).
  const sent = await admin.auth.resetPasswordForEmail(email, { redirectTo: resetPasswordUrl() })
  if (sent.error) {
    if (sent.error.status === 429) return refuse('over_email_send_rate_limit', 429)
    throw new Error(`resetPasswordForEmail: ${sent.error.code ?? sent.error.message}`)
  }
  return json({ ok: true })
}

serveFromSite(async (body, request) => {
  const authorization = request.headers.get('authorization') ?? ''
  // A signed-in caller's token is a JWT; a bare publishable key is not.
  if (!/^Bearer eyJ/.test(authorization)) return refuse('not_signed_in', 401)
  const caller = callerClient(authorization)
  const coach = await caller.rpc('is_coach')
  if (coach.error) return refuse('not_signed_in', 401)
  if (coach.data !== true) return refuse('not_coach', 403)

  switch (body.action) {
    case 'create_account':
      return createAccount(caller, body)
    case 'send_password_reset':
      return sendPasswordReset(body)
    default:
      return refuse('unknown_action', 400)
  }
})
