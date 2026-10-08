import { useMutation, useQueryClient } from '@tanstack/react-query'

import { accountKeys, type Profile } from '@/entities/account'
import { updateRows } from '@/shared/api/rpc'
import type { Language } from '@/shared/i18n/language'

export type SaveLanguageInput = {
  /** The signed-in account. */
  accountId: string
  language: Language
}

/**
 * Keeps the student screens' language on the account (HANDOFF v0.26 stage 4), so its emails go
 * out in it and the next sign-in on any phone follows it. Written directly, as RLS allows for
 * the name and phone. The cached profile takes the new value at once rather than being read
 * again. A failure changes nothing on screen: the phone keeps the choice, and the account
 * keeps its old one.
 */
export function useSaveLanguage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, language }: SaveLanguageInput) =>
      updateRows('profiles', { language }, { eq: { id: accountId } }),
    onSuccess: (_, { accountId, language }) =>
      queryClient.setQueryData<Profile | null>(accountKeys.me(accountId), (profile) =>
        profile ? { ...profile, language } : profile,
      ),
  })
}
