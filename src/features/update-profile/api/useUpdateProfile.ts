import { useMutation, useQueryClient } from '@tanstack/react-query'

import { accountKeys } from '@/entities/account'
import { updateRows } from '@/shared/api/rpc'

export type UpdateProfileInput = {
  /** The account whose details change: the signed-in one. */
  accountId: string
  /** Trimmed, 1–100 characters. */
  displayName: string
  /** Trimmed, up to 30 characters, or null for none. */
  phone: string | null
}

/**
 * Account's "Save details" (auth spec W6): the name and phone, written directly, as RLS
 * allows (there is no function for it). It answers nothing, so it then refreshes the
 * accounts (data-contracts §8: profile update → account) and stays pending until the fresh
 * profile is in: the sidebar's "Signed in as …" follows. A check failure comes back as
 * `unknown`; the form's own checks keep it from happening.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, displayName, phone }: UpdateProfileInput) =>
      updateRows('profiles', { display_name: displayName, phone }, { eq: { id: accountId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  })
}
