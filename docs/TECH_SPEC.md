# Swim Class Booking: Technical specification

Version 1.0 · 27 Sep 2026 · Read with `docs/PRD.md` (rules are BR-x there).

## 1. Architecture

```
 Phone / laptop browser
   React SPA (static files on Cloudflare Workers static assets, free)
        |  HTTPS, Supabase publishable key + user JWT
        v
 Supabase (free plan, Singapore)
   Auth ............ email + password under the hood; username login via Edge Function
   Postgres + RLS .. all tables; every rule enforced in SQL functions (RPC)
   Edge Functions .. login, admin-accounts, mail-queue (use the secret key inside)
        ^
        |  every 5 minutes, x-mail-token header
 Google Apps Script (coach's Google account)
   polls mail-queue, sends with MailApp from the coach's Gmail, acknowledges

 GitHub Actions (weekly) -> pg_dump backup artifact (90 days)
```

Why this shape: Cloudflare's free plan allows only 10 ms of CPU per request, too little
for server-rendered pages, so the site is static files (unlimited and free on Cloudflare)
and all logic runs inside Supabase. Vercel's free plan is non-commercial, so it is not used.
The Apps Script poller also keeps the free Supabase project from pausing after a week
without requests.

## 2. Environments and keys
- **dev**: local Supabase through the CLI (needs Docker). If Docker isn't available,
  use a second free Supabase project named `swimclass-dev` and `supabase link` to it.
- **prod**: free Supabase project `swimclass`, region Southeast Asia (Singapore).
- Keys: the browser gets `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
  (`sb_publishable_...`). The secret key (`sb_secret_...`) is used only inside Edge
  Functions (available as an env var there). Supabase is deprecating the legacy `anon`
  and `service_role` keys, so use the new keys. Secret keys refuse browser requests,
  which is another reason Apps Script talks to an Edge Function instead of the database.
- Edge Function secrets: `MAIL_TOKEN` (random, 32+ bytes), `SITE_URL`.
- Apps Script properties: `MAIL_QUEUE_URL`, `MAIL_TOKEN`, `SENDER_NAME`.

## 3. Data model
All timestamps are `timestamptz`. Business dates and weekdays are computed in
`Asia/Kuala_Lumpur`. Weekdays use ISO numbering (1 = Monday … 7 = Sunday).
Use `gen_random_uuid()` ids unless noted.

```sql
create type app_role as enum ('coach', 'customer');
create type booking_status as enum ('booked', 'cancelled', 'excused');
create type payment_method as enum ('cash', 'transfer', 'fpx', 'free', 'other');
create type exception_kind as enum ('closed', 'open');

profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._]{3,30}$'),
  display_name text not null,           -- 1 to 100 characters after trimming
  phone text,                           -- at most 30 characters
  role app_role not null default 'customer',
  approved boolean not null default false,
  created_at timestamptz not null default now()
)
-- Created by a trigger on auth.users insert from raw_user_meta_data
-- (username lowercased, display_name, phone). Email stays in auth.users.

students (
  id uuid pk, account_id uuid not null references profiles on delete cascade,
  name text not null, active boolean not null default true, created_at timestamptz
)

groups (
  id uuid pk, account_id uuid not null references profiles on delete cascade,
  location text not null,
  active boolean not null default true,
  opening_used_lessons int not null default 0 check (>= 0),  -- BR-25
  opening_paid_lessons int not null default 0 check (>= 0),  -- BR-25
  created_at timestamptz
)

group_members (
  group_id uuid references groups on delete cascade,
  student_id uuid references students on delete cascade,
  primary key (group_id, student_id)
)
-- Trigger: the student's account_id must equal the group's account_id;
-- a group keeps 1..settings.max_students_per_lesson members.
-- Type (1-to-1/2/3) is the member count; don't store it.

bookings (
  id uuid pk,
  group_id uuid not null references groups,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),  -- and exactly 1 or 2 hours
  location text not null,              -- copied from the group when booked; update_group
                                       -- moves upcoming lessons to the group's new location
  status booking_status not null default 'booked',
  gap_override boolean not null default false,  -- coach only (BR-10, BR-31)
  series_id uuid,                      -- one per book_lesson/coach_book call (a single
                                       -- lesson too), shared by its weeks; null in the seed
  created_by uuid references profiles,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz, cancelled_by uuid references profiles, cancel_reason text,
  constraint bookings_no_overlap
    exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
    where (status = 'booked')          -- BR-14 safety net
)
-- lessons for a booking = duration in hours (1 or 2). Index (starts_at), (group_id, starts_at).

payments (
  id uuid pk, group_id uuid not null references groups,
  lessons int not null check (lessons > 0),
  amount_cents int not null check (amount_cents >= 0),
  method payment_method not null,
  paid_on date not null,
  note text, gateway_ref text unique,  -- gateway_ref for later
  created_by uuid references profiles, created_at timestamptz
)

availability_rules (
  id uuid pk, weekday smallint not null check (weekday between 1 and 7),
  opens_at time not null, closes_at time not null check (closes_at > opens_at)
)

availability_exceptions (
  id uuid pk, starts_at timestamptz not null, ends_at timestamptz not null,
  kind exception_kind not null, note text, created_at timestamptz
)

announcements (
  id uuid pk, message text not null check (length(message) between 1 and 1000),
  pinned boolean not null default true, send_email boolean not null default true,
  created_by uuid references profiles, created_at timestamptz, removed_at timestamptz
)

settings (                               -- exactly one row, id = 1
  id int primary key default 1 check (id = 1),
  business_name text not null default 'Swim Class',
  coach_email text not null default '',  -- '' until set (seed, or prod setup in §12)
  travel_gap_minutes int not null default 60 check (between 0 and 180),
  start_step_minutes int not null default 30 check (in (15, 30, 60)),
  lesson_lengths int[] not null default '{60,120}',  -- non-empty subset of {60,120}
  max_students_per_lesson int not null default 3 check (between 1 and 3),
  cancel_cutoff_hours int not null default 6 check (between 0 and 72),
  booking_window_weeks int not null default 4 check (between 1 and 12),
  lessons_per_package int not null default 4 check (between 1 and 20),
  unpaid_packages_allowed int not null default 1 check (between 0 and 2),
  price_1to1_cents int, price_1to2_cents int, price_1to3_cents int,
  payment_instructions text,             -- shown to customers (bank / DuitNow)
  lesson_expiry_months int,              -- null = never (BR-24); nothing applies it yet
  reminder_time time not null default '20:00',  -- before '24:00' (prompt 04)
  digest_time time not null default '20:00',    -- before '24:00' (prompt 04)
  booking_confirmations boolean not null default true,
  late_change_alert boolean not null default true,
  require_approval boolean not null default true,
  updated_at timestamptz
)

