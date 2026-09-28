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
  location text not null,              -- copied from the group when booked
  status booking_status not null default 'booked',
  gap_override boolean not null default false,  -- coach only (BR-10, BR-31)
  series_id uuid,                      -- shared by repeat-weekly bookings
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
  lesson_expiry_months int,              -- null = never (BR-24)
  reminder_time time not null default '20:00',
  digest_time time not null default '20:00',
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

login_attempts (id bigint identity pk, username text not null,
                attempted_at timestamptz not null default now(), ok boolean not null)
```

The schema migration inserts the `settings` row with the defaults (coach_email '').
The seed sets coach_email and adds the weekly template:
Mon–Fri 17:30–22:00; Sat and Sun 07:00–12:00 and 16:00–22:00.

Triggers: a profile is created for every new `auth.users` row; `group_members` checks
same account (`student_other_account`) and size (`group_full`); a group always keeps a
member (`group_empty`, checked at commit); moving a group or student to another account
is refused; `settings.updated_at` is set on update.

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
The frontend maps codes to messages (DESIGN.md §6).

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
- `slot_check(p_starts_at, p_minutes, p_group_id, p_viewer uuid) returns table (ok bool, reason text, detail jsonb)`.
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
  account. It applies the customer rules; the coach's options (outside open hours, skip
  the gap) need a variant, see §5.2.
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
- `book_lesson(p_group_id, p_starts_at, p_minutes, p_repeat_weeks int default 1) returns uuid[]`
  - caller approved and owns the group (`not_approved`, `not_your_group`), group active
  - lock the group first (`select … from groups where id = p_group_id for no key update`)
    so two bookings for one group on different dates can't both pass the credit check,
    then take `pg_advisory_xact_lock` on each affected MYT date (sorted) to serialise
    competing bookings, then run `slot_check` for every week (`repeat_conflict` with
    `detail.dates` if any week fails; nothing is inserted). The affected dates are every
    MYT date that `[starts_at − travel gap, ends_at + travel gap)` touches, for every
    week: the gap check crosses midnight (a lesson ending 23:30 blocks 00:00 the next
    day), so locking only the lesson's own date would let two such bookings race. Take
    the locks before calling `slot_check`, and pass the caller as `p_viewer`.
    Repeat weeks: add whole days as dates in MYT (or `make_interval(hours => 168 * k)`),
    never `interval '7 days'` on a timestamptz, which follows the session's daylight saving.
  - credit: lessons needed <= `can_still_book` (`credit_exceeded`)
  - insert rows with a shared `series_id`; queue emails (§8)
- `coach_book(p_group_id, p_starts_at, p_minutes, p_repeat_weeks, p_ignore_open_hours bool, p_gap_override bool, p_ignore_credit bool)`:
  coach only; overlaps still impossible; gap only skipped when `p_gap_override`.
  `slot_check` stops at the first failure, so outside open hours it never reaches the
  overlap and gap checks: prompt 04 gives it options for the coach (a new migration that
  drops and recreates it with extra parameters defaulting to the customer rules, e.g.
  `p_ignore_open_hours`, `p_ignore_gap`, and decides whether the coach is bound by
  `past` and the booking window) instead of copying its queries. The Add booking
  dialog's live clash reason (prompt 08) comes from a coach-only RPC over the same
  check, `coach_slot_check(p_group_id, p_starts_at, p_minutes, p_ignore_open_hours,
  p_gap_override)`, granted to `authenticated` and checking `is_coach()` first:
  `slot_check` itself stays without a grant.
- `cancel_booking(p_booking_id, p_reason text default null)`: owner allowed only
  while `app_now() <= starts_at - cancel_cutoff_hours` (`locked`); coach any time
  (`cancelled_by` records who). Status becomes 'cancelled'; queue emails.
- `excuse_booking(p_booking_id)`: coach only; status 'excused'.
- `record_payment(p_group_id, p_lessons, p_amount_cents, p_method, p_paid_on, p_note)`: coach only.
- `add_free_lesson(p_group_id, p_note)`: coach only; payment of 1 lesson, RM 0, method 'free'.

### 5.3 Students, groups and accounts
- `create_group(p_account_id, p_students jsonb, p_location, p_first_package_paid bool, p_amount_cents int, p_method, p_opening_used int default 0, p_opening_paid int default 0) returns uuid`:
  coach only. `p_students` items are `{"student_id": ...}` (existing) or `{"name": ...}` (new).
  1..max_students_per_lesson items. Refuse an exact duplicate of an active group.
- `update_group(...)`, `set_group_active(p_group_id, p_active)`: coach only.
- `approve_account(p_account_id)`, `username_available(p_username) returns boolean`
  (callable by anon; returns only true/false).

### 5.4 Open hours, settings, announcements
- `set_open_hours(p_rules jsonb)` (replace all weekly rules), `add_exception(...)`,
  `remove_exception(p_id)`, `update_settings(p jsonb)`: coach only, validated.
- `post_announcement(p_message, p_send_email)`, `remove_announcement(p_id)`: coach only.
- `get_public_settings()`: fields customers need (lengths, step, cutoff, window,
  travel gap (for the `{gap}` in DESIGN §6 messages), package size, prices,
  payment_instructions, business_name).
- All §5.4 functions are built in prompt 04; prompts 06, 08 and 10 use them.

### 5.5 Email queue (service role only; called by the `mail-queue` Edge Function)
- `queue_daily_emails(p_for_date date)`: for tomorrow in MYT: one reminder per account
  (dedupe `reminder:<account>:<date>`) and one coach digest (`digest:<date>`). Records
  `daily_jobs('daily', date)`; running it twice changes nothing.
- `claim_outbox(p_limit int) returns setof email_outbox`: marks unsent rows whose
  claim is empty or older than 15 minutes, oldest first.
- `ack_outbox(p_id, p_ok, p_error)`.

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
| availability_rules, availability_exceptions | select (exceptions: not `note`, the coach's private text) | all (exception notes read through coach functions) |
| announcements | select where removed_at is null | all |
| settings | none (use `get_public_settings`) | select/update |
| email_outbox, daily_jobs, login_attempts | none | none (service role only) |

The RLS migration removes the default privileges, so every new table, view and function
starts with no access for `public`, `anon` and `authenticated`. Grant `execute` to
`authenticated` on every RPC the browser calls, whether a customer or the coach calls it
(the coach signs in as `authenticated` too); coach-only functions check `is_coach()`
first. Internal helpers (`open_windows`, `slot_check`: its `p_viewer` would let a caller
see another account's names; `lesson_travel`, `myt_text`) and the service-role email
functions get no grant; `anon` gets only `username_available`. `week_slots` and
`week_busy` also refuse accounts waiting for approval (`not_approved`): anyone can sign
up, and the coach's busy times show where he is.

## 7. Edge Functions (Deno, `supabase/functions/`)
- **`login`** (verify_jwt off). POST `{username, password}`. Checks `login_attempts`
  (10 failures in 15 min for that username → `too_many_attempts`). Looks up the
  user's email with the secret-key client, signs in with email + password, records the
  attempt, returns the session. Any failure returns `invalid_login` only.
  Browser then calls `supabase.auth.setSession(...)`.
- **`admin-accounts`** (JWT required; coach only). `create_account {username,
  display_name, email, phone}` → `auth.admin.inviteUserByEmail` with metadata, sets
  `approved = true`. `send_password_reset {account_id}`.
- **`mail-queue`** (verify_jwt off; requires header `x-mail-token` equal to `MAIL_TOKEN`,
  compared in constant time). POST `{action: "claim", limit}`: if the MYT time is past
  `reminder_time` and `daily_jobs` has no row for today, call `queue_daily_emails`
  for tomorrow; then return `claim_outbox(limit)`. POST `{action: "ack", results:
  [{id, ok, error}]}` → `ack_outbox` for each.
- CORS on `login` and `admin-accounts`: allow only `SITE_URL` (and localhost in dev).

## 8. Email pipeline
Rows are added to `email_outbox` by the functions (not by the browser):

| Event | To | dedupe_key | Setting |
|---|---|---|---|
| customer books (per series) | account email | `booked:<series_id>` | booking_confirmations |
| booking or cancellation starting within 24 h | coach_email | `late:<booking_id>:<event>` | late_change_alert |
| cancelled (by customer or coach) | account email | `cancelled:<booking_id>` | always |
| evening reminder | account email | `reminder:<account_id>:<date>` | always |
| coach digest | coach_email | `digest:<date>` | always |
| broadcast | each approved customer | `broadcast:<announcement_id>:<account_id>` | send_email |

Emails are short plain text plus simple HTML, sender name = `business_name`,
times formatted like "Sat 3 Oct, 9:00–10:00 am", and a link to the site.

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
Reminders therefore go out within about 5 minutes after `reminder_time`.

## 9. Auth setup
- Supabase Auth: email + password provider on, "Confirm email" on, sign-ups on.
- Custom SMTP (required: the built-in sender only emails project team members and is
  rate-limited to a couple of messages an hour): host `smtp.gmail.com`, port 587,
  user = the coach's Gmail, password = a Google App Password (needs 2-Step
  Verification), sender name = business name. Raise the Auth email rate limit to
  what's needed.
- Site URL and redirect URLs: the production site and `http://localhost:5173`.
- Sign-up page calls `username_available`, then `supabase.auth.signUp` with
  `options.data = {username, display_name, phone}`. The profile trigger creates the row
  with `approved = false` (or true if `require_approval` is off).
