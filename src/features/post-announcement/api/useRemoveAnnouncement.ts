import { useMutation, useQueryClient } from '@tanstack/react-query'

import { announcementKeys } from '@/entities/announcement'
import { rpc } from '@/shared/api/rpc'

export type RemoveAnnouncementInput = { id: string }

type UseRemoveAnnouncementOptions = {
  /** Called as soon as the message is removed, before the refresh: close the confirmation. */
  onRemoved?: (input: RemoveAnnouncementInput) => void
}

/**
 * `remove_announcement` (TECH_SPEC §5.4; the coach only): the message stops showing as the
 * customers' banner. Removing one twice is not an error. Emails already queued still go
 * out. Then it refreshes the announcements and stays pending until the list is fresh.
 */
export function useRemoveAnnouncement({ onRemoved }: UseRemoveAnnouncementOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: RemoveAnnouncementInput) => rpc('remove_announcement', { p_id: id }),
    onSuccess: (_nothing, input) => {
      onRemoved?.(input)
      return queryClient.invalidateQueries({ queryKey: announcementKeys.all })
    },
  })
}
