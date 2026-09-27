# Swim Class Booking: Design

Version 1.0 · 27 Sep 2026 · Approved screens: `design/` (and the canvas:
https://claude.ai/artifact/JMw6rX6wvskLtiwtLefZZ6).

## 1. Look
Quiet and minimal so the schedule and the numbers stand out: white background, one
typeface, one blue accent, hairline dividers instead of boxes. Orange appears only for
things that need attention (unpaid, clashes, last lesson). Tables are the exception:
they sit in a light frame with a tinted header and alternating rows so they scan easily.

## 2. Tokens
Put these in `src/index.css` as CSS variables and expose them to Tailwind v4 via `@theme`.

| Token | Value | Use |
|---|---|---|
| --ink | #14212B | main text |
| --muted | #5F6B73 | secondary text (5.4:1 on white) |
| --accent | #0B5E7A | primary buttons, selected states, links, lesson blocks |
| --accent-hover | #084A61 | hover/pressed |
| --accent-soft | #EAF3F6 | selected option background, selected table row |
| --accent-tint | #E3EFF3 | Paid pill, open-hour chips |
| --on-accent-muted | #CFE4EB | secondary text on accent blocks |
| --warn | #9A3412 | unpaid, clash, last-lesson text |
| --warn-tint | #FBE7DA | Unpaid pill, selected clashing time |
| --line | #ECECE9 | dividers |
| --line-row | #E6E6E2 | table row dividers |
| --frame | #E2E2DE | table and settings frames |
| --field | #D8D8D4 | input and chip borders |
| --subtle | #F6F6F4 | banners, segmented control track, crossed-out chips |
| --table-head | #F4F5F3 | table header row |
| --zebra | #FAFAF8 | alternate table rows |
| --travel | #F5D9C4 | travel-gap blocks |
| --closed | #F0F0ED | closed blocks |
| --booked-other | #9AA5AD | other people's lessons in the customer schedule |
| --seg-booked | #A9CFDB | booked lessons in package bars |
| --seg-free | #ECECE9 | unused lessons in package bars |
| --tag | #F1F1EE / text #3F4A52 | 1-to-1 / 1-to-2 / 1-to-3 tags |

- Font: Figtree 400, 500, 600 (self-host with `@fontsource/figtree`). No second typeface.
- Type scale: page title 24 px (phone) / 26 px (desktop) 600; section label 13 px 500 muted;
  body 14–15 px; small 12 px; table header 12 px 600.
- Radius: 10 px buttons and inputs, 8 px small controls, 12 px frames, 6 px calendar blocks,
  999 px pills.
- Spacing: 8 px grid; phone side padding 20 px; desktop page padding 32–40 px.

## 3. Components
- **Button**: primary (accent fill, white text, 46–52 px tall); quiet (text only, accent
  or ink); disabled (#ECECE9 fill, muted text). Label says the action.
- **Segmented control**: track `--subtle`, selected segment white with `--line` border.
  Used for 1 hour / 2 hours and lesson type.
- **Option row** (radio): 48 px, border `--field`; selected border accent and
  `--accent-soft` background; name left, type tag right.
- **Day strip**: 7 buttons; weekday small, date in a 36 px circle (accent when selected);
  a 4 px accent dot means free times exist. `aria-label` like "Tue 29 Sep, 4 free start times".
- **Time chip**: 44 px, 5 per row on phones. Free: white, `--field` border. Selected:
  accent fill. Clashing: `--subtle` fill, muted text, line-through. Clashing and
  selected: `--warn-tint` fill, `--warn` border and text.
- **Package bar**: 4 segments (lessons per package), 4 px tall (6 px in tables):
  used accent, booked `--seg-booked`, free `--seg-free`. Always paired with text
  ("0 used · 2 booked · 2 left to book").
- **Tag**: small neutral pill for 1-to-1 / 1-to-2 / 1-to-3. **Status pill**: Paid
  (`--accent-tint` / accent), Unpaid (`--warn-tint` / `--warn`).
- **Table**: 1 px `--frame` border, radius 12, header `--table-head`, zebra rows,
  row divider `--line-row`, selected row `--accent-soft`.
- **Dialog / side panel**: white, radius 12, focus trapped, Esc closes.
- **Tab bar (customer)**: Book, Schedule, My classes, Account; icons 22 px stroke 1.6;
  active in accent.
- **Sidebar (coach)**: text-only links: Schedule, Students & payments, Settings;
  "View as customer" at the bottom.

## 4. Screens
File names refer to `design/`.

### Customer (phone, 390 px)
**Log in** (`Login.dc.html`): name of the business, "Welcome back", username,
password, Log in, "Forgot username or password?", "New here? Create an account",
note that the coach approves new accounts.

**Sign up / Forgot / Reset / Waiting for approval** (not drawn): same style as Log in.
Sign up checks the username as they type ("That username is taken").

**Book a lesson** (`Main.dc.html`, the interactive reference; its script block is the
reference algorithm for slots and messages):
1. Greeting and title; coach banner (latest pinned announcement) in `--subtle`.
2. "Who's this lesson for?": option rows for the account's active groups, each with
   its type tag. Help text: "Your coach sets up who books together."
3. Package status for the selected group: "1-to-2 · Package 4", Paid/Unpaid, bar,
   "0 used · 2 booked · 2 left to book". If none left: orange "New bookings start
   Package 3. Pay RM [price] before or at its first lesson."
4. Day strip for the week, with previous/next week.
5. 1 hour / 2 hours (from settings).
6. "Start time · Tue 29 Sep" and "See the week" link. "Already booked this day: …" when
   the account has a lesson that day. Morning and Evening groups of time chips showing
   every start time; clashing ones crossed out. Help text under the chips.
7. Sticky footer: summary ("Tue 29 Sep · 7:30–8:30 pm" / "1-to-2 for Aiman & Sofia ·
   uses 1 lesson from Package 4, 1 left to book after this"), "Repeat weekly: also book
   Tue 6 Oct" checkbox when balance allows, primary button "Book 7:30 pm for Aiman &
   Sofia", note "Free to cancel or reschedule up to 6 hours before."
   Tapping a crossed-out time shows "7:00 pm isn't available" with the reason in
   orange and disables the button ("Pick a free time").
8. After booking: success state with the lesson(s), and the chips refresh.

**Schedule** (`Schedule.dc.html`): "Your coach's timetable", week navigation, legend
(Free, Booked, Travel, Yours, Closed), grid 7 am–10 pm in 30-minute rows. Other lessons
are "Booked" without names. Tapping a day header opens Book on that day.

**My classes** (`MyClasses.dc.html`): Upcoming list (date/time, group and type,
"lesson 2 of 4", location; Cancel with the deadline text, or "Locked" with the reason).
Cancel asks for confirmation. Packages list per group (tag, bar, paid date and method,
next-package note with payment instructions). "Past lessons and receipts" link.

**Account** (not drawn): name, phone, email, change password, log out.

### Coach (desktop, 1280 px and up)
**Schedule** (`AdminSchedule.dc.html`): title and actions (Block time, Open extra time,
Add booking); week navigation and legend; week grid 7 am–10 pm (56 px per hour) with
lesson blocks (name(s), time, type and location), travel blocks, closed blocks, and a
"Gap override" note where used. Right panel: Today (time, group, location, lesson
number, unpaid warning), Needs attention (unpaid with "Record payment", last lesson,
accounts waiting for approval), Message all customers (textarea, "Pin as a banner until
I remove it", "Send to all customers"). Clicking a lesson opens details: group,
package position, balance, Cancel lesson (lesson goes back to the package, customer is
emailed), Mark as excused.

Not drawn: **Block time** dialog (date or date range, from/to time, note);
**Open extra time** dialog (date, from/to, note); **Add booking** dialog (group
search, date, start, length, repeat weeks, "Outside open hours" and "Skip travel gap"
toggles with a warning, and the clash reason if any).

**Students & payments** (`AdminStudents.dc.html`): title, search, "Add students";
three figures (Unpaid, On last lesson, Students · packages); filter tabs (All, Unpaid,
Last lesson, Paid, Waiting for approval); table, one row per group package: Students
(names, account, location), Type, Package (number, bar, counts), Status (pill plus
note), Last paid (date, method), Action (Record payment for unpaid, History otherwise).
Right panel: Record payment (package, amount prefilled from the type's price, paid by,
date, note, Save payment), Add a free lesson, Excuse a missed lesson.

**Add students** (`AdminAddStudents.dc.html`): account (existing or "Create a new
account…" which opens name, username, email, phone), lesson type segmented control,
1–3 student name fields (or pick existing students of that account), pool location,
"First package already paid", advanced "Starting balance" (lessons already used /
paid), preview of what the customer will see, "Add 3 students".

**Settings** (`AdminSettings.dc.html`): open hours table (day, time-range chips, Edit),
booking rules (travel gap, lesson lengths, students per lesson, start times, cancel
cutoff, booking window, approve new accounts), packages & payments (lessons per
package, price per type, unpaid packages allowed, lesson expiry, payment
instructions), reminders & emails (customer reminder time, coach digest time,
late-change alert, booking confirmations). "Save changes" at the top.

## 5. Responsive and accessibility
- Customer screens: 360–430 px phones first; on wider screens centre a 480 px column.
- Coach screens: 1280 px+; at tablet widths the right panel moves below the grid.
- WCAG AA contrast (tokens above pass on their intended backgrounds).
- Every input has a label; icon-only buttons have `aria-label`; the week grids have a
  text alternative (the Book screen lists the same times).
- 44 px touch targets; visible focus ring (2 px accent outline, 2 px offset).
- Respect `prefers-reduced-motion`; motion only for dialogs opening and state changes.

## 6. Copy
Sentence case, plain words, no exclamation marks. Buttons name the action and keep the
same name through the flow ("Save payment" → "Payment saved").

Reason codes (from the database) → messages. `{gap}` is formatted from settings
("1 hour", "90 minutes"); times as "7:30 pm", ranges as "5:30–6:30 pm".
| Code | Message |
|---|---|
| overlap_mine | It overlaps {names}'s lesson at {range}. |
| overlap_other | It overlaps another lesson at {range}. |
| gap_after | It starts too soon after the lesson that ends at {time}. Your coach needs {gap} to travel between lessons. |
| gap_before | It ends too close to the {time} lesson. Your coach needs {gap} to travel between lessons. |
| outside_open_hours | Your coach isn't available at that time. |
| outside_window | You can book up to {weeks} weeks ahead. |
| past | This time has already started. |
| credit_exceeded | Pay for the current package before booking more lessons. |
| repeat_conflict | These weeks clash: {dates}. Nothing was booked. Try another time or turn off repeat. |
| locked | It's less than {cutoff} hours before the lesson, so it can't be cancelled. |
| not_approved | Your coach hasn't approved your account yet. |
| invalid_login | Wrong username or password. |
| too_many_attempts | Too many tries. Wait 15 minutes and try again. |
| (network) | Couldn't reach the server. Check your connection and try again. |

Empty states: no groups yet → "Your coach hasn't set up your lessons yet. Message your
coach to get started." No times this day → "This day is fully booked. Try another day."

## 7. Using the reference files
The files in `design/` come from the design canvas. They are plain HTML with inline
styles, so exact colours, sizes and spacing can be read straight from them. Template
parts are not React: `{{name}}` is data, `<sc-for list="{{items}}" as="x">` is a loop,
`<sc-if value="{{flag}}">` is a condition, and `support.js` / `<x-dc>` belong to the
design tool. Ignore those; build the screens as normal React components.
`Main.dc.html` contains a working JavaScript version of the slot and clash logic. Use it
to understand the behaviour, but the real logic lives in SQL (TECH_SPEC §5.1).

For pictures, open the canvas link above and save a screenshot of each screen into
`design/screens/` (same names, `.png`). Claude Code can look at them.
