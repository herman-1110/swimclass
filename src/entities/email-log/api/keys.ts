/** Query keys for what the mailer sent (email_log) (ARCHITECTURE §3.6): features refresh them after a change. */
export const emailLogKeys = {
  all: ['email-log'] as const,
  /** The latest `limit` emails, newest first. */
  list: (limit: number) => [...emailLogKeys.all, 'list', limit] as const,
}
