import { useMutation, useQueryClient } from '@tanstack/react-query'

import { announcementKeys } from '@/entities/announcement'
import { rpc } from '@/shared/api/rpc'

export type PostAnnouncementInput = {
  /** As typed: the database trims it and refuses a blank one or one over 1000 characters. */
  message: string
  /** "Pin as a banner until I remove it": customers see it on Book, Schedule and My classes. */
  pinned: boolean
}

type UsePostAnnouncementOptions = {
  /** Called as soon as the message is saved, before the refresh: clear the form, say "Sent". */
  onPosted?: (input: PostAnnouncementInput) => void
}

/**
 * `post_announcement` (TECH_SPEC §5.4; the coach only): every approved customer is emailed
 * (`p_send_email` is always true here, as "Send to all customers" says), and a pinned message
 * becomes the customers' banner. Then it refreshes the announcements (data-contracts §8) and
 * stays pending until the pinned list is fresh.
 */
export function usePostAnnouncement({ onPosted }: UsePostAnnouncementOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ message, pinned }: PostAnnouncementInput) =>
      rpc('post_announcement', { p_message: message, p_send_email: true, p_pinned: pinned }),
    onSuccess: (_id, input) => {
      onPosted?.(input)
      return queryClient.invalidateQueries({ queryKey: announcementKeys.all })
    },
  })
}
