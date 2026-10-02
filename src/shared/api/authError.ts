import { type AuthError, isAuthSessionMissingError } from '@supabase/supabase-js'

import { AppError } from './rpc'

/**
 * Supabase Auth's error as the app's AppError code (supabaseBackend.ts; its own file so the
 * unit tests can check it without a Supabase client). Codes the demo also gives come out the
 * same, so the pages answer alike in both (ARCHITECTURE §3.6).
 */
export function authError(error: AuthError): AppError {
  if (error.name === 'AuthRetryableFetchError') return new AppError('network', {}, error)
  // No session (an expired reset link): auth-js gives this error no code (auth spec C29).
  if (isAuthSessionMissingError(error)) return new AppError('not_signed_in', {}, error)
  // Any failure of the profile trigger (TECH_SPEC §9) comes back as this one message.
  if (/database error saving new user/i.test(error.message)) {
    return new AppError('signup_failed', {}, error)
  }
  return new AppError(error.code ?? 'unknown', {}, error)
}
