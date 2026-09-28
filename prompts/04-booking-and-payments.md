# Prompt 04: Booking, cancelling, packages and payments

## CONTEXT
The availability engine exists (prompt 03). Now the functions that change data.
Read PRD BR-10, BR-13 to BR-26, BR-29 to BR-31, BR-34, BR-35 and TECH_SPEC §5.1 (what
`slot_check` already does), §5.2, §5.3, §5.4, §8
(only the outbox rows; sending comes in prompt 11).

## DIAGNOSE
1. Confirm prompt 03 tests pass.
2. Confirm `email_outbox` exists and customers can't read it.
3. Explain, before coding, how you will stop two simultaneous bookings from both
   succeeding (advisory lock per MYT date + the exclusion constraint as a backstop).

## TASK
1. `book_lesson(p_group_id, p_starts_at, p_minutes, p_repeat_weeks)`:
   approved, owns the group, group active; lock the group row, then the affected dates
   in sorted order (every MYT date within the travel gap of each week's lesson: the gap
   check crosses midnight, TECH_SPEC §5.2);
   `slot_check` each week with the caller as viewer (all-or-nothing → `repeat_conflict`
   with `detail.dates`);
   credit check against `can_still_book` (`credit_exceeded`); insert with a shared
   `series_id` and the group's location; queue the confirmation email and, if within
   24 h, the coach's late alert. Return the new ids.
2. `coach_book(...)`: coach only; options to ignore open hours, skip the travel gap
   (sets `gap_override`), ignore credit. Overlaps still refused. `slot_check` stops at
   the first failure, so give it the coach's options first (drop and recreate it in a
   new migration with extra parameters that default to the customer rules; ask Herman
   whether the coach may book in the past or beyond the booking window), and add
   `coach_slot_check(p_group_id, p_starts_at, p_minutes, p_ignore_open_hours,
   p_gap_override)` for the Add booking dialog's live clash reason (prompt 08): coach
   only, granted to `authenticated`. `slot_check` itself keeps no grant.
3. `cancel_booking(p_booking_id, p_reason)`: owner before the cutoff, else
   `locked`; coach any time. Queue the cancellation email (wording differs if the coach
   cancelled) and the late alert when within 24 h.
4. `excuse_booking(p_booking_id)`: coach only.
5. `record_payment(...)` and `add_free_lesson(...)`: coach only; validate lessons > 0,
   amount >= 0; default amount comes from the group type's price in settings.
6. `create_group(...)`, `update_group(...)`, `set_group_active(...)`,
   `approve_account(...)`, `username_available(...)` as TECH_SPEC §5.3.
7. Email templates as SQL helper functions returning subject/text/html for each kind
   (booked, cancelled, late_alert). Keep them short and plain; see PRD BR-32 to BR-35.
8. The TECH_SPEC §5.4 functions, which prompts 06, 08 and 10 use:
   `get_public_settings()` (including `travel_gap_minutes` for the `{gap}` in reason
   messages), and the coach's `set_open_hours`, `add_exception`, `remove_exception`,
   `update_settings`, `post_announcement`, `remove_announcement`, each validated (end
   after start; weekly ranges of one day don't overlap). Starts count from each window's
   start (BR-8), so an exception at 15:10 makes that evening's starts 15:10, 15:40, …;
   the database allows it, and prompt 08's dialogs offer times in whole steps from the
   hour (e.g. :00 and :30 with a 30-minute step) so the coach doesn't do it by accident.
9. Grants (new functions start with none, TECH_SPEC §6): grant to `authenticated` every
   RPC the browser calls: `book_lesson`, `cancel_booking`, `get_public_settings` and the
   coach's `coach_book`, `coach_slot_check`, `excuse_booking`, `record_payment`,
   `add_free_lesson`, `create_group`, `update_group`, `set_group_active`,
   `approve_account`, `set_open_hours`, `add_exception`, `remove_exception`,
   `update_settings`, `post_announcement`, `remove_announcement` (each coach-only one
   checks `is_coach()` first); anon gets only `username_available`; email helpers and
   internal functions get none. Update the grant list in `tests/db/rls.test.ts`, and in
   `tests/db/availability.test.ts` the grants test (new `slot_check` signature,
   `coach_slot_check` granted).

## VALIDATION
`tests/db/booking.test.ts` (clock `app.now = '2026-09-26 12:00+08'` unless stated):
- meiling books "Aiman & Sofia" Tue 29 Sep 19:30 for 60 min → success; the slot then
  shows `overlap_mine` for meiling and `overlap_other` for priya.
- meiling books "Sofia" Tue 29 Sep 19:30 (fresh transaction) → success; `group_balance`
  shows Package 3 and Unpaid for Sofia.
- Wei Jie can book one more lesson; a second one fails `credit_exceeded`. Two connections
  booking Wei Jie on two different dates at the same time → exactly one succeeds.
- herman successfully calls `coach_book`, `record_payment`, `create_group` and
  `approve_account`.
- Repeat weekly 3 weeks for a time that clashes in week 2 → `repeat_conflict`, no rows.
- Cancel Sat 3 Oct 09:00 with `app.now = '2026-10-03 02:59+08'` succeeds; with
  `'2026-10-03 03:01+08'` fails `locked`; the coach can cancel it at 03:01.
- The API cannot change the clock: calling `set_config('app.now', ...)` or any
  time-shifting through RPC is impossible for a customer (prove it with a test).
- Concurrency: two connections call `book_lesson` for the same slot at the same time
  (use two `pg` clients and `Promise.all`) → exactly one succeeds.
- An excused past lesson stops counting; a cancelled lesson frees its time.
- Outbox rows appear with the right `dedupe_key`s; booking inside 24 h also creates a
  `late:` row; nothing is queued twice for the same series.
- A customer calling `record_payment`, `coach_book`, `coach_slot_check` or `add_exception`
  gets an error; `get_public_settings` returns the travel gap and no private settings.
- The travel gap is serialised across midnight: with an open exception Sat 22:00–02:00
  and both times free, two connections book Sat 23:00 and Sun 00:00 at the same moment
  (`Promise.all`) → exactly one succeeds, the other fails `gap_after` or `gap_before`.
- HANDOFF.md updated.
