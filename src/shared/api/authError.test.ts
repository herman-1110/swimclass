import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import { authError } from './authError'

describe('authError', () => {
  it('gives not_signed_in for a missing session, as the demo does (auth spec C29)', () => {
    const error = new AuthSessionMissingError()
    expect(error.code).toBeUndefined()
    expect(authError(error).code).toBe('not_signed_in')
  })

  it('gives network for a failed fetch and keeps Supabase’s own codes', () => {
    expect(authError(new AuthRetryableFetchError('Failed to fetch', 0)).code).toBe('network')
    expect(authError(new AuthApiError('Password is too weak', 422, 'weak_password')).code).toBe(
      'weak_password',
    )
    expect(authError(new AuthApiError('Database error saving new user', 500, undefined)).code).toBe(
      'signup_failed',
    )
  })
})
