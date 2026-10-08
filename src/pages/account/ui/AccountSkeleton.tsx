import { useWords } from '@/shared/i18n/context'
import { Skeleton } from '@/shared/ui/Skeleton'

import { accountPageWords } from '../model/words'

/**
 * "Your details" while the profile loads (auth spec §6.6): two rows, two 48 px fields and a
 * 50 px button, so nothing moves when it arrives. The guard normally holds the profile
 * already, so this rarely shows.
 */
export function AccountSkeleton() {
  const w = useWords(accountPageWords)
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <p role="status" className="sr-only">
        {w.loading}
      </p>
      <Skeleton shape="line" className="h-4 w-24" />
      {['username', 'email'].map((row) => (
        <div key={row} className="flex flex-col gap-1.5">
          <Skeleton shape="line" className="h-4 w-16" />
          <Skeleton shape="line" className="h-4.5 w-40" />
        </div>
      ))}
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="mt-2 h-12.5" />
    </div>
  )
}
