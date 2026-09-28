-- Tables, constraints and indexes (TECH_SPEC §3).
-- Business dates and weekdays are computed in Asia/Kuala_Lumpur; weekdays use ISO
-- numbering (1 = Monday … 7 = Sunday). Balances are never stored: see the views.

create type public.app_role as enum ('coach', 'customer');
create type public.booking_status as enum ('booked', 'cancelled', 'excused');
create type public.payment_method as enum ('cash', 'transfer', 'fpx', 'free', 'other');
create type public.exception_kind as enum ('closed', 'open');

-- One row per auth user, created by a trigger (see the triggers migration).
-- Email stays in auth.users so it never has to be exposed through this table.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._]{3,30}$'),  -- BR-1
  display_name text not null check (length(btrim(display_name)) between 1 and 100),
  phone text check (length(phone) <= 30),
  role public.app_role not null default 'customer',
  approved boolean not null default false,                                -- BR-2
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index students_account_id_idx on public.students (account_id);

-- 1 to 3 students of one account who always book together (BR-6). The type
-- (1-to-1/2/3) is the member count, so it isn't stored.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles on delete cascade,
  location text not null check (length(btrim(location)) between 1 and 100),
  active boolean not null default true,
  opening_used_lessons int not null default 0 check (opening_used_lessons >= 0),  -- BR-25
  opening_paid_lessons int not null default 0 check (opening_paid_lessons >= 0),  -- BR-25
  created_at timestamptz not null default now()
);
create index groups_account_id_idx on public.groups (account_id);

create table public.group_members (
  group_id uuid not null references public.groups on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  primary key (group_id, student_id)
);
create index group_members_student_id_idx on public.group_members (student_id);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text not null,                          -- copied from the group when booked
  status public.booking_status not null default 'booked',
  gap_override boolean not null default false,     -- coach only (BR-10, BR-31)
  series_id uuid,                                  -- shared by repeat-weekly bookings
  created_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles,
  cancel_reason text,
  constraint bookings_ends_after_start check (ends_at > starts_at),
  -- A lesson is 1 or 2 hours and uses that many lessons from the package (BR-8, BR-19).
  constraint bookings_length check (ends_at - starts_at in (interval '1 hour', interval '2 hours')),
  -- BR-14 safety net: two booked lessons can never overlap, even when two bookings
  -- arrive at the same moment. A range-only exclusion works with plain gist, so the
  -- btree_gist extension isn't needed.
  constraint bookings_no_overlap
    exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
    where (status = 'booked')
);
create index bookings_starts_at_idx on public.bookings (starts_at);
create index bookings_group_id_starts_at_idx on public.bookings (group_id, starts_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups,
  lessons int not null check (lessons > 0),
  amount_cents int not null check (amount_cents >= 0),
  method public.payment_method not null,
  paid_on date not null,
  note text,
  gateway_ref text unique,                         -- for online payments later
  created_by uuid references public.profiles,
  created_at timestamptz not null default now()
);
create index payments_group_id_idx on public.payments (group_id);

-- Weekly template of open hours in MYT wall-clock time (BR-29).
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 1 and 7),
  opens_at time not null,
  closes_at time not null,
  constraint availability_rules_closes_after_opens check (closes_at > opens_at)
);

-- One-off "Block time" (closed) and "Open extra time" (open) ranges (BR-30).
create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind public.exception_kind not null,
  note text,
  created_at timestamptz not null default now(),
  constraint availability_exceptions_ends_after_start check (ends_at > starts_at)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null check (length(message) between 1 and 1000),
  pinned boolean not null default true,
  send_email boolean not null default true,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  removed_at timestamptz
);

-- Exactly one row (id = 1). Settings drive behaviour; never hard-code these values.
create table public.settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'Swim Class'
    check (length(btrim(business_name)) between 1 and 100),
  -- Empty until the coach's address is set (seed, or prod setup in prompt 12).
  coach_email text not null default ''
    check (coach_email = '' or coach_email ~ '^[^@\s]+@[^@\s]+$'),
  travel_gap_minutes int not null default 60 check (travel_gap_minutes between 0 and 180),
  start_step_minutes int not null default 30 check (start_step_minutes in (15, 30, 60)),
  lesson_lengths int[] not null default '{60,120}'
    check (cardinality(lesson_lengths) >= 1 and lesson_lengths <@ '{60,120}'),
  max_students_per_lesson int not null default 3 check (max_students_per_lesson between 1 and 3),
  cancel_cutoff_hours int not null default 6 check (cancel_cutoff_hours between 0 and 72),
  booking_window_weeks int not null default 4 check (booking_window_weeks between 1 and 12),
  lessons_per_package int not null default 4 check (lessons_per_package between 1 and 20),
  unpaid_packages_allowed int not null default 1 check (unpaid_packages_allowed between 0 and 2),
  price_1to1_cents int check (price_1to1_cents >= 0),
  price_1to2_cents int check (price_1to2_cents >= 0),
  price_1to3_cents int check (price_1to3_cents >= 0),
  payment_instructions text,                       -- shown to customers (bank / DuitNow)
  lesson_expiry_months int check (lesson_expiry_months > 0),  -- null = never (BR-24)
  reminder_time time not null default '20:00',
  digest_time time not null default '20:00',
  booking_confirmations boolean not null default true,
  late_change_alert boolean not null default true,
  require_approval boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);

-- Filled by database functions, sent by Apps Script through the mail-queue Edge
-- Function (TECH_SPEC §8). Service role only.
create table public.email_outbox (
  id bigint generated always as identity primary key,
  to_email text not null,
  subject text not null,
  body_text text not null,
  body_html text,
  kind text not null,                  -- reminder, digest, booked, cancelled, late_alert, broadcast
  dedupe_key text unique,              -- BR-37: never send the same email twice
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text
);

create table public.daily_jobs (
  job text not null,
  for_date date not null,
  done_at timestamptz not null default now(),
  primary key (job, for_date)
);

-- Written by the login Edge Function for the BR-4 rate limit. Service role only.
create table public.login_attempts (
  id bigint generated always as identity primary key,
  username text not null,
  attempted_at timestamptz not null default now(),
  ok boolean not null
);
create index login_attempts_username_attempted_at_idx
  on public.login_attempts (username, attempted_at);
