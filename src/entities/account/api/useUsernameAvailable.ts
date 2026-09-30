import { queryOptions, useQuery } from '@tanstack/react-query'

import { rpc } from '@/shared/api/rpc'
import { useDebouncedValue } from '@/shared/lib/hooks/useDebouncedValue'

import { isValidUsername, normalizeUsername } from '../model/username'
import { accountKeys } from './keys'

/** The check runs this long after the last keystroke (the auth spec, R4). */
export const USERNAME_CHECK_DELAY_MS = 400

/**
 * `username_available` as a query (anon may call it, so it works on Sign up too). A form
 * that must be sure on submit awaits it: `await queryClient.fetchQuery(
 * usernameAvailableQuery(username))` (sign-up, while a check is still running; and with
 * `staleTime: 0` after `signup_failed`). Pass a normalized, valid username: the database
 * answers false for an invalid one, which would read as "taken".
 */
export function usernameAvailableQuery(username: string) {
  return queryOptions({
    queryKey: accountKeys.usernameAvailable(username),
    queryFn: () => rpc('username_available', { p_username: username }),
    staleTime: 30_000,
    retry: false,
  })
}

/**
 * Where a username check stands: nothing typed, the wrong format (no request is made),
 * checking (typing, or waiting for the answer), free, taken, or unknown (the check failed:
 * show nothing, and check again on submit).
 */
export type UsernameCheckState =
  'empty' | 'invalid' | 'checking' | 'available' | 'taken' | 'unknown'

export type UsernameCheck = {
  /** The normalized username the state is about ("  MeiLing " → "meiling"). */
  username: string
  state: UsernameCheckState
}

/**
 * The live username check of Sign up and of Add students' new account: whether the typed
 * username is free, asked 400 ms after the last keystroke and only for a valid format. The
 * words are the form's ("Checking…", "That username is available.", "That username is
 * taken.", the format message from messages.ts).
 */
export function useUsernameAvailable(input: string): UsernameCheck {
  const username = normalizeUsername(input)
  const settled = useDebouncedValue(username, USERNAME_CHECK_DELAY_MS)
  const check = useQuery({ ...usernameAvailableQuery(settled), enabled: isValidUsername(settled) })

  if (username === '') return { username, state: 'empty' }
  if (!isValidUsername(username)) return { username, state: 'invalid' }
  if (settled !== username || check.isPending) return { username, state: 'checking' }
  if (check.isError) return { username, state: 'unknown' }
  return { username, state: check.data ? 'available' : 'taken' }
}
