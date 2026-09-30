import { formatDay, formatTime } from '@/shared/lib/time'

import type { EmailKind, EmailLogRow } from './types'

// The Settings spec §5.7 (proposed with prompt 11).
const KIND_LABELS: Record<EmailKind, string> = {
  reminder: 'Lesson reminder',
  digest: 'Tomorrow’s schedule',
  booked: 'Booking confirmation',
  cancelled: 'Cancellation',
  late_alert: 'Late-change alert',
  broadcast: 'Message to customers',
}

/** "Booking confirmation"; a kind this version doesn't know shows as the database wrote it. */
export function emailKindLabel(kind: EmailKind): string {
  return Object.hasOwn(KIND_LABELS, kind) ? KIND_LABELS[kind] : kind
}

/** When it was queued, in Malaysia time: "Sat 26 Sep, 8:05 pm". */
export function emailWhen(row: Pick<EmailLogRow, 'created_at'>): string {
  return `${formatDay(row.created_at)}, ${formatTime(row.created_at)}`
}

export type EmailStatus = {
  text: string
  /** warn: it hasn't gone out and the mailer gave up or failed (orange: needs attention). */
  tone: 'ink' | 'muted' | 'warn'
}

/** "Sent 8:06 pm", "Waiting" (the mailer hasn't tried yet) or "Not sent: {last_error}". */
export function emailStatus(
  row: Pick<EmailLogRow, 'sent_at' | 'attempts' | 'last_error'>,
): EmailStatus {
  if (row.sent_at) return { text: `Sent ${formatTime(row.sent_at)}`, tone: 'ink' }
  if (row.attempts === 0) return { text: 'Waiting', tone: 'muted' }
  const error = row.last_error?.trim()
  return { text: error ? `Not sent: ${error}` : 'Not sent', tone: 'warn' }
}