email_outbox (
  id bigint generated always as identity primary key,
  to_email text not null, subject text not null,
  body_text text not null, body_html text,
  kind text not null,                    -- reminder, digest, booked, cancelled, late_alert, broadcast
  dedupe_key text unique,                -- BR-37
  created_at timestamptz not null default now(),
  claimed_at timestamptz, sent_at timestamptz, attempts int not null default 0, last_error text
)

daily_jobs (job text, for_date date, done_at timestamptz not null default now(),
            primary key (job, for_date))

login_attempts (id bigint identity pk, username text not null check (≤ 64 chars), ip inet,
                attempted_at timestamptz not null default now(), ok boolean not null)

booking_changes (id bigint identity pk, account_id uuid not null → profiles on delete cascade,
                 series_id uuid, changed_at timestamptz not null default now(),
                 unique (account_id, series_id) where series_id is not null)
```

Caps besides the columns' own (hardening migration, 4 Oct 2026):
`availability_exceptions.note`, `bookings.cancel_reason`, `payments.note` ≤ 500 characters;
`settings.payment_instructions` ≤ 2000; `payments.lessons` ≤ 100 and `amount_cents` ≤
10 000 000 (RM 100,000); starting balances ≤ 10 000; at most 50 `availability_rules`
(`too_many_rules`).

The schema migration inserts the `settings` row with the defaults (coach_email '').
The seed sets coach_email and adds the weekly template:
Mon–Fri 17:30–22:00; Sat and Sun 07:00–12:00 and 16:00–22:00.

Triggers: a profile is created for every new `auth.users` row; `group_members` checks
same account (`student_other_account`) and size (`group_full`); a group always keeps a
member (`group_empty`, checked at commit); moving a group or student to another account
is refused; `settings.updated_at` is set on update. A customer's booking or cancellation
is refused after 10 in 24 hours (`too_many_changes` {`limit`}; a repeat booking counts
once, the coach's never count): see §5.2.

## 4. Derived views
All views use `with (security_invoker = true)` so RLS applies to whoever queries them.
Each has `group_id` as its group key. Customers can't read `settings`, so the views get
the package size and credit from `package_settings()` (security definer), and lessons
per booking from `lessons_for(starts_at, ends_at)` (hours).

**`group_details`**: group id, account id, location, active, `size` (member count),
`type_label` ('1-to-1' / '1-to-2' / '1-to-3'), `display_names` ("Aiman & Sofia",
"Adam, Alya & Amir"; join with ", " and " & " before the last name), member ids.

**`booking_ledger`**: every counted booking (status 'booked') per group in start order
with `first_index` and `last_index` (cumulative lesson numbers, starting after
`opening_used_lessons`; a 2-hour lesson takes two numbers), `package_no`
(= ceil(first_index / lessons_per_package)), `lesson_in_package` and `used`
(ends_at <= now). Used for "Package 4, lesson 2 of 4" labels.

**`group_balance`** (as of `app_now()`):
- `paid_lessons` = opening_paid_lessons + sum(payments.lessons)
- `used_lessons` = opening_used_lessons + lessons of booked bookings with ends_at <= now
- `booked_lessons` = lessons of booked bookings with ends_at > now
- `package_no` = floor(used_lessons / size) + 1, `used_in_package` = used − (package_no − 1) × size
- `booked_in_package` = least(booked_lessons, size − used_in_package)
- `left_in_package` = size − used_in_package − booked_in_package
- `unpaid` = used + booked > paid; `unpaid_since` = start (timestamptz) of the lesson that
  uses lesson number paid_lessons + 1; null when that lesson is in the opening balance
- `can_still_book` = paid + unpaid_packages_allowed × size − used − booked (BR-21; negative
  if the coach booked past the limit)
- `last_lesson_at` = start of the upcoming booking whose last_index = paid_lessons,
  when used + booked = paid (BR-22)
- `last_paid_on`, `last_payment_method`
- (`size` above is `lessons_per_package`, exposed as `package_size`.)

## 5. Database functions (RPC)
All are `security definer`, `set search_path = ''`, check the caller with `auth.uid()`
first, and raise errors as `raise exception using errcode = 'P0001', message = '<code>'`
where `<code>` is one of the reason codes below, plus a `detail` JSON when useful.
Through supabase-js the code is `error.message` and the detail is JSON text in
`error.details`. The frontend maps codes to messages (DESIGN.md §6).

**Clock**: every function and view that needs the current time calls `app_now()`, which
returns `current_setting('app.now', true)::timestamptz` when that setting exists and
`now()` otherwise. Only direct database connections (tests, SQL editor) can set
`app.now`; the API can't, so customers can never fake the time to dodge the cutoff.
As a second lock, `app_now()` ignores `app.now` when `session_user` is `authenticator`
(every PostgREST request, including Edge Functions using supabase-js).
Never add a "now" parameter to a function customers can call.

Helpers: `app_now()`, `is_coach()`, `is_approved()`, `my_account_id()`, and for the
views `lessons_for()` and `package_settings()`.

### 5.1 Availability (the engine: one source of truth)
Built in prompt 03 (`supabase/migrations/…_availability.sql`, tested in
`tests/db/availability.test.ts`). Days are MYT days: the day of an instant is
`(ts at time zone 'Asia/Kuala_Lumpur')::date`, a day and time is
`(day + time) at time zone 'Asia/Kuala_Lumpur'`; nothing depends on the session time zone.
Times inside the JSON these functions return are MYT text, `"2026-09-29T19:30:00+08:00"`.

- `open_windows(p_day date) returns table (starts_at, ends_at)`: weekly rules for that
  ISO weekday, plus 'open' exceptions overlapping the day, merged (touching ranges join:
  an extra 15:00–17:30 and the 17:30–22:00 rule make one 15:00–22:00 window), minus
  'closed' exceptions (closed wins, so "Open extra time" inside a "Block time" does
  nothing). Exceptions are cut at MYT midnight, so a window, and therefore a customer's
  lesson, never crosses midnight. Internal (no grant).
- `slot_check(p_starts_at, p_minutes, p_group_id, p_viewer uuid, p_ignore_open_hours bool default false, p_allow_past bool default false, p_ignore_window bool default false) returns table (ok bool, reason text, detail jsonb)`.
  The defaults are the customer rules; the options are the coach's (prompt 04, §5.2).
  Order of checks, first failure wins:
  1. `past` (starts_at <= app_now(); a null start too), `outside_window`: the lesson's
     MYT day is after the last bookable day, which is the Sunday of the week
     `booking_window_weeks` after the current MYT week (Herman, prompt 03: on Mon 28 Sep
     with 4 weeks, customers can book up to Sun 1 Nov; at the test clock, Sat 26 Sep, up
     to Sun 25 Oct). The UI's week navigation follows the same rule: this week plus
     `booking_window_weeks` more.
  2. `invalid_length` (not in lesson_lengths), `off_step` (not a whole number of
     `start_step_minutes` after the start of the open window it starts in; a start in no
     window skips this and fails step 3)
  3. `outside_open_hours` (not fully inside one open window)
  4. overlaps with booked lessons, earliest first: `overlap_mine` (a booking of the
     viewer's account; detail `{starts_at, ends_at, names}`, names = that group's
     display_names) or `overlap_other` (detail `{starts_at, ends_at}` only)
  5. travel gap, booked lessons in start order: `gap_after` (starts less than gap after a
     lesson ends; detail `{ends_at}` of that lesson) or `gap_before` (ends less than gap
     before a lesson starts; detail `{starts_at}` of that lesson). The gap counts across
     midnight. New bookings always need the full gap next to every existing lesson.
     `gap_override` only records that the coach allowed a tight pair; travel drawing
     (`week_busy`, `coach_week`) skips the travel between an override booking and the
     neighbour it was squeezed next to.

  Otherwise `ok = true` with null reason and detail. Cancelled and excused bookings block
  nothing. `p_group_id` is the group the lesson is for; no check depends on it. Internal
  (no grant): `p_viewer` decides whose names appear, so callers pass the signed-in
  account. `p_ignore_open_hours` skips `off_step` and `outside_open_hours` (the start must
  still be a whole minute, else `off_step`); `p_allow_past` and `p_ignore_window` skip
  `past` (a null start still fails) and `outside_window`. There is no gap option: the gap
  is the last check, so the coach's callers accept a `gap_after`/`gap_before` result when
  he skips the gap (§5.2).
- `week_slots(p_week_start date, p_minutes int, p_group_id uuid) returns table (day date, starts_at timestamptz, ok bool, reason text, detail jsonb)`:
  every start inside open windows (stepping `start_step_minutes` from each window's start,
  while start + length fits in the window) for the 7 days from `p_week_start`, in start
  order, with `slot_check` applied for the caller. Crossed-out times are included (BR-12).
  Errors: `not_approved` (customer not approved), `not_your_group` (a customer's group
  that isn't theirs, or doesn't exist), `not_found` (coach, no such group),
  `invalid_week` (null week), `invalid_length`. The coach may pass any group; as the
  viewer he gets `overlap_other` for everyone's lessons (names are in `coach_week`).
  Used by the Book screen.
- `week_busy(p_week_start date) returns jsonb`: for the customer Schedule grid, approved
  customers and the coach (`not_approved`, `invalid_week`). An array of 7 days in date
  order, each `{day, open: [{starts_at, ends_at}], closed: [{starts_at, ends_at}], busy: [...]}`:
  `open` = open_windows, `closed` = 'closed' exceptions cut to the day (no notes), `busy`
  = booked lessons starting that day `{starts_at, ends_at, mine, travel_before,
  travel_after}`, plus `booking_id` and `group_id` only when `mine`. No names, no
  locations, no other ids. `travel_before`/`travel_after` are minutes: the travel gap,
  shortened so it never covers the neighbouring lesson (when the gap setting grew), and 0
  between an override booking and the neighbour closer than the gap (as drawn in
  `design/Schedule.dc.html`, Fri 2 Oct). The UI draws travel only inside open time.
- `coach_week(p_week_start date) returns jsonb`: coach only (`not_coach`,
  `invalid_week`). The same 7 days with `open` and `closed`, plus `exceptions` (every
  exception overlapping the day, uncut: `{id, kind, starts_at, ends_at, note}`; the only
  way notes are read) and `lessons` (every booking starting that day, any status:
  `{booking_id, group_id, account_id, account_name, display_names, type_label, size,
  location, starts_at, ends_at, lessons, status, gap_override, travel_before,
  travel_after, used, package_no, lesson_in_package, package_size, unpaid,
  last_lesson}`; travel and ledger fields are null for cancelled and excused lessons;
  `unpaid` is the group's flag, `last_lesson` marks the group's last paid lesson).
- Internal helpers (no grant): `lesson_travel(p_from, p_to)` (the travel minutes above,
  for booked lessons starting in the range) and `myt_text(timestamptz)`.

### 5.2 Booking and changes
Built in prompt 04 (`supabase/migrations/…_coach_slot_check.sql`, `…_booking.sql`, tested in
`tests/db/booking.test.ts` and `changes.test.ts`).
- `book_lesson(p_group_id, p_starts_at, p_minutes, p_repeat_weeks int default 1) returns uuid[]`
  (the new booking ids, in start order):
  - caller approved and owns the group (`not_approved`, `not_your_group`), group active
    (`group_inactive`), 1 to 52 weeks (`invalid_repeat`), a length in `lesson_lengths`
    (`invalid_length`)
  - lock the group first (`select … from groups where id = p_group_id for no key update`)
    so two bookings for one group on different dates can't both pass the credit check,
    then take `pg_advisory_xact_lock(20260929, <days since 2000-01-01>)` on each affected
    MYT date (sorted) to serialise competing bookings, then run `slot_check` for every
    week with the caller as `p_viewer`. The affected dates are every MYT date that
    `[starts_at − travel gap, ends_at + travel gap]` touches, for every week: the gap
    check crosses midnight (a lesson ending 23:30 blocks 00:00 the next day), so locking
    only the lesson's own date would let two such bookings race. The booking functions
    are volatile, so each statement after the locks sees every booking committed before.
    Repeat weeks: `make_interval(hours => 168 * k)`, never `interval '7 days'` on a
    timestamptz, which follows the session's daylight saving.
  - a single week that fails raises `slot_check`'s reason with its detail, as `week_slots`
    shows it; with several weeks, any failure raises `repeat_conflict` {`dates`: the
    failing MYT dates, `clashes`: [{`date`, `reason`, `detail`}]} and nothing is inserted
  - then credit: lessons needed <= `can_still_book` (`credit_exceeded` {`needed`,
    `can_still_book`})
  - insert rows with a shared `series_id` and the group's location; queue emails (§8)
  - the change limit (hardening migration): a customer may book or cancel 10 times in any
    24 hours, so a script can't flood the outbox (Gmail sends about 100 a day). One
    `book_lesson` call counts once, however many weeks; the 11th change raises
    `too_many_changes` {`limit`: 10}. A trigger on `bookings` counts in `booking_changes`;
    it acts only for a signed-in customer, so `coach_book`, the coach's cancellations and
    excuses, the seed and migrations pass. It is an abuse limit like the login limit (§7),
    not a business setting, so it isn't in `settings`.
- `coach_book(p_group_id, p_starts_at, p_minutes, p_repeat_weeks int default 1, p_ignore_open_hours bool default false, p_gap_override bool default false, p_ignore_credit bool default false) returns uuid[]`:
  coach only (`not_coach`, `not_found`, then `book_lesson`'s errors from `group_inactive`
  on). The same locks and checks, with `slot_check`'s coach options: he may book in the
  past (the lesson counts as used) and beyond the booking window (Herman, prompt 04);
  with `p_ignore_open_hours` outside open hours at any whole minute; with
  `p_gap_override` a week that fails only the travel gap is booked with `gap_override`
  (weeks that don't need it aren't marked); with `p_ignore_credit` past the credit limit
  (`can_still_book` goes negative). Overlaps are always refused, and lesson lengths bind
  him too. No emails (§8).
- `coach_slot_check(p_group_id, p_starts_at, p_minutes, p_ignore_open_hours bool default false, p_gap_override bool default false) returns table (ok bool, reason text, detail jsonb)`:
  the Add booking dialog's live clash reason (prompt 08). Coach only (`not_coach`,
  `not_found`), granted to `authenticated`; `slot_check` itself stays without a grant.
  `slot_check` with the coach's options and the coach as viewer (overlaps show times
  only); with `p_gap_override` a gap result counts as ok. It checks one start: not the
  later repeat weeks, and not credit (`coach_book` reports those).
- `cancel_booking(p_booking_id, p_reason text default null)`: the approved owner only
  while `app_now() <= starts_at - cancel_cutoff_hours` (`locked` {`cutoff_at`}); the coach
  any time, a lesson that has happened too. Status becomes 'cancelled'; `cancelled_at`
  (`app_now()`), `cancelled_by` and the reason (trimmed, up to 500 characters:
  `invalid_reason`) are recorded; queue emails (§8). Errors also `not_approved`,
  `not_your_booking` (a customer's booking that isn't theirs, or doesn't exist),
  `not_found` (the coach), `not_booked` {`status`}, and for a customer `too_many_changes`
  {`limit`} (§5.2 above).
- `excuse_booking(p_booking_id)`: coach only; a booked lesson that has started (a future
  one is cancelled instead: `not_started`); status 'excused', so it no longer counts.
  Errors also `not_found`, `not_booked` {`status`}.
- `record_payment(p_group_id, p_lessons, p_amount_cents, p_method, p_paid_on date default null, p_note text default null) returns uuid`:
  coach only. A null amount is the type's package price × `p_lessons` /
  `lessons_per_package`, rounded to the cent (`price_not_set` while that price is empty);
  a null date is today in MYT. Errors: `not_found`, `invalid_lessons` (under 1),
  `invalid_amount` (negative), `invalid_method`, `invalid_date` (in the future),
  `invalid_note` (over 500 characters).
- `add_free_lesson(p_group_id, p_note text default null) returns uuid`: coach only;
  payment of 1 lesson, RM 0, method 'free', dated today (MYT). Errors: `not_found`,
  `invalid_note` (over 500 characters).

### 5.3 Students, groups and accounts
Built in prompt 04 (`…_groups_accounts.sql`, tested in `tests/db/groups.test.ts`).
- `create_group(p_account_id, p_students jsonb, p_location, p_first_package_paid bool default false, p_amount_cents int default null, p_method default null, p_opening_used int default 0, p_opening_paid int default 0) returns uuid`:
  coach only, for a customer account (`not_found`, `not_customer`). `p_students` items are
  `{"student_id": ...}` (a student of that account) or `{"name": ...}` (always a new
  student). 1..max_students_per_lesson items. Refuse an exact duplicate of an active group
  (`duplicate_group` {`group_id`}). A first package paid is a payment of
  `lessons_per_package` lessons dated today; a null amount is the type's price. Errors
  also `invalid_students`, `invalid_name`, `student_other_account` (each {`index`};
  `invalid_students` has none when the list is empty or not an array),
  `group_full` {`max`}, `invalid_location` (1 to 100 characters), `invalid_opening`
  (negative), `invalid_method`, `invalid_amount`, `price_not_set`.
- `update_group(p_group_id, p_location text default null, p_opening_used int default null, p_opening_paid int default null)`:
  coach only; null keeps a value. A new location also moves the group's upcoming booked
  lessons (past ones keep theirs). Errors: `not_found`, `invalid_location`,
  `invalid_opening`.
- `set_group_active(p_group_id, p_active)`: coach only. A group with upcoming booked
  lessons can't be deactivated (`has_upcoming_lessons` {`count`}: cancel them first);
  reactivating is refused while an active group has the same students
  (`duplicate_group` {`group_id`}). Errors also `invalid_active`, `not_found`.
- `approve_account(p_account_id)`: coach only (`not_found`).
- `pending_accounts() returns table (id, username, display_name, phone, email, email_confirmed, created_at)`:
  coach only (`not_coach`; prompt 09, `…20261005100000_pending_accounts`, tested in
  `tests/db/groups.test.ts`). The customer accounts with `approved = false`, oldest sign-up
  first, each with its address through `account_email` and whether Auth has confirmed it.
  The coach's only way to read other accounts' emails: never a view over `auth.users`.
- `username_available(p_username) returns boolean`: for anon (sign-up) and signed-in
  accounts (the coach's new-account form). Lowercased and trimmed like the profile
  trigger; returns only true/false (false for an invalid username).

### 5.4 Open hours, settings, announcements
Built in prompt 04 (`…_settings.sql`, tested in `tests/db/admin.test.ts`); prompts 06,
08 and 10 use them. All coach only (`not_coach`) except `get_public_settings`.
- `set_open_hours(p_rules jsonb)`: replaces the whole weekly template with
  `[{"weekday": 1-7, "opens_at": "17:30", "closes_at": "22:00"}, …]` (ISO weekdays; an
  empty list closes every day; a range may end at "24:00"). Not an array:
  `invalid_rules` with no detail; malformed items: `invalid_rules` {`index`}; a range
  must end after it starts (`invalid_range`
  {`index`}); ranges of one day must not overlap (touching ones join;
  `overlapping_rules` {`weekday`}). Existing lessons stay booked.
- `add_exception(p_kind, p_starts_at, p_ends_at, p_note text default null) returns uuid`
  (`invalid_kind`, `invalid_range`, `invalid_note` over 500 characters) and
  `remove_exception(p_id)` (`not_found`).
- `update_settings(p_settings jsonb) returns settings` (the saved row): any of the
  settable columns (not `id` or `updated_at`: `unknown_setting` {`keys`}), each as its
  JSON type (times as "20:00"); null empties the optional ones; text is trimmed. The
  table's checks validate the values (`invalid_setting` {`field`}), including
  `reminder_time` and `digest_time` before 24:00; `payment_instructions` up to 2000
  characters. Not a JSON object: `invalid_settings`.
- `post_announcement(p_message, p_send_email bool default true, p_pinned bool default true) returns uuid`
  (`invalid_message`: 1 to 1000 characters after trimming) and `remove_announcement(p_id)`
  (`not_found`; removing it again changes nothing). Emails already queued still go out.
- `get_public_settings()`: one row of the fields customers need: `business_name`,
  `lesson_lengths`, `start_step_minutes`, `travel_gap_minutes` (for the `{gap}` in
  DESIGN §6 messages), `cancel_cutoff_hours`, `booking_window_weeks`,
  `lessons_per_package`, the three prices and `payment_instructions`. For every signed-in
  account, approved or not; not for anon, so signed-out pages use the default business
  name (`src/shared/config/business.ts`).

### 5.5 Email queue (service role only, called by the `mail-queue` Edge Function; `email_log` is the coach's)
- `queue_daily_emails(p_for_date date)`: `p_for_date` is tomorrow in MYT. Queues each
  daily job that is due and hasn't run for that date: the reminders once the MYT time is
  past `reminder_time` (BR-32: one per account, dedupe `reminder:<account>:<date>`;
  records `daily_jobs('reminder', date)`), and the coach digest once it is past
  `digest_time` (BR-33: `digest:<date>`; records `daily_jobs('digest', date)`). The
  function decides what is due, so running it again changes nothing.
- `claim_outbox(p_limit int) returns setof email_outbox`: marks unsent rows whose
  claim is empty or older than 15 minutes, oldest first.
- `ack_outbox(p_id, p_ok, p_error)`.
- `email_log(p_limit int default 50)`: coach only (granted to `authenticated`, checks
  `is_coach()`), for the Email log in Settings (prompt 11): the latest outbox rows'
  `created_at`, `to_email`, `kind`, `sent_at`, `attempts` and `last_error`, newest
  first. The coach never gets a grant on `email_outbox` itself.

## 6. Row Level Security and grants
Enable RLS on every table. Grant table privileges only to `authenticated` where a
policy exists. Direct inserts/updates from the browser are allowed only where listed;
everything else goes through the functions above.

| Table | Customer (approved or not) | Coach |
|---|---|---|
| profiles | select/update own row (display_name, phone) | select all; update display_name, phone (role and approval only through functions) |
| students, groups, group_members | select own account's | all (writes via functions) |
| bookings | select own groups' bookings | all (writes via functions) |
| payments | select own groups' | all (writes via functions) |
| availability_rules, availability_exceptions | select (exceptions: not `note`, the coach's private text) | select (exception notes read through coach functions); writes via functions |
| announcements | select where removed_at is null | select all; writes via functions |
| settings | none (use `get_public_settings`) | select; writes via `update_settings` |
| email_outbox, daily_jobs, login_attempts, booking_changes | none | none (service role only; the Email log reads the outbox through `email_log`) |

The only direct write from the browser is a profile's `display_name` and `phone`. The coach
had direct writes on open hours, exceptions, announcements and settings until the
hardening migration (4 Oct 2026) revoked them: the functions check, trim and cap what is
written, and the tables cap it too.

The RLS migration removes the default privileges, so every new table, view and function
starts with no access for `public`, `anon` and `authenticated`. Grant `execute` to
`authenticated` on every RPC the browser calls, whether a customer or the coach calls it
(the coach signs in as `authenticated` too); coach-only functions check `is_coach()`
first. Internal helpers (`open_windows`, `slot_check`: its `p_viewer` would let a caller
see another account's names; `lesson_travel`, `myt_text`; prompt 04's
`lock_booking_dates`, `place_bookings`, `package_price_cents`, the email formatting,
template and queueing functions and `account_email`, which reads `auth.users`) and the
service-role email functions get no grant; `anon` gets only `username_available` (which
signed-in accounts get too). `week_slots` and
`week_busy` also refuse accounts waiting for approval (`not_approved`): anyone can sign
up, and the coach's busy times show where he is.

## 7. Edge Functions (Deno, `supabase/functions/`)
- **`login`** (verify_jwt off). POST `{username, password, captcha_token}` →
  `{session: {access_token, refresh_token}}`; the browser then calls
  `supabase.auth.setSession(...)`. Built in prompt 05 (`…120000_add_login_limiter`,
  tested in `tests/db/login.test.ts`), as redesigned after the 4 Oct 2026 audit:
  - Normalise the username first (trim, lowercase); one that can't be a username
    (`^[a-z0-9._]{3,30}$`), or an empty password, gets `invalid_login` and isn't recorded.
  - `check_login_attempt(p_username, p_ip)` (service role only) decides and records,
    under advisory locks on the username, then the IP. It records the try as a failure
    before the sign-in, so parallel tries all count, and returns `{attempt_id, email}`
    (null email for an unknown username, still counted). It deletes rows older than a
    day. After a successful sign-in, `record_login_success(p_attempt_id)` marks the try
    and forgets that username's earlier failures from that IP.
  - Limits over 15 minutes: 10 failures for one username from one IP, and 30 failures
    from one IP for any usernames → `too_many_attempts` (429). Failures for one username
    from many IPs never lock the account (anyone knows `herman`): in production Auth asks
    for the CAPTCHA on every sign-in (§9), which is what stops them.
  - The client IP: `CF-Connecting-IP`, which Cloudflare in front of Supabase sets (it refuses
    a request that sends one itself), else the first `X-Forwarded-For` entry; null if
    neither holds an IP. A made-up `X-Forwarded-For` doesn't change it (checked on dev).
  - It signs in with the email and password through a **publishable-key** client,
    passing the CAPTCHA token on, so Auth checks the CAPTCHA. A secret-key client would
    skip Auth's CAPTCHA check; forwarding the client's IP to Auth (`Sb-Forwarded-For`)
    works only with the secret key, so it isn't done. Auth's own per-IP limit on
    password sign-ins (150 per 5 minutes, bursts of 30) is therefore shared by every
    login through this function; the CAPTCHA and the limits above come first.
  - Every wrong detail (unknown username, wrong password, email not confirmed) answers
    `invalid_login` (401). Also `captcha_failed` (400) when Auth refuses the token, and
    `too_many_attempts` when Auth's own limit answers 429.
  Signing in to Auth directly with an email (the publishable key can) skips this
  function, so Auth's CAPTCHA (§9) is what guards that path.
- **`admin-accounts`** (verify_jwt off: it checks the caller itself). The caller's
  `Authorization` JWT must be the coach's: `is_coach()`, called as the caller, says
  so (no JWT or an expired one → 401 `not_signed_in`; anyone else → 403 `not_coach`).
  - `create_account {username, display_name, email, phone}` → `{account_id}`. Checks
    the fields (`invalid_username`, `invalid_display_name` 1–100, `invalid_phone` ≤ 30,
    `invalid_email`) and `username_available` (`username_taken`), then
    `auth.admin.inviteUserByEmail` with the profile's details as metadata and a link to
    `/reset-password` (where the person sets a password), then `approve_account` as the
    coach. An address already registered → `email_taken` (also for an address that
    signed up with another username and never confirmed: Auth invites it again).
  - `send_password_reset {account_id}` → `{ok: true}`: emails that account a link to
    `/reset-password` (`not_found`).
  - `delete_account {account_id}` → `{ok: true}` (prompt 09): removes a sign-up the coach
    doesn't want with `auth.admin.deleteUser` (the profile goes with it). Only a customer
    account still waiting for approval with no groups: `not_found` (404; no such customer
    account), `account_approved` (409), `has_groups` (409). The checks read as the coach;
    the groups check matters because groups go with the profile but their bookings and
    payments don't.
- **`mail-queue`** (verify_jwt off; requires header `x-mail-token` equal to `MAIL_TOKEN`,
  compared in constant time). POST `{action: "claim", limit}` (`claim_outbox` caps
  `limit` at 50 and hands out reminders, digests and late alerts before other kinds): call `queue_daily_emails`
  with tomorrow's date in MYT (it queues only what is due, §5.5); then return
  `claim_outbox(limit)`, with every `{{site_url}}` in each
  row's `subject`, `body_text` and `body_html` replaced by `SITE_URL` (all occurrences:
  an HTML link has it twice; `SITE_URL` is the bare origin, no trailing slash). POST
  `{action: "ack", results: [{id, ok, error}]}` (at most 50) → `ack_outbox` for each;
  it acts only on rows still claimed and keeps the first 500 characters of `error`.
  Sent rows older than 90 days are deleted (they hold names and addresses).
- CORS on `login` and `admin-accounts`: allow only `SITE_URL`'s origin, which is
  `http://localhost:5173` on the dev project; a request from another page's origin gets
  403 `forbidden_origin`. Refusals are `{error: "<code>"}` with a 4xx status;
  anything unexpected is 500 `unknown` (`supabase/functions/_shared/http.ts`).
