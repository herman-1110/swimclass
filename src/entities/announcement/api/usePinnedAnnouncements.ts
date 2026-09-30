import { useQuery } from '@tanstack/react-query'

import { pinnedAnnouncementsQuery } from './pinnedAnnouncementsQuery'

/**
 * The pinned messages not yet removed, newest first: Message all customers' list, each with
 * Remove (coach-schedule R6; prompt 08). The newest is the one customers see; empty when
 * there are none (the seed).
 */
export function usePinnedAnnouncements() {
  return useQuery(pinnedAnnouncementsQuery())
}
