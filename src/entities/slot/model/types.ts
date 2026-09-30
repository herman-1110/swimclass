import type { FunctionArgs } from '@/shared/api/rpc'
import type { DateKey } from '@/shared/lib/time'

/** A moment inside a JSON detail: MYT text, "2026-09-29T18:30:00+08:00" (data-contracts §2.5). */
type MytInstant = string

/** Why a start time can't be booked (TECH_SPEC §5.1 slot_check; DESIGN §6). */
export type ClashReason =
  | 'past'
  | 'outside_window'
  | 'invalid_length'
  | 'off_step'
  | 'outside_open_hours'
  | 'overlap_mine'
  | 'overlap_other'
  | 'gap_after'
  | 'gap_before'

/** What each reason's detail holds (data-contracts §3.11); every other reason has none. */
export type ClashDetail = {
  /** One of the viewer's own lessons: its time and its group's names. */
  overlap_mine: { starts_at: MytInstant; ends_at: MytInstant; names: string }
  /** Someone else's lesson (never their names). */
  overlap_other: { starts_at: MytInstant; ends_at: MytInstant }
  /** The lesson before ends too close: when it ends. */
  gap_after: { ends_at: MytInstant }
  /** The lesson after starts too close: when it starts. */
  gap_before: { starts_at: MytInstant }
}

/**
 * The answer for one start time: free, or crossed out with its reason and detail. The
 * generated types say `reason` is always a string; it is null on every free row
 * (data-contracts §6.1), as is `detail`.
 */
export type SlotCheck =
  | { ok: true; reason: null; detail: null }
  | {
      [R in ClashReason]: {
        ok: false
        reason: R
        detail: R extends keyof ClashDetail ? ClashDetail[R] : null
      }
    }[ClashReason]

/**
 * One start time from `week_slots` (TECH_SPEC §5.1): every start inside the open hours of
 * the week, crossed-out ones included (BR-12), in start order. `day` is the MYT date: group
 * by it, never by the UTC date of `starts_at`, which is UTC text such as
 * "2026-10-02T23:00:00+00:00" (Sat 3 Oct, 7:00 am). A week's rows can only be `past`,
 * `outside_window`, `overlap_mine`, `overlap_other`, `gap_after` or `gap_before`.
 */
export type Slot = { day: DateKey; starts_at: string } & SlotCheck

/**
 * `coach_slot_check`'s arguments (Add booking's live clash reason): the group, the start
 * as an ISO string with an offset (`mytInstant(date, '19:30').toISOString()`), the length
 * in minutes, and the dialog's "Outside open hours" and "Skip travel gap".
 */
export type CoachSlotCheckArgs = FunctionArgs<'coach_slot_check'>
