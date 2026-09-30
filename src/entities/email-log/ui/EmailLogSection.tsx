import { EMAIL_LOG_AVAILABLE, useEmailLog } from '../api/useEmailLog'
import { EmailLogView } from './EmailLogView'

type EmailLogSectionProps = {
  /** How many of the latest emails to list (the Settings spec: 50). */
  limit?: number
  /** Layout only: its place in the Settings grid ("xl:col-span-2"). */
  className?: string
}

/**
 * Settings' Email log, whole: title, note and the list, with its loading and error states.
 * Renders nothing until the database has `email_log()` (EMAIL_LOG_AVAILABLE; the Settings
 * spec §2.6: "Until then, don't render it"), and asks for nothing meanwhile, so the
 * Settings page can place it after its sections today.
 */
export function EmailLogSection({ limit = 50, className }: EmailLogSectionProps) {
  const query = useEmailLog(limit)
  if (!EMAIL_LOG_AVAILABLE) return null
  return <EmailLogView limit={limit} query={query} className={className} />
}
