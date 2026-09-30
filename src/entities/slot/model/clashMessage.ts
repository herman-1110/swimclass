import { type MessageOptions, reasonMessage } from '@/shared/config/messages'
import { formatTime } from '@/shared/lib/time'

import type { Slot, SlotCheck } from './types'

/**
 * Why a crossed-out start time can't be booked, in DESIGN §6's words through messages.ts
 * `reasonMessage`, or null when it is free. Book passes the settings its messages need,
 * `{ gapMinutes, windowWeeks }`; Add booking passes `{ audience: 'coach', gapMinutes }`
 * for a `coach_slot_check` answer. A reason without the detail it needs reads generic.
 */
export function clashMessage(check: SlotCheck, options?: MessageOptions): string | null {
  return check.ok ? null : reasonMessage(check.reason, check.detail, options)
}

/** Book's summary title for a crossed-out start time: "7:00 pm isn’t available" (DESIGN §4). */
export function unavailableTitle(slot: Pick<Slot, 'starts_at'>): string {
  return `${formatTime(slot.starts_at)} isn’t available`
}
