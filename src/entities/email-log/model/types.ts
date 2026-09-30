/** What an email was for (`email_outbox.kind`, TECH_SPEC §8). */
export type EmailKind = 'booked' | 'cancelled' | 'late_alert' | 'broadcast' | 'reminder' | 'digest'

/**
 * One email in the log: a row of the planned `email_log(p_limit)` (TECH_SPEC §5.5,
 * data-contracts §3.5 and §6.4), newest first. Times are UTC column text
 * ("2026-09-26T12:05:00+00:00").
 */
export type EmailLogRow = {
  created_at: string
  to_email: string
  kind: EmailKind
  /** When the mailer sent it; null until then. */
  sent_at: string | null
  /** Tries so far (0 while it waits for the mailer). */
  attempts: number
  /** Why the last try failed. */
  last_error: string | null
}
