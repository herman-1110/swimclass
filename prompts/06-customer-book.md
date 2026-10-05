# Prompt 06: Customer "Book a lesson" screen

## CONTEXT
Customers can log in (prompt 05) and the database can answer every slot question
(prompts 03–04). Build the main customer screen. Read DESIGN §3 (components), §4
(Book a lesson), §5 (responsive), §6 (messages), PRD BR-7 to BR-13, BR-21, BR-22,
ARCHITECTURE §3.4 (how the Book screen's files fit together), and look at
`design/Main.dc.html` and `design/MainDesktop.dc.html` (and `design/screens/` if Herman
added screenshots).

## DIAGNOSE
1. Confirm you can log in as `meiling` locally and that `week_slots`, `group_details`,
   `group_balance` and `get_public_settings` return data for her.
2. List the components that already exist; plan which to create and where (DESIGN §3,
   ARCHITECTURE §3): `shared/ui` Segmented, OptionRow, DayStrip, Chip, SegmentBar, Tag;
   entities `group` (GroupPicker), `balance` (PackageSummary), `slot` (TimeChipGrid);
   feature `book-lesson` (BookingSummary).
3. Confirm how today's MYT date and the current week start will be computed.

## TASK
1. Data hooks (TanStack Query): `usePublicSettings` (`get_public_settings` returns one
   row, TECH_SPEC §5.4: `.single()` gives it as an object), `useMyGroups` (group_details
   for the account, active only), `useGroupBalance`, `useWeekSlots(weekStart, minutes,
   groupId)` (TECH_SPEC §5.1: every start with ok/reason/detail; times inside `detail` are
   MYT text), `useLatestAnnouncement`. The `{gap}` in gap messages comes from
   `get_public_settings().travel_gap_minutes`.
2. Screen layout exactly as DESIGN §4 "Book a lesson", top to bottom, including the
   coach banner, group option rows with type tags, package status and bar, next-package
   note, day strip with dots and week navigation (this week plus `booking_window_weeks`
   more: the window ends on a Sunday, TECH_SPEC §5.1), 1/2-hour segmented control from
   `lesson_lengths`, "Start time · <day>" with "See the week" link, "Already booked this
   day" line, Morning/Evening chip groups (5 per row), help text, sticky footer.
3. Default selection: first group; today's week (or next week if today's week has no
   future open time); first day with free times; no time picked.
4. Tapping a free chip selects it; tapping a crossed-out chip shows "<time> isn't
   available" and the reason (DESIGN §6) in the footer, and disables Book.
5. Repeat weekly: the number of weeks N is the smaller of what balance plus credit allows
   (`group_balance.can_still_book` divided by the lessons per booking, 1 or 2, rounded
   down) and how many weekly dates, starting with the chosen day, fall on or before the
   last bookable day (the Sunday `booking_window_weeks` after this MYT week, TECH_SPEC
   §5.1; a week past it clashes with `outside_window`, so the whole booking fails). N
   changes with the group, day and length. Show the checkbox only if N > 1; label "Repeat
   weekly: also book Tue 6 Oct" for two weeks, "Repeat weekly for N weeks" otherwise.
   Server has the final say.
6. Book → `book_lesson` (returns the new booking ids in start order); on success show a
   confirmation panel (dates booked, package effect, "Add to calendar" link as an .ics
   download is optional) and refetch slots and balance. Errors (TECH_SPEC §5.2):
   `error.message` is the code and `error.details` the detail as JSON text (null when
   there is none). A one-week booking that fails gives `slot_check`'s reason and detail,
   as `week_slots` shows them (the same message as a crossed-out chip); with several
   weeks, any clash gives `repeat_conflict` {`dates`, `clashes`}. Other codes:
   `credit_exceeded` {`needed`, `can_still_book`}, `group_inactive`, `invalid_repeat`
   (1–52 weeks), `invalid_length`, `not_your_group`, `not_approved`. Map each code to its
   DESIGN §6 message in `src/shared/config/messages.ts` (a generic one for codes it
   doesn't list); `repeat_conflict` lists the dates.
7. Empty states from DESIGN §6. Loading skeletons that keep layout stable.
8. Deep link support: `/book?day=2026-09-29&group=<id>` (used by the Schedule screen).
9. Accessibility: option rows are a radio group with a legend; chips are buttons with
   `aria-pressed` and `aria-label` ("7:00 pm, not available"); footer updates are
   announced politely (`aria-live="polite"`).

## VALIDATION
With the seed moved to next week (`supabase/scripts/shift-seed.sql`, see TECH_SPEC §10),
the dates below shift by the same number of weeks; the times and messages stay the same:
- Tue 29 Sep, 1 hour: free chips 7:30, 8:00, 8:30, 9:00 pm; 5:30–7:00 pm crossed out;
  tapping 7:00 pm shows "It starts too soon after the lesson that ends at 6:30 pm. Your
  coach needs 1 hour to travel between lessons."
- 2 hours: Tuesday 7:30 and 8:00 pm; Thursday shows "This day is fully booked…".
- Selecting "Sofia" shows "New bookings start Package 3…". For Tue 7:30 pm the summary
  says "uses 1 lesson from Package 2 · Package 3 isn’t paid yet": the ledger numbers
  lessons by start time, so Tuesday takes Package 2's last lesson and her Sunday lesson
  moves into Package 3 (TECH_SPEC §10; Herman's answer to triage 1–2, HANDOFF v0.10).
- Booking 7:30 pm for Aiman & Sofia succeeds; the chip becomes crossed out with
  "overlaps Aiman & Sofia's lesson".
- Screen matches `design/Main.dc.html` at 390 px and `design/MainDesktop.dc.html` at
  1280 px (spacing, colours, type sizes), with no sideways scrolling at DESIGN §5's
  widths; keyboard-only booking works; Lighthouse accessibility score ≥ 95.
- Unit tests: reason-code messages, repeat-weeks label, week-start calculation.
- HANDOFF.md updated.
