# Prompt 08: Coach schedule

## CONTEXT
Customer screens are done. Now Herman's main screen. Read DESIGN §4 (Coach: Schedule
and the dialogs "not drawn"), PRD BR-17, BR-18, BR-28 to BR-31, BR-36, TECH_SPEC §5.1
(`coach_week`), §5.2 (`coach_book`, `cancel_booking`, `excuse_booking`), §5.4, and
`design/AdminSchedule.dc.html`.

## DIAGNOSE
1. Log in as `herman` and confirm `coach_week`, `coach_book`, `add_exception`,
   `post_announcement` work through the API.
2. Confirm customers get errors calling them.
3. Decide how the week grid maps minutes to pixels (56 px per hour, 7 am start) and
   how lessons outside 7 am–10 pm are handled (extend the grid when needed).

## TASK
1. Layout: sidebar; header with "Schedule" and actions (Block time, Open extra time,
   Add booking); week navigation with "Today"; legend; right panel.
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
     waiting for approval (Approve button).
   - Message all customers: textarea, "Pin as a banner until I remove it", "Send to all
     customers" → `post_announcement`. List the current pinned message with "Remove".
4. Lesson details (click a block): group, members, location, package position, balance,
   actions Cancel lesson (confirm: "The lesson goes back to their package and the
   customer is emailed") and Mark as excused (for past lessons).
5. Dialogs:
   - Block time: date (or from/to dates), from/to time, note → `add_exception('closed')`.
     Warn if existing lessons fall inside ("These lessons stay booked: …").
   - Open extra time: one date, from/to, note → `add_exception('open')`. Blocked time
     wins over extra time, so warn if the range falls inside a block.
   - Both dialogs offer times in whole start steps from the hour (:00 and :30 with a
     30-minute step): starts count from each window's start, so 3:10 pm would shift
     that evening's times (prompt 04).
   - Add booking: group search (by student or account name), date, start, length,
     repeat weeks, toggles "Outside open hours" and "Skip travel gap" (each with a
     warning), live clash reason from `coach_slot_check` (prompt 04; `slot_check` has
     no grant) → `coach_book`.
   - Exceptions list for the visible week with Remove.

## VALIDATION
- Seed week renders like `design/AdminSchedule.dc.html` (Kai's Friday lesson shows
  "Gap override", no travel block between Wei Jie and Kai).
- Today panel for Sat 26 Sep lists Ethan 9:00 am (done), Aiman & Sofia 5:00 pm, Hana
  7:30 pm with "Unpaid, collect today": a component test fed `coach_week` output taken at
  the pinned clock (the API always runs at the real time), or by hand on the shifted
  Saturday.
- Opening extra time on a date makes those starts appear for customers on that date only;
  blocking time removes them; neither changes the weekly template.
- Coach adds a booking outside open hours after confirming; overlapping an existing
  lesson is still refused.
- Coach cancels a lesson: status cancelled, customer email queued, balance restored.
- Broadcast creates the banner for customers and queues one email per approved customer.
- HANDOFF.md updated.