- Secrets: hosted functions get `SUPABASE_URL` and the new API keys
  (`SUPABASE_SECRET_KEYS`, `SUPABASE_PUBLISHABLE_KEYS`) by themselves; set `SITE_URL`
  (and `MAIL_TOKEN` in prompt 11) with `npx supabase secrets set`.

## 8. Email pipeline
Rows are added to `email_outbox` by the functions (not by the browser):

| Event | To | dedupe_key | Setting |
|---|---|---|---|
| customer books (per series; `coach_book` sends nothing) | account email | `booked:<series_id>` | booking_confirmations |
| a customer books or cancels a lesson starting within 24 h (not the coach's own changes) | coach_email (skipped while '') | `late:<booking_id>:<event>` (`booked`, `cancelled`) | late_change_alert |
| cancelled (by customer or coach) | account email | `cancelled:<booking_id>` | always |
| evening reminder | account email | `reminder:<account_id>:<date>` | always |
| coach digest | coach_email | `digest:<date>` | always |
| broadcast | each approved customer whose address is confirmed or was entered by the coach (invited) | `broadcast:<announcement_id>:<account_id>` | send_email |

Emails are short plain text plus the same text as simple HTML, sender name = the Apps
Script `SENDER_NAME` property (set to the business name), times formatted like
"Sat 3 Oct, 9:00–10:00 am", and links written as `{{site_url}}/my-classes` (also
`/book`, `/coach/schedule`, or the bare site; paths may contain `-`), which
mail-queue fills in (§7). Names, locations, reasons and messages are free text: they are
HTML-escaped in `body_html`, and `{{` in them becomes `{ {`, so only the templates' own
links carry the placeholder. Built in prompt 04 (`…_emails.sql`): the templates
`email_booked`, `email_cancelled`, `email_late_alert`, `email_broadcast`, and helpers
prompt 11 reuses for the reminder and digest (`myt_when_text` and its parts,
`email_text`, `email_html`, `queue_email`, `account_email`).

**Apps Script (`apps-script/Code.gs`)**
```js
function poll() {
  const p = PropertiesService.getScriptProperties();
  const left = MailApp.getRemainingDailyQuota();      // 100 recipients/day on Gmail
  if (left <= 0) return;
  const claim = call_(p, { action: 'claim', limit: Math.min(left, 20) });
  const results = claim.emails.map(e => {
    try {
      MailApp.sendEmail({ to: e.to_email, subject: e.subject, body: e.body_text,
                          htmlBody: e.body_html || undefined, name: p.getProperty('SENDER_NAME') });
      return { id: e.id, ok: true };
    } catch (err) { return { id: e.id, ok: false, error: String(err) }; }
  });
  if (results.length) call_(p, { action: 'ack', results });
}
function call_(p, body) {
  const res = UrlFetchApp.fetch(p.getProperty('MAIL_QUEUE_URL'), {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-mail-token': p.getProperty('MAIL_TOKEN') }, payload: JSON.stringify(body) });
  if (res.getResponseCode() !== 200) throw new Error(res.getContentText());
  return JSON.parse(res.getContentText());
}
function install() {           // run once by hand
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('poll').timeBased().everyMinutes(5).create();
}
```
Reminders therefore go out within about 5 minutes after `reminder_time`, and the digest
after `digest_time`.

## 9. Auth setup
- Supabase Auth: email + password provider on, "Confirm email" on, sign-ups on.
- Custom SMTP (required: the built-in sender only emails project team members and is
  rate-limited to a couple of messages an hour): host `smtp.gmail.com`, port 587,
  user = the coach's Gmail, password = a Google App Password (needs 2-Step
  Verification), sender name = business name. Keep the Auth email rate limit low
  (about 20–30 an hour): it is what stops strangers making the coach's Gmail send
  sign-up and reset emails to any address, which could get the account flagged.
