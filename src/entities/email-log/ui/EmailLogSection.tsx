import { useEmailLog } from '../api/useEmailLog'
import { EmailLogView } from './EmailLogView'

type EmailLogSectionProps = {
  /** How many of the latest emails to list (the Settings spec: 50). */
  limit?: number
  /** Layout only: its place in the Settings grid ("xl:col-span-2"). */
  className?: string
}

/**
 * Settings' Email log, whole: title, note and the list, with its loading and error states.
 */
export function EmailLogSection({ limit = 50, className }: EmailLogSectionProps) {
  const query = useEmailLog(limit)
  return <EmailLogView limit={limit} query={query} className={className} />
}
