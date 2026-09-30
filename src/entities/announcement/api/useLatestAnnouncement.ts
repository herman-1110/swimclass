import { useQuery } from '@tanstack/react-query'

import type { PinnedAnnouncement } from '../model/types'
import { pinnedAnnouncementsQuery } from './pinnedAnnouncementsQuery'

/**
 * The coach banner's message on Book, Schedule and My classes: the newest pinned message
 * not yet removed, or null when there is none (DESIGN §4; prompt 07 TASK 4). Selected from
 * the pinned list, so the coach's list and the banner share one read. Hide the banner while
 * it loads or if it fails.
 */
export function useLatestAnnouncement() {
  return useQuery({
    ...pinnedAnnouncementsQuery(),
    select: (pinned): PinnedAnnouncement | null => pinned[0] ?? null,
  })
}