- Coach bootstrap: sign up as `herman`, then in SQL:
  `update profiles set role = 'coach', approved = true where username = 'herman';`

## 10. Test fixture (seed.sql) and expected results
Clock for tests: `set local app.now = '2026-09-26 12:00+08'` (Sat 26 Sep 2026, noon MYT).
For clicking around the UI on the dev project, run `supabase/snippets/shift-seed.sql`,
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
Unpaid (Package 3); Wei Jie can book 1 more lesson but not 2 (`credit_exceeded`);
cancelling Sat 3 Oct 9:00 am works at 02:59 and fails `locked` at 03:01 that day;
two concurrent `book_lesson` calls for the same slot → exactly one succeeds;
repeat weekly with a clash inserts nothing and returns the dates; an 'open' exception on
Wed 7 Oct 15:00–17:30 merges with the 17:30 rule and adds 1-hour starts at 3:00, 3:30, 4:00,
4:30 and 5:00 pm on that day only; a 'closed' exception over them removes them again; RLS: meiling cannot select other accounts' bookings, and `week_busy` contains no
names; `queue_daily_emails` twice for the same date creates one reminder per account.

## 11. Frontend
- Routes: `/login`, `/signup`, `/forgot`, `/reset`, `/pending`, `/book`, `/schedule`,
  `/classes`, `/account`, `/coach/schedule`, `/coach/students`, `/coach/students/new`,
  `/coach/settings`. Customers land on `/book`, the coach on `/coach/schedule`.
