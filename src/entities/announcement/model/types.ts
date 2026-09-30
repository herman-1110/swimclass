import type { Row } from '@/shared/api/rpc'

/**
 * A message from the coach to every customer (TECH_SPEC §3; data-contracts §3.2). The
 * generated table type is right as it is: `created_by` and `removed_at` may be null.
 */
export type Announcement = Row<'announcements'>

/**
 * A pinned message that hasn't been removed, as the screens read it: the customers' coach
 * banner shows the newest; the coach's Message all customers lists them all. `created_at`
 * is UTC text ("2026-09-25T02:00:00+00:00").
 */
export type PinnedAnnouncement = Pick<Announcement, 'id' | 'message' | 'created_at'>
