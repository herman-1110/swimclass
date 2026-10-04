import type { PGlite, Transaction } from '@electric-sql/pglite'

import type { AuthSession, SignUpInput } from '../auth'
import { AppError, toAppError } from '../rpc'
import { demoSession, setDemoSession } from './session'

// Demo stand-ins for the `login` and `admin-accounts` Edge Functions (TECH_SPEC §7) and
// for Supabase Auth (§9), working on the demo database's auth.users. They answer with
// the same codes the real ones do, so the screens can show every message.

/** The profile trigger's username rule; the login function refuses anything else unrecorded. */
const USERNAME = /^[a-z0-9._]{3,30}$/
/**
 * The shortest password, as the forms check it (MIN_PASSWORD_LENGTH in shared/config/messages,
 * the auth spec's Q2). Supabase Auth's "Minimum password length" must say the same.
 */
const MIN_PASSWORD_LENGTH = 8

/** Runs work as the service role, the way the Edge Functions reach the database. */
function asServiceRole<T>(db: PGlite, work: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec('set local role service_role')
    return work(tx)
  })
}

/**
 * The `login` Edge Function (TECH_SPEC §7) with the database's own limit
 * (check_login_attempt, record_login_success): 10 failures in 15 minutes for a username,
 * or 30 for any usernames, from one browser (demo mode has no IP: all its tries share
 * one) → too_many_attempts; any other failure → invalid_login. No CAPTCHA in demo mode.
 */
export async function demoLogIn(
  db: PGlite,
  username: string,
  password: string,
): Promise<AuthSession> {
  const name = username.trim().toLowerCase()
  if (!USERNAME.test(name)) throw new AppError('invalid_login')
  const attemptId = await asServiceRole(db, async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `select public.check_login_attempt($1, null) ->> 'attempt_id' as id`,
      [name],
    )
    return rows[0]?.id
  })
  const { rows } = await db.query<{ id: string; email: string | null }>(
    `select u.id, u.email
     from public.profiles p
     join auth.users u on u.id = p.id
     where p.username = $1
       and u.email_confirmed_at is not null
       and u.encrypted_password = extensions.crypt($2, u.encrypted_password)`,
    [name, password],
  )
  const row = rows[0]
  if (!row || !attemptId) throw new AppError('invalid_login')
  await asServiceRole(db, (tx) => tx.query('select public.record_login_success($1)', [attemptId]))
  const session = { userId: row.id, email: row.email }
  setDemoSession(session)
  return session
}

/** The stored session, if its account still exists (a reset or a new seed may remove it). */
export async function demoGetSession(db: PGlite): Promise<AuthSession | null> {
  const session = demoSession()
  if (!session) return null
  const { rows } = await db.query(`select 1 from auth.users where id = $1`, [session.userId])
  if (rows.length) return session
  setDemoSession(null)
  return null
}

/**
 * Like supabase.auth.signUp: the profile trigger creates a waiting account. Demo mode
 * can't send the confirmation email, so the address counts as confirmed at once.
 */
export async function demoSignUp(
  db: PGlite,
  input: SignUpInput,
): Promise<{ confirmEmail: boolean }> {
  const email = input.email.trim().toLowerCase()
  if (input.password.length < MIN_PASSWORD_LENGTH) throw new AppError('weak_password')
  const taken = await db.query(`select 1 from auth.users where lower(email) = $1`, [email])
  if (taken.rows.length) throw new AppError('user_already_exists')
  try {
    await db.query(
      `insert into auth.users (
         instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at
       ) values (
         '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
         'authenticated', $1, extensions.crypt($2, extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}', $3::jsonb, now(), now()
       )`,
      [
        email,
        input.password,
        JSON.stringify({
          username: input.username,
          display_name: input.displayName,
          phone: input.phone,
        }),
      ],
    )
  } catch (error) {
    // Supabase Auth reports any failure of the profile trigger only as
    // "Database error saving new user", so demo mode doesn't say more either.
    throw new AppError('signup_failed', {}, error)
  }
  return { confirmEmail: true }
}

export async function demoUpdatePassword(db: PGlite, password: string): Promise<void> {
  const session = demoSession()
  if (!session) throw new AppError('not_signed_in')
  if (password.length < MIN_PASSWORD_LENGTH) throw new AppError('weak_password')
  const { rows } = await db.query<{ same: boolean }>(
    `select encrypted_password = extensions.crypt($2, encrypted_password) as same
     from auth.users where id = $1`,
    [session.userId, password],
  )
  if (rows[0]?.same) throw new AppError('same_password')
  await db.query(
    `update auth.users set encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')),
       updated_at = now() where id = $1`,
    [session.userId, password],
  )
}

async function requireCoach(db: PGlite): Promise<void> {
  const session = demoSession()
  const { rows } = session
    ? await db.query(`select 1 from public.profiles where id = $1 and role = 'coach'`, [
        session.userId,
      ])
    : { rows: [] }
  if (!rows.length) throw new AppError('not_coach')
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/** TECH_SPEC §7 `admin-accounts` (coach only): create_account, send_password_reset. */
export async function demoAdminAccounts(
  db: PGlite,
  body: Record<string, unknown>,
): Promise<unknown> {
  await requireCoach(db)
  switch (body.action) {
    case 'create_account': {
      const email = text(body.email).toLowerCase()
      const taken = await db.query(`select 1 from auth.users where lower(email) = $1`, [email])
      if (taken.rows.length) throw new AppError('email_taken')
      try {
        return await db.transaction(async (tx) => {
          // Like auth.admin.inviteUserByEmail: no password yet, marked as invited.
          const { rows } = await tx.query<{ id: string }>(
            `insert into auth.users (
               instance_id, id, aud, role, email, invited_at, raw_app_meta_data,
               raw_user_meta_data, created_at, updated_at
             ) values (
               '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
               'authenticated', $1, now(), '{"provider":"email","providers":["email"]}',
               $2::jsonb, now(), now()
             ) returning id`,
            [
              email,
              JSON.stringify({
                username: text(body.username),
                display_name: text(body.display_name),
                phone: text(body.phone) || null,
              }),
            ],
          )
          const id = rows[0]?.id
          await tx.query(`update public.profiles set approved = true where id = $1`, [id])
          return { account_id: id }
        })
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === '23505'
        ) {
          throw new AppError('username_taken', {}, error)
        }
        throw toAppError(error)
      }
    }
    case 'send_password_reset':
      return { ok: true }
    default:
      throw new AppError('unknown')
  }
}
