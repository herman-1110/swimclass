import { formatDay, type Instant } from '@/shared/lib/time'

// The words of Message all customers and its pinned list (design/AdminSchedule.dc.html
// L231-240; the Schedule spec §3.7, §6.3 and §7.4; the strings marked proposed there).

/** The longest message `post_announcement` takes (`invalid_message` past it, after trimming). */
export const MESSAGE_MAX_LENGTH = 1000

/** The textarea's drawn placeholder. */
export const MESSAGE_PLACEHOLDER =
  'e.g. Pool maintenance on Saturday morning. Those lessons move to 4 pm.'

/** The drawn line above the textarea (the Schedule spec §9 C11: it describes the box). */
export const MESSAGE_HELP = 'Sent by email and shown in the app'

/** The page's notice once the message is sent (the Schedule spec §6.3, proposed). */
export const SENT_NOTICE = 'Sent to all customers.'

/** The page's notice once a pinned message is removed (proposed). */
export const REMOVED_NOTICE = 'Message removed.'

/** The Remove confirmation (the Schedule spec §7.4, proposed). */
export const REMOVE_TITLE = 'Remove this message?'
export const REMOVE_DESCRIPTION =
  'Customers stop seeing the banner. Emails already sent or queued still go out.'

/** Nothing to send: empty, or only spaces and line breaks (the database trims it). */
export function isBlank(message: string): boolean {
  return message.trim() === ''
}

/**
 * The line under a pinned message (the Schedule spec §3.7, proposed): "Posted Sat 26 Sep ·
 * Customers see this one" for the newest, which is the banner customers see, and "… · Shows
 * again if you remove the newer ones" for the others.
 */
export function pinnedLine(createdAt: Instant, newest: boolean): string {
  const shown = newest ? 'Customers see this one' : 'Shows again if you remove the newer ones'
  return `Posted ${formatDay(createdAt)} · ${shown}`
}

/** What the Remove button removes, for screen readers: "message posted Sat 26 Sep". */
export function removeMessageName(createdAt: Instant): string {
  return `message posted ${formatDay(createdAt)}`
}
