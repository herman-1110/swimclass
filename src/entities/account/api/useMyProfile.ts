import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'

import { useUserId } from '../model/session'
import type { Profile } from '../model/types'
import { accountKeys } from './keys'

/** The TanStack Query options useMyProfile passes on: all but the key, the read and
 *  `enabled`, which it sets itself. */
export type MyProfileOptions = Omit<
  UseQueryOptions<Profile | null, Error, Profile | null, ReturnType<typeof accountKeys.me>>,
  'queryKey' | 'queryFn' | 'enabled'
>

/**
 * The signed-in account's profile: name, phone, role and approval (null if the account has
 * no profile row). It filters by the account's id because RLS shows the coach every
 * profile. Options pass through, for example `useMyProfile({ refetchInterval: 60_000 })`
 * on Waiting for approval, so an approval shows without a reload (the auth spec, R2).
 */
export function useMyProfile(options: MyProfileOptions = {}) {
  const userId = useUserId()
  return useQuery({
    ...options,
    queryKey: accountKeys.me(userId),
    queryFn: async (): Promise<Profile | null> => {
      const [profile] = await readRows('profiles', { eq: { id: userId ?? '' } })
      return profile ?? null
    },
    enabled: userId !== null,
  })
}
