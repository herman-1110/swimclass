// The Supabase clients the Edge Functions use. Hosted functions get the project's new API
// keys as JSON objects keyed by name (SUPABASE_SECRET_KEYS, SUPABASE_PUBLISHABLE_KEYS:
// {"default": "sb_..."}); the CLI's local runtime gives single keys instead.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2'

function projectKey(keysVariable: string, keyVariable: string): string {
  const keys = Deno.env.get(keysVariable)
  if (keys) {
    const named = JSON.parse(keys) as Record<string, string>
    if (named.default) return named.default
  }
  const key = Deno.env.get(keyVariable)
  if (key) return key
  throw new Error(`${keysVariable} is not set.`)
}

function projectUrl(): string {
  const url = Deno.env.get('SUPABASE_URL')
  if (!url) throw new Error('SUPABASE_URL is not set.')
  return url
}

/** A function never keeps a session: each request starts afresh. */
const NO_SESSION = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}

/**
 * The secret-key client: the service role. It bypasses RLS, and Auth skips its CAPTCHA for
 * it, so use it only for what needs the service role (the login limit, Auth's admin API).
 */
export function adminClient(): SupabaseClient {
  return createClient(
    projectUrl(),
    projectKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SECRET_KEY'),
    NO_SESSION,
  )
}

/** A signed-out publishable-key client, like a browser's: Auth checks the CAPTCHA on it. */
export function publicClient(): SupabaseClient {
  return createClient(
    projectUrl(),
    projectKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_PUBLISHABLE_KEY'),
    NO_SESSION,
  )
}

/**
 * A publishable-key client acting as the caller: their `Authorization: Bearer <JWT>` goes
 * with every database call, so the database checks their rights (is_coach() and so on).
 */
export function callerClient(authorization: string): SupabaseClient {
  return createClient(
    projectUrl(),
    projectKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_PUBLISHABLE_KEY'),
    { ...NO_SESSION, global: { headers: { Authorization: authorization } } },
  )
}
