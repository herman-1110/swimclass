// login (TECH_SPEC §7): sign in with a username instead of an email, without the browser
// ever seeing an email. POST { username, password, captcha_token } → { session:
// { access_token, refresh_token } }, which the website passes to supabase.auth.setSession.
//
// 1. The username is trimmed and lowercased; one that can't be a username, or an empty
//    password, is refused as invalid_login and not counted.
// 2. check_login_attempt (service role) decides and records the try: too_many_attempts
//    after 10 failures for this username from this IP, or 30 from this IP, in 15 minutes.
//    It returns the account's email.
// 3. Auth signs in with that email and password through a publishable-key client, with the
//    CAPTCHA token passed on, so Auth checks the CAPTCHA when it is on (TECH_SPEC §9). A
//    secret-key client would skip that check.
// 4. On success record_login_success marks the try. Every wrong detail (unknown username,
//    wrong password, email not confirmed) answers the same invalid_login.
import { adminClient, publicClient } from '../_shared/clients.ts'
import { json, refuse, serveFromSite, text } from '../_shared/http.ts'

const USERNAME = /^[a-z0-9._]{3,30}$/
const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
const IPV6 = /^[0-9a-f:.]{2,45}$/i

function validIp(value: string | undefined): string | null {
  if (!value) return null
  const ip = value.trim()
  return IPV4.test(ip) || (ip.includes(':') && IPV6.test(ip)) ? ip : null
}

/**
 * The client's IP: CF-Connecting-IP, or else the first X-Forwarded-For entry; null when
 * neither holds an IP. Whether a client can set either header itself is still to be checked
 * on dev (HANDOFF v0.13, Next 3); if one can, read the header Supabase's edge sets instead.
 */
function clientIp(request: Request): string | null {
  return (
    validIp(request.headers.get('cf-connecting-ip') ?? undefined) ??
    validIp(request.headers.get('x-forwarded-for')?.split(',')[0])
  )
}

serveFromSite(async (body, request) => {
  const username = text(body, 'username').toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  const captchaToken = text(body, 'captcha_token') || undefined
  if (!USERNAME.test(username) || !password) return refuse('invalid_login', 401)

  const admin = adminClient()
  const gate = await admin.rpc('check_login_attempt', {
    p_username: username,
    p_ip: clientIp(request),
  })
  if (gate.error) {
    if (gate.error.message === 'too_many_attempts') return refuse('too_many_attempts', 429)
    throw new Error(`check_login_attempt: ${gate.error.message}`)
  }
  const { attempt_id: attemptId, email } = gate.data as {
    attempt_id: number
    email: string | null
  }
  if (!email) return refuse('invalid_login', 401)

  const { data, error } = await publicClient().auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  })
  if (error || !data.session) {
    if (error?.code === 'captcha_failed') return refuse('captcha_failed', 400)
    // Auth's own limit per IP (all tries through this function share one).
    if (error?.status === 429) return refuse('too_many_attempts', 429)
    if (error && error.status !== undefined && error.status >= 500) {
      throw new Error(`Auth: ${error.code ?? error.status}`)
    }
    return refuse('invalid_login', 401)
  }

  const recorded = await admin.rpc('record_login_success', { p_attempt_id: attemptId })
  // The person is signed in either way; the try simply stays counted as a failure.
  if (recorded.error) console.error(`record_login_success: ${recorded.error.message}`)

  return json({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  })
})
