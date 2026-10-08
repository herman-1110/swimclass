import { useWords } from '@/shared/i18n/context'

import { accountPageWords } from '../model/words'

type AccountSummaryProps = {
  username: string
  /** From the session; Supabase always has one for these accounts. */
  email: string | null
  /** The coach: no one to message about these, so no note (triage 11). */
  isCoach?: boolean
}

/**
 * The details only the coach can change (auth spec §2.7, §3.3): read-only rows, a 13 px
 * label 6 px above a 15 px value, 16 px apart, then how to get them changed.
 */
export function AccountSummary({ username, email, isCoach = false }: AccountSummaryProps) {
  const w = useWords(accountPageWords)
  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <dt className="text-label font-medium text-muted">{w.username}</dt>
          <dd className="text-body">{username}</dd>
        </div>
        {email && (
          <div className="flex flex-col gap-1.5">
            <dt className="text-label font-medium text-muted">{w.email}</dt>
            <dd className="text-body wrap-anywhere">{email}</dd>
          </div>
        )}
      </dl>
      {!isCoach && <p className="text-small leading-[1.45] text-muted">{w.changeNote}</p>}
    </div>
  )
}
