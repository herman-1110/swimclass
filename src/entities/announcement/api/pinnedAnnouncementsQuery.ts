import { queryOptions } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'

import type { PinnedAnnouncement } from '../model/types'
import { announcementKeys } from './keys'

/**
 * Every pinned message not yet removed, newest first (data-contracts §3.2): one read for
 * the customers' banner and the coach's list. `removed_at` is filtered here, not left to
 * RLS: RLS hides removed messages from customers but shows the coach all of them, and he
 * sees the customer pages too.
 */
export function pinnedAnnouncementsQuery() {
  return queryOptions({
    queryKey: announcementKeys.pinned(),
    queryFn: (): Promise<PinnedAnnouncement[]> =>
      readRows('announcements', {
        columns: ['id', 'message', 'created_at'],
        eq: { pinned: true },
        isNull: ['removed_at'],
        order: [
          { column: 'created_at', ascending: false },
          { column: 'id', ascending: false },
        ],
      }),
  })
}
