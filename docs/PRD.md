# Swim Class Booking: Product requirements

Version 1.0 · 27 Sep 2026 · Owner: Herman (coach)

## 1. Summary
Herman teaches private swimming lessons at customers' condo pools around KL and
Rawang. Today bookings run through a shared spreadsheet and WhatsApp, and payments
are checked against the bank account. This site replaces that:

- Customers log in, see the coach's week, and book lessons that fit around other
  lessons and the coach's travel time. Clashing times are shown with the reason.
- Lessons are sold in packages of 4. The system counts lessons automatically and
  shows who has paid, who hasn't, and who is on their last lesson.
- The coach gets a schedule view, a students and payments view, and settings for
  every rule. Customers and the coach get email reminders the evening before.
- It runs entirely on free tiers (Cloudflare, Supabase, Gmail through Apps Script).

## 2. Users and roles
- **Coach** (one person, admin). Sees and changes everything.
- **Customer**: the person who books and pays. A parent (for example Mei Ling, who
  books for Aiman and Sofia) or an adult learner booking for themselves. Every
  customer has their own account and username.
- **Student**: a person who swims. Students belong to a customer account and do not
  log in themselves.

## 3. Goals and non-goals
Goals
- Customers can book, see the schedule, and cancel within the rules without messaging
  the coach.
- The coach never double-books and always has at least the travel gap between lessons.
- The coach can see at a glance who has paid and who owes, without opening the bank app.
- Zero monthly running cost.

Non-goals for version 1
- Invoices or receipts as documents (payments are tracked, not invoiced).
- Online payment (planned for later; see §11).
- More than one coach, waitlists, or native App Store / Google Play apps.
- WhatsApp automation.

## 4. Core concepts
- **Account**: a customer login (username, name, email, phone). Needs coach approval.
- **Student**: a name under an account.
- **Group**: 1, 2 or 3 students from the same account who always book together.
  Its type is its size: 1-to-1, 1-to-2 or 1-to-3. The coach creates groups. A student
  can be in more than one group (for example Sofia is in "Aiman & Sofia" (1-to-2) and
  in "Sofia" (1-to-1)).
- **Lesson / booking**: one time slot for one group, 1 or 2 hours long, at the
  group's pool location.
- **Package**: a block of 4 lessons (setting) that belongs to a group. The group shares
  it: a 1-to-2 lesson uses 1 lesson from the pair's package, not 1 each.
- **Travel gap**: the coach needs 1 hour (setting) before and after every lesson to
  travel between pools.
- **Open hours**: the weekly template of when lessons can happen, plus one-off
  exceptions ("Block time" closes time, "Open extra time" opens time on one date).

## 5. Business rules
Every rule has an ID so code, tests and prompts can refer to it.

### Accounts and login
- **BR-1** Customers sign up with username, name, email and password; a phone number is
  optional (Herman, 2 Oct 2026). Usernames
  are unique, lowercase, 3 to 30 characters of `a-z 0-9 . _`.
- **BR-2** New sign-ups cannot book until the coach approves them (setting, default on).
  They see a "Waiting for your coach to approve your account" screen.
- **BR-3** The coach can also create an account for a customer; the customer gets an
  email to set their password, and the account is already approved.
- **BR-4** Log in with username and password. Wrong username or wrong password shows
  the same message. Too many failed tries on one username (10 in 15 minutes) pauses
  logins for that username for 15 minutes.
- **BR-5** Forgot password: the customer enters their email and gets a reset link.

### Groups
- **BR-6** Only the coach creates, edits and deactivates groups. A group has 1 to
  `max_students_per_lesson` (default 3) students, all from the same account, and a
  pool location.
- **BR-7** When booking, customers choose from their active groups only. They cannot
  combine students into a new group themselves.

### Booking
- **BR-8** A lesson is 1 or 2 hours (setting `lesson_lengths`) and starts on the
  start step (default every 30 minutes) counted from the start of the open window.
- **BR-9** A lesson must sit entirely inside open hours for that date: the weekly
  template for that weekday, plus "open" exceptions, minus "closed" exceptions.
- **BR-10** Travel gap: between the end of any lesson and the start of the next there
  must be at least `travel_gap_minutes` (default 60). This applies across all
  customers and all locations. Only the coach can override it, per booking.
- **BR-11** Customers can book from now until `booking_window_weeks` ahead (default 4).
  Times that have started cannot be booked.
