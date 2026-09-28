# Prompt 04: Booking, cancelling, packages and payments

## CONTEXT
The availability engine exists (prompt 03). Now the functions that change data.
Read PRD BR-10, BR-13 to BR-26, BR-31, BR-34, BR-35 and TECH_SPEC §5.2, §5.3, §8
(only the outbox rows; sending comes in prompt 11).

## DIAGNOSE
1. Confirm prompt 03 tests pass.
2. Confirm `email_outbox` exists and customers can't read it.
3. Explain, before coding, how you will stop two simultaneous bookings from both
   succeeding (advisory lock per MYT date + the exclusion constraint as a backstop).

## TASK
1. `book_lesson(p_group_id, p_starts_at, p_minutes, p_repeat_weeks)`:
   approved, owns the group, group active; lock the group row, then the affected dates
   in sorted order;
   `slot_check` each week (all-or-nothing → `repeat_conflict` with `detail.dates`);
   credit check against `can_still_book` (`credit_exceeded`); insert with a shared
   `series_id` and the group's location; queue the confirmation email and, if within
   24 h, the coach's late alert. Return the new ids.
2. `coach_book(...)`: coach only; options to ignore open hours, skip the travel gap
   (sets `gap_override`), ignore credit. Overlaps still refused.
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
8. Grants (new functions start with none, TECH_SPEC §6): grant to `authenticated` every
   RPC the browser calls: `book_lesson`, `cancel_booking` and the coach's `coach_book`,
   `excuse_booking`, `record_payment`, `add_free_lesson`, `create_group`, `update_group`,
   `set_group_active`, `approve_account` (each coach-only one checks `is_coach()` first);
   anon gets only `username_available`; email helpers and internal functions get none.

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
- A customer calling `record_payment` or `coach_book` gets an error.
- HANDOFF.md updated.
