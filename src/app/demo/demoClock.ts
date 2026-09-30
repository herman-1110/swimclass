import { DEMO_NOW } from '@/shared/config/demo'
import { formatDay, formatTime, type Instant, toMyt } from '@/shared/lib/time'

/** "Sat 26 Sep 2026, 12:00 pm": when demo mode's clock stands still (DEMO_NOW), in MYT. */
export function demoClockText(now: Instant = DEMO_NOW): string {
  return `${formatDay(now)} ${toMyt(now).getFullYear()}, ${formatTime(now)}`
}

/** "Wed 30 Sep, 10:15 pm": when the demo sent an email (its real time), in MYT. */
export function sentAtText(sentAt: Instant): string {
  return `${formatDay(sentAt)}, ${formatTime(sentAt)}`
}
