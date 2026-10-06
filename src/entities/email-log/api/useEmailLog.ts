import { useQuery } from '@tanstack/react-query'

import { rpc } from '@/shared/api/rpc'

import type { EmailLogRow } from '../model/types'
import { emailLogKeys } from './keys'

/**
 * The coach's email log (`email_log(p_limit)`, TECH_SPEC §5.5): the latest emails the site
 * queued, newest first, with whether each has gone out.
 */
export function useEmailLog(limit = 50) {
  return useQuery({
    queryKey: emailLogKeys.list(limit),
    // The generated types call every column of a RETURNS TABLE non-null and `kind` any
    // text: sent_at and last_error are null until set, and emailKindLabel shows a kind this
    // version doesn't know as the database wrote it.
    queryFn: async () => (await rpc('email_log', { p_limit: limit })) as EmailLogRow[],
  })
}
