import type { SlotCheck } from '@/entities/slot'
import { clashMessage } from '@/entities/slot'
import { messageFor } from '@/shared/config/messages'

import { FIRST_WEEK_ONLY, PAST_WARNING } from '../model/copy'

type CheckLineProps = {
  /** The live check is asking about the latest input ("Checking…"). */
  checking: boolean
  /** Its answer for the latest input, once in. */
  answer: SlotCheck | undefined
  /** It failed (the network); the database still checks when booking. */
  error: unknown
  /** "Repeat weekly" is on: the answer covers the first week only. */
  repeating: boolean
  /** The start has passed (the lesson will count as used). */
  past: boolean
  /** settings.travel_gap_minutes, for the gap messages. */
  gapMinutes: number | null
  /**
   * `coach_book` refused this input: its words, above the buttons, are the newer answer, so
   * the live check says nothing more until the input changes (only the past warning stays).
   * Its late answers then can't push the refusal out of view either.
   */
  refused?: boolean
}

/**
 * The live clash reason (DESIGN §4; the Schedule spec §6.4): "Checking…" while
 * `coach_slot_check` runs, the reason in orange when the first week clashes (the coach's
 * words, DESIGN §6), "Only the first week is checked now…" whenever "Repeat weekly" is on
 * (after the reason, which covers the first week only), and a warning for a start that has
 * passed. A polite live region, so the answer is read out; while it has nothing to say it
 * takes no room.
 */
export function CheckLine({
  checking,
  answer,
  error,
  repeating,
  past,
  gapMinutes,
  refused = false,
}: CheckLineProps) {
  const options = { audience: 'coach' as const, gapMinutes }
  const live = !refused
  const reason = live && !checking && answer ? clashMessage(answer, options) : null
  return (
    <div aria-live="polite" className="flex flex-col gap-1 text-label leading-normal empty:-mt-4.5">
      {live && checking && <p className="text-muted">Checking…</p>}
      {live && !checking && error !== null && (
        <p className="text-warn">{messageFor(error, options)}</p>
      )}
      {reason !== null && <p className="text-warn">{reason}</p>}
      {live && repeating && <p className="text-muted">{FIRST_WEEK_ONLY}</p>}
      {past && <p className="text-warn">{PAST_WARNING}</p>}
    </div>
  )
}