- Guards: signed in → approved → role. Unapproved customers see `/pending` only.
- Data: TanStack Query; one query per RPC; invalidate `week_slots`, `week_busy`,
  `group_balance` after booking or cancelling. Realtime is not needed.
- Time: `date-fns` with `@date-fns/tz` (`TZDate`, `Asia/Kuala_Lumpur`) or `Intl.DateTimeFormat`
  with `timeZone`. Never use the device's local time zone for business dates.
- Formatting: "7:30 pm", "Sat 3 Oct", ranges "9:00–10:00 am" / "11:00 am–12:00 pm".
- Reason codes → messages in one module (`src/lib/reasons.ts`), unit tested.
- Types: `supabase gen types typescript` into `src/lib/database.types.ts`.
- PWA: a web manifest and icons so "Add to Home Screen" works; no offline caching of API data.

## 12. Deployment and operations
- **Cloudflare**: `wrangler.jsonc`
  ```jsonc
  { "name": "swimclass", "compatibility_date": "2026-09-27",
    "assets": { "directory": "./dist", "not_found_handling": "single-page-application" } }
  ```
  Build with production env vars, then `npx wrangler deploy`. Optional custom domain
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
  2 am MYT) runs `supabase db dump --db-url "$SUPABASE_DB_URL"` and uploads the file as
  an artifact kept 90 days. `SUPABASE_DB_URL` is a GitHub secret.
- **Go-live data**: add each current customer's groups with starting balances (BR-25),
  then enter upcoming lessons with `coach_book`.

## 13. Security checklist
- RLS on every table; views are `security_invoker`; no table grants without a policy.
- Every function sets `search_path = ''`, checks the caller, validates input.
- `execute` revoked from `public`/`anon` except `username_available`; `authenticated` gets
  only the RPCs the browser calls.
- Secret key and `MAIL_TOKEN` only in Edge Function secrets and Apps Script properties.
- Login rate limit; identical error for unknown username and wrong password.
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
