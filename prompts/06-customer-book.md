# Prompt 06: Customer "Book a lesson" screen

## CONTEXT
Customers can log in (prompt 05) and the database can answer every slot question
(prompts 03–04). Build the main customer screen. Read DESIGN §3 (components), §4
(Book a lesson), §6 (messages), PRD BR-7 to BR-13, BR-21, BR-22, and look at
`design/Main.dc.html` (and `design/screens/Main.png` if Herman added screenshots).

## DIAGNOSE
1. Confirm you can log in as `meiling` locally and that `week_slots`, `group_details`,
   `group_balance` and `get_public_settings` return data for her.
2. List the shared components that already exist; plan which to create
   (Segmented, OptionRow, DayStrip, TimeChip, PackageBar, Tag, StickyFooter).
3. Confirm how today's MYT date and the current week start will be computed.

## TASK
1. Data hooks (TanStack Query): `usePublicSettings`, `useMyGroups` (group_details for
   the account, active only), `useGroupBalance`, `useWeekSlots(weekStart, minutes,
   groupId)`, `useLatestAnnouncement`.
2. Screen layout exactly as DESIGN §4 "Book a lesson", top to bottom, including the
   coach banner, group option rows with type tags, package status and bar, next-package
   note, day strip with dots and week navigation, 1/2-hour segmented control from
   `lesson_lengths`, "Start time · <day>" with "See the week" link, "Already booked this
   day" line, Morning/Evening chip groups (5 per row), help text, sticky footer.
3. Default selection: first group; today's week (or next week if today's week has no
   future open time); first day with free times; no time picked.
4. Tapping a free chip selects it; tapping a crossed-out chip shows "<time> isn't
   available" and the reason (DESIGN §6) in the footer, and disables Book.
5. Repeat weekly: show the checkbox only if the balance plus credit allows more than one
   week; label "Repeat weekly: also book Tue 6 Oct" for two weeks, "Repeat weekly for
   N weeks" otherwise. Server has the final say.
6. Book → `book_lesson`; on success show a confirmation panel (dates booked, package
   effect, "Add to calendar" link as an .ics download is optional) and refetch slots and
   balance. On error map the code to the DESIGN §6 message; `repeat_conflict` lists dates.
7. Empty states from DESIGN §6. Loading skeletons that keep layout stable.
8. Deep link support: `/book?day=2026-09-29&group=<id>` (used by the Schedule screen).
9. Accessibility: option rows are a radio group with a legend; chips are buttons with
   `aria-pressed` and `aria-label` ("7:00 pm, not available"); footer updates are
   announced politely (`aria-live="polite"`).

## VALIDATION
With the seed moved to next week (`supabase/snippets/shift-seed.sql`, see TECH_SPEC §10),
the dates below shift by the same number of weeks; the times and messages stay the same:
- Tue 29 Sep, 1 hour: free chips 7:30, 8:00, 8:30, 9:00 pm; 5:30–7:00 pm crossed out;
  tapping 7:00 pm shows "It starts too soon after the lesson that ends at 6:30 pm. Your
  coach needs 1 hour to travel between lessons."
- 2 hours: Tuesday 7:30 and 8:00 pm; Thursday shows "This day is fully booked…".
- Selecting "Sofia" shows "New bookings start Package 3…" and the summary says the
  lesson uses Package 3, not paid yet.
- Booking 7:30 pm for Aiman & Sofia succeeds; the chip becomes crossed out with
  "overlaps Aiman & Sofia's lesson".
- Screen matches `design/Main.dc.html` at 390 px (spacing, colours, type sizes);
  keyboard-only booking works; Lighthouse accessibility score ≥ 95.
- Unit tests: reason-code messages, repeat-weeks label, week-start calculation.
- HANDOFF.md updated.
