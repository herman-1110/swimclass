# Prompt 08: Coach schedule

## CONTEXT
Customer screens are done. Now Herman's main screen. Read DESIGN §4 (Coach: Schedule
and the dialogs "not drawn"), PRD BR-17, BR-18, BR-28 to BR-31, BR-36, TECH_SPEC §5.1
(`coach_week`), §5.2 (`coach_book`, `coach_slot_check`, `cancel_booking`,
`excuse_booking`), §5.4, §8 (who is emailed), DESIGN §5 (responsive), and
`design/AdminSchedule.dc.html` (computer) and `design/AdminSchedulePhone.dc.html`.

## DIAGNOSE
1. Log in as `herman` and confirm `coach_week`, `coach_book`, `add_exception`,
   `post_announcement` work through the API. Run `npm run test:db` first: these calls
   change the dev database, and afterwards the database tests stop until Herman
   reloads it (`npx supabase db reset --linked`, DEV_SETUP §4). Post the test message
   with `p_send_email` false and remove it afterwards.
2. Confirm customers get errors calling them.
3. Decide how the week grid maps minutes to pixels (56 px per hour, 7 am start) and
   how lessons outside 7 am–10 pm are handled (extend the grid when needed).

## TASK
1. Layout: header with "Schedule" and actions (Block time, Open extra time,
   Add booking); week navigation with "Today"; legend; right panel. `CoachLayout`
   already gives the sidebar or tab bar. Across widths as DESIGN §5: on phones the day
   view with Today, Needs attention and Message below it; from 768 px the week grid; from
   1280 px the 320 px side column. `CoachLayout`'s `<main>` pads its content, so a side
   column that runs to the edge, as drawn, has to undo that padding.
2. Week grid: lessons (accent block: names, time, "1-to-2 · Palm Court" for groups,
   location for 1-to-1, "2 lessons" for 2-hour, "Gap override" note), travel blocks
   before/after each lesson (none on the side of an override partner), closed blocks,
   'open' exceptions shown as normal open time, cancelled lessons hidden (toggle
   "Show cancelled" optional). Data: `coach_week` (TECH_SPEC §5.1: open, closed,
   exceptions with notes, and lessons with travel minutes, package position and flags).
3. Right panel:
   - Today: each lesson with time, group, location, "lesson N of 4", and the orange
     "Unpaid, collect today" when the group is unpaid.
   - Needs attention: unpaid groups (Record payment → Students page with the panel
     open for that group), groups whose next lesson is their last paid one, accounts
     waiting for approval (Approve button → `approve_account`).
   - Message all customers: textarea (up to 1000 characters), "Pin as a banner until I
     remove it" (checkbox → `p_pinned`), "Send to all customers" (the button;
     `p_send_email` true) → `post_announcement(p_message, p_send_email, p_pinned)`. It
     emails every approved customer whose address is confirmed or was entered by the
     coach (invited). List every pinned message not yet removed, newest first, each
     with "Remove" → `remove_announcement` (customers see the newest, so removing it
     shows the one before it again; emails already queued still go out).
4. Lesson details (click a block): group, members, location, package position, balance,
   actions Cancel lesson (confirm: "The lesson goes back to their package and the
   customer is emailed", with an optional reason of up to 500 characters that goes in
   the customer's email → `cancel_booking(p_booking_id, p_reason)`; the coach gets no
   late alert for his own changes) and Mark as excused (only for lessons that have
   started → `excuse_booking`, which refuses a future lesson with `not_started`: cancel
   that instead).
5. Dialogs:
   - Block time: date (or from/to dates), from/to time, note → `add_exception('closed')`.
     An exception is one continuous range, so a date range is one call per date (the
     same times each day). Warn if existing lessons fall inside ("These lessons stay
     booked: …").
   - Open extra time: one date, from/to, note → `add_exception('open')`. Blocked time
     wins over extra time, so warn if the range falls inside a block.
   - Both dialogs offer times in whole start steps from the hour (:00 and :30 with a
     30-minute step): starts count from each window's start, so 3:10 pm would shift
     that evening's times (prompt 04).
   - Add booking: group search (by student or account name; active groups only:
     `coach_book` refuses others with `group_inactive`), date, start, length, repeat
     weeks (1–52: `invalid_repeat`; not limited by the booking window), toggles
     "Outside open hours" (`p_ignore_open_hours`; it also allows starts
     off the start step, at any whole minute) and "Skip travel gap" (`p_gap_override`;
     only the weeks that need it are marked `gap_override`), each with a warning, live
     clash reason from `coach_slot_check` (prompt 04; `slot_check` has no grant) →
     `coach_book`. Past dates (the lesson counts as used) and dates beyond the booking
     window are allowed (Herman, prompt 04). No email goes to the customer.
     `coach_slot_check` checks the first week only and not credit, so `coach_book` may
     still refuse with `repeat_conflict` {`dates`, `clashes`} (show the dates, each with
     its reason) or `credit_exceeded` {`needed`, `can_still_book`}: show "This group can
     book {can_still_book} more lessons before paying" (0 if negative) and a "Book
     anyway" button that retries with `p_ignore_credit` = true.
   - Exceptions list for the visible week with Remove (`remove_exception`).

## VALIDATION
- Seed week renders like `design/AdminSchedule.dc.html` at 1440 px and
  `design/AdminSchedulePhone.dc.html` at 390 px (Kai's Friday lesson shows
  "Gap override", no travel block between Wei Jie and Kai), with no sideways scrolling
  at DESIGN §5's widths.
- Today panel for Sat 26 Sep lists Ethan 9:00 am (done), Aiman & Sofia 5:00 pm, Hana
  7:30 pm with "Unpaid, collect today": a component test fed `coach_week` output taken at
  the pinned clock (the API always runs at the real time), or by hand on the shifted
  Saturday.
- Opening extra time on a date makes those starts appear for customers on that date only;
  blocking time removes them; neither changes the weekly template.
- Coach adds a booking outside open hours after confirming; overlapping an existing
  lesson is still refused. Booking past a group's credit shows how many lessons it can
  still book and succeeds with "Book anyway".
- Coach cancels a lesson: status cancelled, customer email queued (with the reason, if
  given; no late alert to the coach), balance restored.
- Broadcast creates the banner for customers and queues one email per approved customer
  whose address is confirmed or was entered by the coach.
- HANDOFF.md updated.
