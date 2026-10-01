import { useMutation } from '@tanstack/react-query'

import { logIn } from '@/shared/api/auth'

import { logInUsername } from '../model/logInChecks'

export type LogInInput = { username: string; password: string }

/**
 * Log in with a username (auth spec W1): the `login` Edge Function, or demo mode's stand-in.
 * Failures: `invalid_login` (any wrong detail), `too_many_attempts` (10 failures in 15
 * minutes), `network`. On success the session changes: SessionProvider clears every cached
 * query, and Log in's guard carries the person on (to where they were going, or home), so
 * there is nothing to refresh here.
 */
export function useLogIn() {
  return useMutation({
    mutationFn: ({ username, password }: LogInInput) => logIn(logInUsername(username), password),
  })
}
