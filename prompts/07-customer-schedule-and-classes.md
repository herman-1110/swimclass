# Prompt 07: Customer Schedule, My classes and Account

## CONTEXT
Book a lesson works (prompt 06). Now the other customer tabs. Read DESIGN §4
(Schedule, My classes, Account), PRD BR-15, BR-16, BR-22, BR-26, BR-27, and look at
`design/Schedule.dc.html` and `design/MyClasses.dc.html`.

## DIAGNOSE
1. Confirm `week_busy`, `cancel_booking`, `group_balance` and `booking_ledger` work for
   `meiling` through the API (not just in tests).
2. Check which shared components from prompt 06 can be reused (PackageBar, Tag,
   Dialog). List the new ones needed (WeekGrid, LessonRow, ConfirmDialog).

## TASK
1. **Schedule** (`/schedule`): week navigation (previous/next, can't go past the
   booking window: this week plus `booking_window_weeks` more), legend, grid 7 am–10 pm
   in 30-minute rows (extend it when `week_busy` has open time or lessons outside those
   hours) with blocks for closed, travel, booked (others, no names), yours (accent,
   "You"), free = empty. Data: `week_busy` (TECH_SPEC §5.1); closed = time outside
   `open`; travel = `travel_before`/`travel_after` minutes next to each lesson, drawn only
   inside open time (as `design/Schedule.dc.html`). Day headers
   link to `/book?day=...`. Text alternative: a visually hidden list per day ("Tue 29
   Sep: free 7:30 pm to 10 pm"), and the note "Other students' lessons show as Booked".
2. **My classes** (`/classes`):
   - Upcoming list from the account's bookings (status booked, ends after now), sorted.
     Each row: day and time, group names and type, "lesson N of 4" from
     `booking_ledger`, location. Right side: "Cancel" if before the cutoff (with
     "Free to cancel until 3:00 am, Sat 3 Oct": the start minus `cancel_cutoff_hours`
     from `get_public_settings`) or "Locked" with the reason (DESIGN §6 `locked`, whose
     `{cutoff}` is the same setting).
   - Cancel opens a confirm dialog ("Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia?
     The lesson goes back to your package.") → `cancel_booking(p_booking_id)` (`p_reason`
     is optional) → refresh. The server decides, whatever the screen shows. Errors:
     `locked` {`cutoff_at`} (the deadline as MYT text) once the cutoff has passed,
     `not_booked` {`status`} (for example the coach already cancelled it: refresh),
     `not_your_booking`.
   - Packages: one block per active group: names + type tag, paid date and method,
     bar, "Package 2 · 3 used · 1 booked · fully booked". When the package is used up or
     unpaid, show the orange note and `payment_instructions` ("Pay RM [price] by bank
     transfer to …"). No online payment button yet.
   - "Past lessons" section (collapsed): last 20 lessons with status (done, cancelled,
     excused).
3. **Account** (`/account`): name and phone (editable), email (read-only), change
   password, log out.
4. Show the coach's pinned announcement at the top of Schedule and My classes too.

## VALIDATION
- Seed week as meiling: Schedule shows her two lessons as "You" (Sat 9:00 am, Sun
  5:00 pm), everyone else as Booked, travel blocks as in `design/Schedule.dc.html` (only
  inside open time, none between Wei Jie and Kai on Fri 2 Oct), and closed
  weekday daytimes. The API response contains no other customer's name (check the
  network tab and add a test on the JSON).
- Cancel within the cutoff works and the time reappears as free on Book; after the
  cutoff the row shows Locked and the API refuses (`locked`) even if called directly.
- Packages match `group_balance` for both of meiling's groups (the TECH_SPEC §10 table
  only on the shifted Saturday 10:00–18:00 MYT; see §10).
- Screens match the designs at 390 px; keyboard and screen-reader labels checked.
- HANDOFF.md updated.