- CAPTCHA (Cloudflare Turnstile, free): on in Auth's settings with Turnstile's secret;
  Log in, Sign up and Forgot password show the widget (site key in
  `VITE_TURNSTILE_SITE_KEY`) and send its token (`captchaToken`; `login` passes it
  on). The site's Content-Security-Policy then also allows
  `https://challenges.cloudflare.com` in `script-src` and `frame-src`. A token works
  once, so the forms ask for a fresh check after every refusal. Without the key (demo
  mode, dev) there is no widget. Cloudflare's test keys (site `1x00000000000000000000AA`,
  secret `1x0000000000000000000000000000000AA`) always pass, for trying it on dev.
- Minimum password length 8 (the app checks the same, `MIN_PASSWORD_LENGTH`).
- The dev project's seeded password is public (DEV_SETUP). Before Gmail SMTP or the Apps
  Script is connected to dev (prompt 11's end-to-end test), change the seeded accounts'
  passwords there, and disconnect Gmail from dev afterwards: otherwise anyone could sign
  in on dev as `herman` and send email from his Gmail.
- Site URL and redirect URLs: the production site and `http://localhost:5173`.
- Sign-up page calls `username_available`, then `supabase.auth.signUp` with
  `options.data = {username, display_name, phone}`. The profile trigger creates the row
  with `approved = false` (or true if `require_approval` is off).
- Coach bootstrap, before the site is announced: sign up as `herman` with the coach's
  own email and confirm it, then run `supabase/scripts/make-coach.sql`. It matches the
  confirmed email in `auth.users` (not the username, which anyone could have signed up
  with first), and stops unless exactly one row changes and no other coach exists.

## 10. Test fixture (seed.sql) and expected results
Clock for tests: `set local app.now = '2026-09-26 12:00+08'` (Sat 26 Sep 2026, noon MYT).
For clicking around the UI on the dev project, run `supabase/scripts/shift-seed.sql`,
which moves every fixture date forward by whole weeks so the fixture week is next week.
Settings: defaults. Weekly template as in §3. Every sample account's password is
`swim-test-2026` (emails `<username>@example.com`); seed rows have fixed ids (accounts
`a0…`, students `b0…`, groups `c0…`, bookings `d0…`, payments `e0…`). The database tests
need the seed exactly as loaded (not shifted).
The UI always runs at the real time (`app_now()` ignores `app.now` for API requests), so
after shift-seed the screens show the balances below only on the shifted Saturday between
10:00 and 18:00 MYT. At any other time compare screens with `select * from group_balance`
run as the coach at that moment; `tests/db/balance.test.ts` checks the table itself.

Accounts, groups (location; opening used/paid; payments) and bookings (MYT):
| Account | Group | Type | Location | Opening used/paid | Payments | Bookings |
|---|---|---|---|---|---|---|
| meiling | Aiman & Sofia | 1-to-2 | Palm Court | 12 / 12 | 4 on 19 Sep, FPX | Sat 26 Sep 17:00–18:00; Sat 3 Oct 09:00–10:00 |
| meiling | Sofia | 1-to-1 | Palm Court | 7 / 4 | 4 on 29 Aug, transfer | Sun 4 Oct 17:00–18:00 |
| farah | Hana | 1-to-1 | Sunrise Res. | 20 / 16 | 4 on 22 Aug, cash | Sat 26 Sep 19:30–20:30; Sat 3 Oct 17:00–18:00 |
| weijie | Wei Jie | 1-to-1 | Palm Court | 4 / 0 | 4 on 16 Aug, FPX | Fri 18 Sep & Fri 25 Sep 19:30–20:30 (past); Fri 2 Oct 19:30–20:30 |
| priya | Priya | 1-to-1 | Seri Maya | 14 / 12 | 4 on 5 Sep, cash | Tue 29 Sep 17:30–18:30; Thu 1 Oct 17:30–18:30 |
| zulaikha | Adam, Alya & Amir | 1-to-3 | Maple Condo | 0 / 0 | 4 on 18 Sep, cash | Sat 19 Sep 11:00–12:00 (past); Sat 3 Oct 11:00–12:00 |
| junhao | Jun Hao | 1-to-1 | Vista Heights | 5 / 4 | 4 on 1 Sep, transfer | Mon 28 Sep 19:30–20:30 |
| grace | Chloe | 1-to-1 | Vista Heights | 8 / 8 | 4 on 20 Sep, FPX | Sun 4 Oct 10:00–12:00 |
| ethan | Ethan | 1-to-1 | Kiara Park | 24 / 24 | 4 on 12 Sep, cash | Sat 26 Sep 09:00–10:00 (past); Sun 4 Oct 08:00–09:00 |
| kai | Kai | 1-to-1 | Palm Court | 0 / 0 | 4 on 24 Sep, FPX | Fri 2 Oct 21:00–22:00 (gap_override) |
| daniel | Daniel | 1-to-1 | Kiara Park | 0 / 0 | 4 on 21 Sep, cash | Wed 30 Sep 20:30–21:30 |
| aina | Aina | 1-to-1 | Maple Condo | 0 / 0 | 4 on 21 Sep, transfer | Thu 1 Oct 20:30–21:30 |
| nurul | Nurul | 1-to-1 | Seri Maya | 2 / 4 | none | Sun 4 Oct 19:00–20:00 |

Expected `group_balance` at that clock:
| Group | Package | Used in pkg | Booked | Left | Status | Flag |
|---|---|---|---|---|---|---|
| Aiman & Sofia | 4 | 0 | 2 | 2 | Paid | |
| Sofia | 2 | 3 | 1 | 0 | Paid | last lesson Sun 4 Oct |
| Hana | 6 | 0 | 2 | 2 | Unpaid | since Sat 26 Sep |
| Wei Jie | 2 | 2 | 1 | 1 | Unpaid | since Fri 18 Sep |
| Priya | 4 | 2 | 2 | 0 | Paid | last lesson Thu 1 Oct |
| Adam, Alya & Amir | 1 | 1 | 1 | 2 | Paid | |
| Jun Hao | 2 | 1 | 1 | 2 | Paid | |
| Chloe | 3 | 0 | 2 | 2 | Paid | |
| Ethan | 7 | 1 | 1 | 2 | Paid | |
| Kai | 1 | 0 | 1 | 3 | Paid | |

Expected free start times, week of Mon 28 Sep (any customer group; 1 h / 2 h):
| Day | 1 hour | 2 hours |
|---|---|---|
| Mon 28 | 5:30 pm | none |
| Tue 29 | 7:30, 8:00, 8:30, 9:00 pm | 7:30, 8:00 pm |
| Wed 30 | 5:30, 6:00, 6:30 pm | 5:30 pm |
| Thu 1 | none | none |
| Fri 2 | 5:30 pm | none |
| Sat 3 | 7:00 am; 7:00, 7:30, 8:00, 8:30, 9:00 pm | 7:00, 7:30, 8:00 pm |
| Sun 4 | 9:00 pm | none |

Expected reasons (1 hour; viewer = meiling):
Tue 5:30 pm and 6:00 pm `overlap_other`; Tue 6:30 pm and 7:00 pm `gap_after` (ends 6:30 pm);
Wed 7:00 pm `gap_before` (8:30 pm lesson); Sat 9:00 am `overlap_mine` (Aiman & Sofia);
Sat 10:00 am `gap_after` (ends 10:00 am); Sun 5:00 pm `overlap_mine` (Sofia);
Mon 26 Oct 5:30 pm `outside_window`.

Other required tests: booking Sofia (1-to-1) Tue 7:30 pm succeeds and makes the group
Unpaid: `group_balance` still says Package 2 (7 of its 8 paid lessons used, none left to
book in it), unpaid since Sun 4 Oct; in `booking_ledger` the new lesson takes the last
place in Package 2 and Sunday's becomes Package 3 lesson 1 (numbers follow lesson order,
BR-23), so the UI's "New bookings start Package 3" is `package_no + 1` when
`left_in_package` is 0; Wei Jie can book 1 more lesson but not 2 (`credit_exceeded`);
cancelling Sat 3 Oct 9:00 am works at 02:59 and fails `locked` at 03:01 that day;
two concurrent `book_lesson` calls for the same slot → exactly one succeeds (tested with
two connections that never commit: the second waits for the first's lock and gives up
after a lock timeout; the refusal it would get after a commit is tested in one
transaction);
repeat weekly with a clash inserts nothing and returns the dates; an 'open' exception on
Wed 7 Oct 15:00–17:30 merges with the 17:30 rule and adds 1-hour starts at 3:00, 3:30, 4:00,
4:30 and 5:00 pm on that day only; a 'closed' exception over them removes them again; RLS: meiling cannot select other accounts' bookings, and `week_busy` contains no
names; `queue_daily_emails` twice for the same date creates one reminder per account.

