# Prompt 10: Coach settings

## CONTEXT
All main screens work. Now Herman can change every rule himself. Read DESIGN §4
(Settings), PRD §7 (settings and defaults), BR-29, TECH_SPEC §3 (`settings`,
`availability_rules`), §5.4, and `design/AdminSettings.dc.html`.

## DIAGNOSE
1. Confirm `update_settings` and `set_open_hours` exist and validate input; list any
   setting in PRD §7 that isn't a column yet.
2. Confirm the availability engine reads every value from `settings` (no hard-coded
   60, 30, 6, 4). Grep the SQL and the frontend for these literals and report them.

## TASK
1. Page layout as the design: two columns of framed sections with "Save changes" at
   the top right (disabled until something changes; warn when leaving with unsaved
   changes).
2. **Open hours** table: Day, Hours (range chips), Edit. Edit opens a small dialog to
   add, change or remove ranges for that weekday (validate: end after start, no overlap
   between ranges of the same day, inside 5:00 am–11:00 pm). The database checks the
   first two; 5:00 am–11:00 pm is a form rule only (the database accepts any range up
   to 24:00). `set_open_hours` replaces the whole week, so Save sends every weekday's
   ranges, not only the edited day's.
3. **Booking rules**: travel gap (minutes), lesson lengths (1 hour, 2 hours), students
   per lesson (up to 3/2/1), start times (every 15/30/60 min; the
   design's "On the hour" option must read "Every hour": starts count from the start of
   each open window, so a 5:30 pm window gives 5:30, 6:30…, BR-8), cancel or reschedule
   (hours), booking window (weeks), approve new accounts.
4. **Packages & payments**: lessons per package, package prices per type (RM, stored
   as cents), unpaid packages allowed, lesson expiry (never / 3 / 6 months; BR-24 leaves
   it off and no expiry rule is specified, so nothing applies `lesson_expiry_months` yet:
   show the control disabled with "Not available yet" unless Herman defines the rule),
   payment instructions (multi-line, up to 2000 characters; shown to customers), online
   payments "Not connected" (disabled placeholder for later).
5. **Reminders & emails**: customer reminder time, coach digest time (both MYT and
   before 24:00: the database refuses "24:00", which the clock never reaches), late-change
   alert, booking confirmations, coach email.
6. Helpful notes under risky changes, for example "Changing the travel gap affects
   times shown to customers straight away. Existing lessons stay booked."
7. Save: `set_open_hours` first (when the hours changed), then
   `update_settings(p_settings)` with only the changed columns (never `id` or
   `updated_at`: `unknown_setting` {`keys`}), each as its JSON type (numbers, booleans,
   `lesson_lengths` as an array, times as "20:00", null to empty a price or the payment
   instructions). It returns the saved row, which the form then shows.
   `invalid_setting` {`field`} names the field to highlight; `set_open_hours` names the
   range (`invalid_range` {`index`}, counting from 1 in the list sent) or the day
   (`overlapping_rules` {`weekday`}). They are two calls and two transactions: when
   `update_settings` fails after `set_open_hours` succeeded, say the open hours were
   saved and the other changes weren't. When both succeed, show "Settings saved".

## VALIDATION
- Changing the travel gap to 30 minutes on the dev project immediately changes the
  free times on Book (Tue 29 Sep, 1 hour: 7:00 pm becomes free); set it back to 60.
- Changing Saturday hours to start at 8:00 am removes the 7:00 am start that Saturday.
- Invalid input (end before start, gap 500) is refused by the database, not only by
  the form.
- A customer can't call `update_settings` (test).
- `tests/db/settings.test.ts` (prompt 04) already checks the database side of these four;
  check them through the page too.
- Grep shows no hard-coded business numbers left in SQL or TypeScript.
- HANDOFF.md updated.
