import type { UsernameCheckState } from '@/entities/account'
import { messageFor } from '@/shared/config/messages'

import { USERNAME_AVAILABLE, USERNAME_CHECKING } from './copy'

/** The line under Username: its words, and whether it needs attention (orange). */
export type UsernameStatus = { text: string; warn: boolean }

/**
 * What the line under the new account's Username says as they type (the spec §6):
 * "Checking…", "Available", "That username is taken." or the format message, the last two in
 * orange. The format message waits until typing pauses (`settled`), so it doesn't flash at
 * the first letter. Nothing while empty, when the check failed (the save checks again), or
 * while the field shows an error of its own.
 */
export function usernameStatus(
  state: UsernameCheckState,
  { settled, hasError }: { settled: boolean; hasError: boolean },
): UsernameStatus | null {
  if (hasError) return null
  switch (state) {
    case 'checking':
      return { text: USERNAME_CHECKING, warn: false }
    case 'available':
      return { text: USERNAME_AVAILABLE, warn: false }
    case 'taken':
      return { text: messageFor({ code: 'username_taken' }, { audience: 'coach' }), warn: true }
    case 'invalid':
      return settled
        ? { text: messageFor({ code: 'invalid_username' }, { audience: 'coach' }), warn: true }
        : null
    default:
      return null
  }
}