- **BR-12** Every start time in open hours is shown. Times that break BR-9/10/11 are
  shown crossed out; tapping one explains why:
  - overlaps another lesson ("It overlaps another lesson at 5:30–6:30 pm")
  - overlaps this account's own lesson ("It overlaps Aiman & Sofia's lesson at 9:00–10:00 am")
  - too close before a lesson ("It ends too close to the 7:30 pm lesson. Your coach
    needs 1 hour to travel between lessons.")
  - too soon after a lesson ("It starts too soon after the lesson that ends at 6:30 pm. ...")
- **BR-13** Repeat weekly: when booking, the customer can repeat the same time for
  the following weeks, up to what their balance plus credit allows (BR-21). It is all
  or nothing: if any week clashes, nothing is booked and the clashing dates are listed.
- **BR-14** Two people can never book the same time. The database must make this
  impossible even when two bookings arrive at the same moment.

### Cancelling and changes
- **BR-15** Customers can cancel up to `cancel_cutoff_hours` (default 6) before the
  start. After that the lesson is locked: it can't be cancelled and counts even if
  missed. The cancel button shows the deadline ("Free to cancel until 3:00 am, Sat 3 Oct").
- **BR-16** Rescheduling = cancel + book, following the same rules.
- **BR-17** The coach can cancel any lesson at any time (for example weather or
  emergency). The lesson goes back to the package and the customer is emailed.
- **BR-18** The coach can mark a lesson "excused" (for example the student was sick and
  the coach agrees). Excused lessons don't count.

### Counting lessons, packages and payments
- **BR-19** A booked lesson counts as used once its end time has passed. A 2-hour lesson
  counts as 2. Cancelled and excused lessons never count.
- **BR-20** Payments are recorded per group: lessons bought (normally 4), amount,
  method (cash, transfer, FPX, free) and date. A free lesson is a payment of 1 lesson
  with RM 0.
- **BR-21** Credit: a group may book up to `unpaid_packages_allowed` (default 1)
  package beyond what it has paid for. Lessons booked beyond that are refused with a
  clear message ("Pay for the current package before booking more lessons").
- **BR-22** Display per group: "Package N · x used · y booked · z left to book", and
  Paid or Unpaid. Unpaid means used + booked lessons exceed paid lessons, or no payment
  covers the current package yet (a new group that hasn't paid). It is the group's status:
  Students & payments shows it until the payment comes in, then Paid; lessons don't carry
  it (Herman, 2 Oct 2026). Book's package card says Paid or Unpaid for the package it
  names. "Last lesson <date>" shows when an upcoming booked lesson is the last paid lesson.
- **BR-23** Package numbers follow lesson order: lessons 1–4 are Package 1, 5–8 Package 2,
  and so on, per group.
- **BR-24** Lessons don't expire (setting `lesson_expiry_months`, default off).
- **BR-25** Starting balances: when a group is added at go-live, the coach can enter
  lessons already used and already paid before the system existed.
- **BR-26** Package prices are set per type (1-to-1, 1-to-2, 1-to-3). One payment per
  package, shared by the group. `payment_instructions` (bank transfer or DuitNow
  details) are shown to customers.

### Schedule and privacy
- **BR-27** Customers can see the coach's week: free, booked, travel, closed, and their
  own lessons. Other people's lessons show only as "Booked", with no names or locations.
- **BR-28** The coach sees everything: names, group type, location, travel gaps,
  overrides, payment flags.

### Open hours
- **BR-29** The coach edits the weekly template (one or more ranges per weekday).
- **BR-30** "Block time" closes a range on specific dates; "Open extra time" opens a
  range on one date only. Neither changes the template.
- **BR-31** The coach can add a booking for any active group at any time, including outside
  open hours, with a gap override, in the past (it counts as used), beyond the booking
  window and past the group's credit, after confirming a warning. Overlaps are still
  impossible.

### Notifications (all email, sent from the coach's Gmail)
- **BR-32** Evening reminder to each customer with lessons tomorrow, at
  `reminder_time` (default 8:00 pm MYT), one email per account listing all its lessons.
- **BR-33** Coach digest at `digest_time` (default 8:00 pm): tomorrow's lessons in
  order with locations, travel gaps, unpaid groups and last-lesson flags.
- **BR-34** Booking confirmation to the customer when they book (setting, default on)
  and a cancellation email when they or the coach cancel.
- **BR-35** Late-change alert to the coach right away when a lesson in the next 24
  hours is booked or cancelled (setting, default on).
- **BR-36** Broadcast: the coach writes a message that is emailed to all approved
  customers and pinned as a banner in the app until removed.
- **BR-37** Never send the same email twice. Gmail allows 100 recipients per day; if
  a day's emails exceed that, the rest go out the next day, oldest first.

## 6. Screens
Approved designs are in `design/` (see `docs/DESIGN.md`). Screens marked "not drawn"
follow the same style.

Customer (phone)
1. Log in; Sign up; Forgot password; Reset password; Waiting for approval (not drawn)
2. Book a lesson: coach banner, "Who's this lesson for?" (groups), package status,
   day strip, 1/2-hour toggle, every start time with clashes crossed out, summary
   with repeat weekly, Book button, cancellation note.
3. Schedule: the coach's week as a grid (free, booked, travel, yours, closed).
   Tapping a day opens Book on that day.
4. My classes: upcoming lessons with Cancel or Locked, packages per group with
   progress bars and payment instructions, past lessons.
5. Account (not drawn): name, phone, email, change password, log out.

Coach (desktop)
6. Schedule: week grid with names, type, location, travel gaps and closed time;
   Today; Needs attention (unpaid, last lesson, waiting for approval); broadcast box;
   Block time, Open extra time, Add booking; lesson details (cancel, excuse).
7. Students & payments: one row per group package, filters (All, Unpaid, Last lesson,
   Paid, Waiting for approval), search, record payment panel, add free lesson,
   excuse a missed lesson, history.
8. Add students: account (existing or new), type 1-to-1/2/3, student names,
   location, first package paid, starting balances (advanced).
9. Settings: open hours table, booking rules, packages and prices, payment
   instructions, reminders and emails.

## 7. Settings and defaults
| Setting | Default |
|---|---|
| travel_gap_minutes | 60 |
| start_step_minutes | 30 |
| lesson_lengths | 60, 120 minutes |
| max_students_per_lesson | 3 |
| cancel_cutoff_hours | 6 |
| booking_window_weeks | 4 |
| lessons_per_package | 4 |
| unpaid_packages_allowed | 1 |
| price_1to1 / 1to2 / 1to3 | set by coach (RM) |
| lesson_expiry_months | off |
| reminder_time / digest_time | 20:00 MYT |
| booking_confirmations / late_change_alert | on |
| require_approval | on |
| weekly open hours | Mon–Fri 5:30–10:00 pm; Sat–Sun 7:00 am–12:00 pm and 4:00–10:00 pm |

## 8. Non-functional requirements
- Free tiers only: Cloudflare static hosting, Supabase free plan, Gmail via Apps Script.
- Customer pages usable on a mid-range phone over 4G; first load under 3 s.
- Accessible: labels, focus states, 44 px touch targets, WCAG AA contrast.
- Security: RLS on every table; secrets never in the browser; login rate limit.
- Data: Supabase region Singapore. Weekly backup kept for 90 days.
- The Supabase free plan pauses projects with no requests for a week; the email
  poller calls it every 5 minutes, which keeps it active.

## 9. Acceptance scenarios (sample week, see TECH_SPEC §10)
1. Mei Ling opens Book on Tue 29 Sep, 1 hour: free starts 7:30, 8:00, 8:30, 9:00 pm;
   5:30 and 6:00 pm show "overlaps another lesson"; 6:30 and 7:00 pm show "starts too
   soon after the lesson that ends at 6:30 pm".
2. Switching to 2 hours on Tuesday leaves 7:30 and 8:00 pm free; Thursday has no times.
3. Choosing the "Sofia" (1-to-1) group shows Package 2 fully booked and "New bookings
   start Package 3" before booking.
4. Two browsers book Tue 7:30 pm at the same moment: exactly one succeeds.
5. Cancelling Sat 3 Oct 9:00 am at 2:59 am works; at 3:01 am it is refused (locked).
6. The coach opens extra time on Wed 7 Oct 3:00–5:30 pm: customers see 3:00 pm
   options that day only.
7. Recording Hana's payment changes her row from Unpaid to Paid everywhere.
8. At 8 pm the evening before, each customer with lessons gets one reminder and the
   coach gets one digest, even if the poller runs several times.
9. A customer's network responses never contain another customer's name.

## 10. Defaults chosen (can change later)
- One unpaid package allowed per group; no lesson expiry.
- No-shows count; the coach can excuse.
- Repeat weekly is all-or-nothing.
- Group lessons only for students of the same account.
- Emails come from the coach's Gmail address; a custom domain is optional
  (for example swimclass.online) and only changes the web address.

## 11. Later (not in version 1)
- Online payment (FPX / DuitNow) through a Malaysian gateway, confirmed by the
  gateway's server callback. Some gateways require a registered business (SSM).
- WhatsApp reminders, waitlist, multiple coaches, native apps.
