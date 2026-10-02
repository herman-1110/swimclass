# Swim Class Booking: Design

Version 1.2 · 29 Sep 2026 · Approved screens: `design/`, each drawn at phone and
computer width (and the canvas: https://claude.ai/artifact/JMw6rX6wvskLtiwtLefZZ6).
Every screen is responsive: §5 says how each one changes with the screen width.

## 1. Look
Quiet and minimal so the schedule and the numbers stand out: white background, one
typeface, one blue accent, hairline dividers instead of boxes. Orange appears only for
things that need attention (unpaid, clashes, last lesson). Tables are the exception:
they sit in a light frame with a tinted header and alternating rows so they scan easily.

## 2. Tokens
Put these in `src/app/styles/index.css` as CSS variables and expose them to Tailwind v4 via `@theme`.

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
| --seg-free-table | #E4E4E0 | unused lessons in the 6 px bars of the Students table and cards (#ECECE9 almost vanishes on the selected row) |
| --tag | #F1F1EE / text #3F4A52 | 1-to-1 / 1-to-2 / 1-to-3 tags |

- Font: Figtree 400, 500, 600 (self-host with `@fontsource/figtree`). No second typeface.
- Type scale: page title 24 px (customer) / 26 px (coach) / 28 px (log in) 600; section
  label 13 px 500 muted; body 14–15 px; small 12 px; table header 12 px 600. Sizes stay the same at
  every width; only the layout changes.
- Radius: 10 px buttons and inputs, 8 px small controls, 12 px frames, 6 px calendar blocks,
  999 px pills.
- Spacing: 8 px grid; page side padding 20 px on phones, 32 px from 768 px, 40–48 px
  from 1024 px.

## 3. Components
Where they live (ARCHITECTURE §3): generic pieces with no business words are in
`src/shared/ui/` (Button, Segmented, OptionRow, DayStrip, Chip, SegmentBar, Tag, Pill,
Table, Tabs, Dialog, SidePanel, WeekGrid). Business versions sit in their entity and use
them: `PackageSummary` (entity `balance`) uses SegmentBar, `TimeChipGrid` (entity `slot`)
uses Chip, `GroupPicker` (entity `group`) uses OptionRow. The tab bar and sidebar live in
`src/app/layouts/`.
- **Button**: primary (accent fill, white text, 46–52 px tall); quiet (text only, accent
  or ink); disabled (#ECECE9 fill, muted text). Label says the action.
- **Segmented control** (`Segmented`): track `--subtle`, selected segment white with `--line` border.
  Used for 1 hour / 2 hours and lesson type.
- **Option row** (`OptionRow`, a radio): 48 px, border `--field`; selected border accent and
  `--accent-soft` background; name left, type tag right.
- **Day strip** (`DayStrip`): 7 buttons; weekday small, date in a 36 px circle (accent when selected);
  a 4 px accent dot means free times exist. `aria-label` like "Tue 29 Sep, 4 free start times".
- **Time chip** (`Chip`): 44 px, 5 per row on phones. Free: white, `--field` border. Selected:
  accent fill. Clashing: `--subtle` fill, muted text, line-through. Clashing and
  selected: `--warn-tint` fill, `--warn` border and text.
- **Package bar** (`SegmentBar`): 4 segments (lessons per package), 4 px tall (6 px in tables):
  used accent, booked `--seg-booked`, free `--seg-free`. Always paired with text
  ("0 used · 2 booked · 2 left to book").
- **Tag** (`Tag`): small neutral pill for 1-to-1 / 1-to-2 / 1-to-3. **Status pill** (`Pill`): Paid
  (`--accent-tint` / accent), Unpaid (`--warn-tint` / `--warn`).
- **Table**: 1 px `--frame` border, radius 12, header `--table-head`, zebra rows,
  row divider `--line-row`, selected row `--accent-soft`. Where a table would be too
  cramped on a phone it becomes a list of cards with the same fields (§5).
- **Dialog** (`Dialog`): white, radius 12, focus trapped, Esc closes. On phones it
  opens full screen.
- **Side panel** (`SidePanel`), used for Record payment: from 1280 px it is a normal
  340 px column beside the content (no Close button). Below 1280 px it opens on demand
  as a modal: a 380 px drawer from the right (768–1279 px) or full screen (phones),
  with focus trapped, Esc and Close to shut it.
- **Navigation** (`src/app/layouts/`): below 1024 px a bottom tab bar, fixed to the
  bottom (4 items, icons 22 px stroke 1.6 with the label under, 52 px tall, active in
  accent, plus the phone's safe-area inset). From 1024 px a 220 px sidebar instead:
  business name at the top ("Swim Class", from settings; the drawings' "Swim Class
  Booking" is the old name), text links (current one on `--subtle`), "Signed in as …"
  at the bottom.
  - Customer: Book, Schedule, My classes, Account.
  - Coach: Schedule, Students & payments ("Students" in the tab bar), Settings, and
    View as customer ("Customer view" in the tab bar; at the bottom of the sidebar).

## 4. Screens
File names refer to `design/`. Each screen has two drawings of the same design: phone
(390 px wide) and computer (1280 px for customer screens, 1440 px for coach screens),
written below as phone / computer. What changes in between is in §5.

### Customer screens
**Log in** (`Login.dc.html` / `LoginDesktop.dc.html`): name of the business, "Welcome
back", username, password, Log in, "Forgot username or password?", "New here? Create an
account", note that the coach approves new accounts.

**Sign up / Forgot / Reset / Waiting for approval** (not drawn): same style as Log in.
Sign up checks the username as they type ("That username is taken").

**Book a lesson** (`Main.dc.html` / `MainDesktop.dc.html`, the interactive reference;
their script block is the reference algorithm for slots and messages):
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
7. Booking summary (a sticky footer on phones, a sticky card in the right column from
   768 px): summary ("Tue 29 Sep · 7:30–8:30 pm" / "1-to-2 for Aiman & Sofia ·
   uses 1 lesson from Package 4, 1 left to book after this"), "Repeat weekly: also book
   Tue 6 Oct" checkbox when balance and booking window allow, primary button "Book
   7:30 pm for Aiman & Sofia", note "Free to cancel or reschedule up to 6 hours before."
   Tapping a crossed-out time shows "7:00 pm isn't available" with the reason in
   orange and disables the button ("Pick a free time").
8. After booking: success state with the lesson(s), and the chips refresh.

**Schedule** (`Schedule.dc.html` / `ScheduleDesktop.dc.html`): "Your coach's
timetable", week navigation, legend (Free, Booked, Travel, Yours, Closed), grid
7 am–10 pm in 30-minute rows (longer when the week's open hours or lessons fall
outside it). Other lessons are "Booked" without names. Tapping a day
header opens Book on that day.

**My classes** (`MyClasses.dc.html` / `MyClassesDesktop.dc.html`): Upcoming list
(date/time, group and type, "lesson 2 of 4", location; Cancel with the deadline text,
or "Locked" with the reason). Cancel asks for confirmation. Packages list per group
(tag, bar, paid date and method, next-package note with payment instructions). "Past
lessons and receipts" link.

**Account** (not drawn): name, phone, email, change password, log out.

### Coach screens
The coach uses the same screens on a computer and on a phone (for example at the pool).

**Schedule** (`AdminSchedule.dc.html` computer / `AdminSchedulePhone.dc.html` phone):
title and actions (Block time, Open extra time, Add booking); week navigation and
legend; week grid 7 am–10 pm (56 px per hour; longer when the week's open hours or
lessons fall outside it) with lesson blocks (name(s), time, type
and location), travel blocks, closed blocks, and a "Gap override" note where used. On
phones the week grid becomes a day view: a day strip with the number of lessons under
each date, then the chosen day as a list of blocks (time on the left; lesson, travel,
free and closed blocks in the grid's colours). Side column: Today (time, group,
location, lesson number, unpaid warning), Needs attention (unpaid with "Record
payment", last lesson, accounts waiting for approval), Message all customers (textarea,
"Pin as a banner until I remove it", "Send to all customers"). Clicking a lesson opens
details: group, package position, balance, Cancel lesson (lesson goes back to the
package, customer is emailed; an optional reason, up to 500 characters, goes into the
email), Mark as excused (only once the lesson has started; a future lesson is cancelled
instead).

Not drawn: **Block time** dialog (date or date range, from/to time, note);
**Open extra time** dialog (date, from/to, note); **Add booking** dialog (group
search over active groups, date, start, length, repeat weeks, "Outside open hours" and
"Skip travel gap" toggles with a warning, and the clash reason if any). The coach may
pick a past date (the lesson counts as used) or one beyond the booking window, and
"Outside open hours" also allows a start between the usual start times. The clash
reason covers the first week only; with repeat weeks, any week that can't be booked is
listed with its reason and nothing is booked. When the group is past its credit, the
dialog says "This group can book 1 more lesson before paying" and offers "Book anyway".
No email goes to the customer.

**Students & payments** (`AdminStudents.dc.html` / `AdminStudentsPhone.dc.html`):
title, search, "Add students"; three figures (Unpaid, On last lesson, Students ·
packages); filter tabs (All, Unpaid, Last lesson, Paid, Waiting for approval); table,
one row per group package: Students (names, account, location), Type, Package
(number, bar, counts), Status (pill plus note), Last paid (date, method), Action
(Record payment for unpaid, History otherwise). On phones each row is a card with the
same fields and the action button. Record payment panel (`SidePanel`): package, amount
prefilled from the type's price, paid by, date, note, Save payment, Add a free lesson,
Excuse a missed lesson.

**Add students** (`AdminAddStudents.dc.html` / `AdminAddStudentsPhone.dc.html`):
account (existing or "Create a new account…" which opens name, username, email,
phone), lesson type segmented control, 1–3 student name fields (or pick existing
students of that account), pool location, "First package already paid", "Set a
starting balance" (lessons already used / paid), preview of what the customer will
see, "Add 3 students".

**Settings** (`AdminSettings.dc.html` / `AdminSettingsPhone.dc.html`): open hours table
(day, time-range chips, Edit), booking rules (travel gap, lesson lengths, students per
lesson, start times, cancel cutoff, booking window, approve new accounts), packages &
payments (lessons per package, price per type, unpaid packages allowed, lesson expiry
(shown disabled: nothing applies it yet),
payment instructions, online payments shown as "Not connected" for later), reminders
& emails (customer reminder time, coach digest time, late-change alert, booking
confirmations, your email). "Save changes" at the top; on phones a Save bar sits
above the tab bar.

## 5. Responsive and accessibility
Every screen, customer and coach, works at any width from 360 px (small phone) to
1920 px (large monitor): no sideways scrolling, no text cut off, every control
reachable. It is one website with one set of routes; the layout follows the window
width, never the device type. Build mobile-first: the plain classes are the phone
layout, and Tailwind's `md:`, `lg:` and `xl:` prefixes add the wider layouts.

| Width | Tailwind | What changes |
|---|---|---|
| under 768 px | (none) | Phone: one column, bottom tab bar, 20 px side padding |
| 768–1023 px | `md:` | Tablet: side columns appear where a screen has one; tables replace cards |
| 1024–1279 px | `lg:` | Small computer: the sidebar replaces the bottom tab bar |
| 1280 px and up | `xl:` | Computer: coach side panels sit beside the content |

Wide screens don't stretch the content: Book, Schedule and My classes stop at 1100 px;
Settings in one column stops at 760 px; Add students' form stops at 600 px.

| Screen | Phone (under 768 px) | Tablet (768–1279 px) | Computer (1280 px and up) |
|---|---|---|---|
| Log in, sign up, forgot, reset, waiting | Full-screen form; "New here?" pinned to the bottom | Centred 420 px card on `--subtle` | Same as tablet |
| Book | One column in the order of §4; booking summary is a sticky footer above the tab bar | Two columns: choices on the left; package card and booking summary stacked on the right (280–340 px), the summary sticky | Same; package card beside the group picker |
| Schedule (customer) | 7-day grid with narrow columns, 16 px per half hour; weekday over date | 22 px per half hour; weekday and date on one line | Same as tablet |
| My classes | Upcoming, Packages, Past in one column | Upcoming on the left; Packages in a card on the right (280–380 px) | Same as tablet |
| Coach schedule | Day view (§4); Today, Needs attention and Message below it | Week grid; Today and Needs attention side by side below it; Message full width | Week grid with a 320 px side column: Today, Needs attention, Message |
| Students & payments | Cards, action-needed first, "Show all"; filter tabs scroll sideways; Record payment opens full screen | Table; Record payment opens as a 380 px drawer | Table with Record payment always beside it (340 px) |
| Add students | Form, then the customer preview, then the buttons (Add fills the width) | Same order, form up to 600 px; from 1024 px as on a computer | Form and preview side by side |
| Settings | One column; setting rows wrap their control under the label when narrow; prices in a row of three; Save bar pinned above the tab bar | One column (up to 760 px); Save changes in the header | Two columns of sections |

Test every screen at 360, 390, 768, 1024, 1280 and 1440 px (browser dev tools, device
toolbar), and on a real phone before going live.

- Sticky and fixed bars (tab bar, booking summary, Save bar) must never cover the last
  content: pad the page by their height, and add `env(safe-area-inset-bottom)` for
  phones with a home bar.
- Nothing depends on hover; everything works by tap and by keyboard.
- WCAG AA contrast (tokens above pass on their intended backgrounds).
- Every input has a label; icon-only buttons have `aria-label`; the week grids have a
  text alternative (the Book screen lists the same times).
- 44 px touch targets at every width; visible focus ring (2 px accent outline, 2 px
  offset).
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
| group_inactive | Your coach has paused bookings for this group. Message your coach. |
| locked | It's less than {cutoff} hours before the lesson, so it can't be cancelled. |
| not_booked | This lesson is no longer booked. Refresh to see the latest. |
| not_approved | Your coach hasn't approved your account yet. |
| invalid_login | Wrong username or password. |
| too_many_attempts | Too many tries. Wait 15 minutes and try again. |
| (network) | Couldn't reach the server. Check your connection and try again. |
| not_your_group, not_your_booking, invalid_repeat, invalid_length, invalid_reason, not_found (and any code not listed) | Something went wrong. Refresh the page and try again. |

Empty states: no groups yet → "Your coach hasn't set up your lessons yet. Message your
coach to get started." No times this day → "This day is fully booked. Try another day."

Coach screens (Add booking, lesson details, Students & payments, Add students, Settings,
Message all customers) use this table first, then the table above. Braces come from the
error's detail (TECH_SPEC §5), formatted as above, plus `{gap}`: `{index}` counts from 1,
`{weekday}` is a day name (1 = Monday), `{can_still_book}` shows 0 if negative, and
counts read naturally ("1 more lesson"). In either table, a code without the detail its
message needs gets the generic message.
| Code | Message |
|---|---|
| outside_open_hours | It's outside your open hours. Turn on "Outside open hours" to book it anyway. |
| off_step | It starts between your usual start times. Turn on "Outside open hours" to book it anyway. |
| gap_after | It starts too soon after the lesson that ends at {time}. You need {gap} to travel between lessons. Turn on "Skip travel gap" to book it anyway. |
| gap_before | It ends too close to the {time} lesson. You need {gap} to travel between lessons. Turn on "Skip travel gap" to book it anyway. |
| credit_exceeded | This group can book {can_still_book} more lessons before paying. Record a payment first, or choose "Book anyway". |
| not_started | This lesson hasn't started yet. Cancel it instead. |
| not_booked | This lesson is already {status}. Refresh to see the latest. |
| invalid_reason | The reason is too long. Shorten it to 500 characters. |
| price_not_set | No price is set for this lesson type. Type the amount, or set the price in Settings. |
| invalid_lessons | A payment needs at least 1 lesson. Change the number of lessons. |
| invalid_amount | The amount can't be negative. Enter RM 0 or more. |
| invalid_method | Choose how they paid: Cash, Transfer or FPX. |
| invalid_date | The payment date is in the future. Pick today or an earlier date. |
| invalid_note | The note is too long. Shorten it to 500 characters. |
| duplicate_group | These students already have an active group. Use that group, or deactivate it first. ("That group" links to {group_id}.) |
| has_upcoming_lessons | This group has {count} upcoming lessons. Cancel them first, then deactivate it. Each cancellation emails the customer. |
| group_full | A lesson can have up to {max} students. Remove one, or change "Students per lesson" in Settings. |
| invalid_students | Student {index} is already in the list or can't be found. Pick another student or type a new name. |
| invalid_name | Type a name for student {index} (up to 100 characters). |
| student_other_account | Student {index} belongs to another account. Pick one of this account's students or type a new name. |
| invalid_location | Type the pool location (up to 100 characters). |
| invalid_opening | Lessons already used and paid can't be negative. Enter 0 or more. |
| invalid_range | The end time must be after the start time. Change it and try again. |
| invalid_rules | Open hours range {index} is incomplete. Check each day's hours and save again. |
| overlapping_rules | Two ranges on {weekday} overlap. Change one and save again. |
| invalid_setting | {field} has a value that isn't allowed. Check it and save again. ({field} is shown as the form's label, such as "Travel gap".) |
| invalid_message | The message must be 1 to 1000 characters. Change it and send again. |
| not_coach, not_found, invalid_settings, unknown_setting, invalid_kind, invalid_active, not_customer, group_inactive | Something went wrong. Refresh the page and try again. |

## 7. Using the reference files
The files in `design/` come from the design canvas. They are plain HTML with inline
styles, so exact colours, sizes and spacing can be read straight from them. Template
parts are not React: `{{name}}` is data, `<sc-for list="{{items}}" as="x">` is a loop,
`<sc-if value="{{flag}}">` is a condition, and `support.js` / `<x-dc>` belong to the
design tool. Ignore those; build the screens as normal React components.
`Main.dc.html` contains a working JavaScript version of the slot and clash logic. Use it
to understand the behaviour, but the real logic lives in SQL (TECH_SPEC §5.1).

Each pair of files (for example `Main.dc.html` and `MainDesktop.dc.html`) is one
design: the markup is the same (apart from the links between drawings) and only the
drawing width differs. The layout rules
are in each file's `<style>` block as `@container (min-width: …)` rules, so a drawing
reacts to its own width. In the app, write the same rules with Tailwind's `md:`, `lg:`
and `xl:` prefixes, which react to the window width; the breakpoints are identical.

`design/screens/` has a picture of every drawing (same names, `.png`) for Claude Code
to look at. If a design changes on the canvas, save a new screenshot over the old one.