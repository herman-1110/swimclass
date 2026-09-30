import { useQuery } from '@tanstack/react-query'

import { rpc } from '@/shared/api/rpc'

import type { EmailLogRow } from '../model/types'
import { emailLogKeys } from './keys'

/**
 * Whether the database has `email_log()` yet. It is planned with prompt 11's migration
 * (TECH_SPEC §5.5, data-contracts §3.5) and isn't in the migrations, so until then nothing
 * asks for it and the log isn't shown (the Settings spec §2.6: "Until then, don't render
 * it"). Turn it on in the commit that adds the migration and regenerates
 * database.types.ts, and drop the cast below.
 */
export const EMAIL_LOG_AVAILABLE: boolean = false

// email_log isn't in database.types.ts yet: its planned signature, until the types are
// regenerated.
const callEmailLog = rpc as unknown as (
  fn: 'email_log',
  args: { p_limit: number },
) => Promise<unknown>

/**
 * The coach's email log (`email_log(p_limit)`): the latest emails the site queued, newest
 * first, with whether each has gone out. Disabled while `EMAIL_LOG_AVAILABLE` is false;
 * `EmailLogSection` shows nothing then.
 */
export function useEmailLog(limit = 50) {
  return useQuery({
    queryKey: emailLogKeys.list(limit),
    queryFn: async () => (await callEmailLog('email_log', { p_limit: limit })) as EmailLogRow[],
    enabled: EMAIL_LOG_AVAILABLE,
  })
}
