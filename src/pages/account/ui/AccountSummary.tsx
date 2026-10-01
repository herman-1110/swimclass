type AccountSummaryProps = {
  username: string
  /** From the session; Supabase always has one for these accounts. */
  email: string | null
}

/**
 * The details only the coach can change (auth spec §2.7, §3.3): read-only rows, a 13 px
 * label 6 px above a 15 px value, 16 px apart, then how to get them changed.
 */
export function AccountSummary({ username, email }: AccountSummaryProps) {
  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <dt className="text-label font-medium text-muted">Username</dt>
          <dd className="text-body">{username}</dd>
        </div>
        {email && (
          <div className="flex flex-col gap-1.5">
            <dt className="text-label font-medium text-muted">Email</dt>
            <dd className="text-body wrap-anywhere">{email}</dd>
          </div>
        )}
      </dl>
      <p className="text-small leading-[1.45] text-muted">
        To change your username or email, message your coach.
      </p>
    </div>
  )
}
