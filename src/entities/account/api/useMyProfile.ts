import { useQuery } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'

import { useUserId } from '../model/session'
import type { Profile } from '../model/types'
import { accountKeys } from './keys'

/** The signed-in account's profile: name, phone, role and approval (RLS shows only their own). */
export function useMyProfile() {
  const userId = useUserId()
  return useQuery({
    queryKey: accountKeys.me(userId),
    queryFn: async (): Promise<Profile | null> => {
      const [profile] = await readRows('profiles', { eq: { id: userId ?? '' } })
      return profile ?? null
    },
    enabled: userId !== null,
  })
}
