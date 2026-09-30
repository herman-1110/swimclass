/** Query keys for the coach's announcements (ARCHITECTURE §3.6): features refresh them after a change. */
export const announcementKeys = {
  all: ['announcement'] as const,
  /** The pinned messages not yet removed, newest first: the banner and the coach's list. */
  pinned: () => [...announcementKeys.all, 'pinned'] as const,
}