## 11. Frontend
- Routes (ARCHITECTURE §3.5; written once in `src/shared/config/routes.ts`): `/login`,
  `/signup`, `/forgot-password`, `/reset-password`, `/pending`, `/book`, `/schedule`,
  `/my-classes`, `/account`, `/coach/schedule`, `/coach/students`,
  `/coach/add-students`, `/coach/settings`. Customers land on `/book`, the coach on
  `/coach/schedule`.
- Guards: signed in → approved → role. Unapproved customers see `/pending` only.
- Data: TanStack Query; one query per RPC; invalidate `week_slots`, `week_busy`,
  `group_balance` after booking or cancelling. Realtime is not needed.
- Time: `date-fns` with `@date-fns/tz` (`TZDate`, `Asia/Kuala_Lumpur`) or `Intl.DateTimeFormat`
  with `timeZone`. Never use the device's local time zone for business dates.
- Formatting: "7:30 pm", "Sat 3 Oct", ranges "9:00–10:00 am" / "11:00 am–12:00 pm".
- Reason codes → messages in one module (`src/shared/config/messages.ts`), unit tested.
- Types: `npm run db:types` (`supabase gen types typescript`) into
  `src/shared/api/database.types.ts`.
- PWA: a web manifest and icons so "Add to Home Screen" works; no offline caching of API data.

## 12. Deployment and operations
- **Cloudflare**: `wrangler.jsonc`
  ```jsonc
  { "name": "swimclass", "compatibility_date": "2026-09-27",
    "assets": { "directory": "./dist", "not_found_handling": "single-page-application" } }
  ```
  Build with production env vars in `.env.production.local` (it wins over `.env.local`,
  which holds the dev project's), then `npx wrangler deploy`. The build refuses secret
  keys in `VITE_` values and writes `dist/_headers`: the Content-Security-Policy (only the
  site's own files and the Supabase project), frame-ancestors 'none', HSTS, nosniff,
  Referrer-Policy, Permissions-Policy (`vite.config.ts`). After deploying, check them with
  `curl -I`. Optional custom domain
  (for example `swimclass.online`) is added to the Worker in the Cloudflare dashboard.
- **Supabase prod**: create in Singapore; mark it as production before anything else
  (`create role swimclass_production nologin;` in its SQL editor: `seed.sql` refuses to run
  where this role exists); `supabase link`; `supabase db push` (never the seed); deploy the
  three functions; set secrets; configure Auth (§9); update the settings row (the
  migration creates it) with the coach's email; add the open hours; bootstrap the coach;
  link the CLI back to the dev project.
- **Apps Script**: new project in the coach's Google account, paste `apps-script/Code.gs`,
  set script properties, run `install()` once and approve the permissions.
- **Backups**: `.github/workflows/backup.yml` weekly (`cron: '0 18 * * 6'`, Sunday
  2 am MYT) dumps the schema and, separately, the data (`supabase db dump --db-url
  "$SUPABASE_DB_URL"`, then again with `--data-only`; the default is the schema only),
  encrypts both with `age` to Herman's public key (`BACKUP_AGE_RECIPIENT`), and uploads
  only the encrypted files as an artifact kept 90 days. The repo is public, so anyone
  signed in to GitHub can download artifacts: an unencrypted dump would publish every
  customer's name, email and phone. The private key stays off GitHub, with Herman.
  `SUPABASE_DB_URL` is a GitHub secret.
- **Go-live data**: add each current customer's groups with starting balances (BR-25),
  then enter upcoming lessons with Add booking (`coach_book`): in the past or beyond the
  booking window if needed, Skip travel gap for tight pairs, Outside open hours for times
  outside them or off the start step, Book anyway for groups past their credit.

## 13. Security checklist
- RLS on every table; views are `security_invoker`; no table grants without a policy.
- Every function sets `search_path = ''`, checks the caller, validates input.
- `execute` revoked from `public`/`anon` except `username_available`; `authenticated` gets
  only the RPCs the browser calls.
- Secret key and `MAIL_TOKEN` only in Edge Function secrets and Apps Script properties.
- Login rate limit per username and IP (§7), Auth CAPTCHA and a low Auth email limit
  (§9); identical error for unknown username and wrong password.
- A customer books or cancels at most 10 times in 24 hours (§5.2).
- Security headers and a strict Content-Security-Policy on every page (§12).
- Backups encrypted before they leave Supabase (§12).
- No personal data in URLs; customers never receive other customers' names or contacts.
- Dependencies pinned; `npm audit` clean before deploy.

## 14. Free-tier limits to watch
- Supabase free: 500 MB database, 50,000 monthly active users, 500,000 Edge Function
  calls a month, 2 projects, pauses after a week with no requests (the poller prevents
  this), no automatic backups (hence §12).
- Gmail through Apps Script: 100 recipients a day on a normal Gmail account.
- Cloudflare: static asset requests are free and unlimited.
- Apps Script: time-trigger runtime is limited per day; each poll must stay short
  (claim at most 20 emails per run).
