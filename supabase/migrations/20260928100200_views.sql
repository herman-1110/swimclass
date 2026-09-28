-- The clock and the derived views (TECH_SPEC §4, §5).
-- Lessons are counted from bookings and payments, never stored (CLAUDE.md rule 4).

-- The current time for all business logic. Direct database connections (tests, the
-- SQL editor) can pin it with `set local app.now = '2026-09-26 12:00+08'`. API
-- requests arrive through PostgREST, whose session user is `authenticator`; for them
-- the setting is ignored, so a customer can never fake the time to dodge the cutoff.
-- It reads no tables, so it doesn't need security definer.
create function public.app_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select case
    when session_user <> 'authenticator'
      then coalesce(nullif(current_setting('app.now', true), '')::timestamptz, now())
    else now()
  end
$$;

-- Lessons used by one booking: its length in hours (bookings_length allows 1 or 2).
create function public.lessons_for(p_starts_at timestamptz, p_ends_at timestamptz)
returns int
language sql
immutable
set search_path = ''
as $$
  select (extract(epoch from p_ends_at - p_starts_at) / 3600)::int
$$;

-- The two package settings the views need. The views run with the caller's rights
-- (security_invoker) and customers can't read `settings`, so this reads them for them.
create function public.package_settings()
returns table (lessons_per_package int, unpaid_packages_allowed int)
language sql
stable
security definer
set search_path = ''
as $$
  select s.lessons_per_package, s.unpaid_packages_allowed
  from public.settings s
  where s.id = 1
$$;

-- One row per group: members, type and display names ("Aiman & Sofia",
-- "Adam, Alya & Amir"; names in alphabetical order).
create view public.group_details
with (security_invoker = true)
as
select
  g.id as group_id,
  g.account_id,
  g.location,
  g.active,
  g.opening_used_lessons,
  g.opening_paid_lessons,
  g.created_at,
  m.size,
  '1-to-' || m.size as type_label,
  case
    when m.size <= 1 then m.names[1]
    else array_to_string(m.names[1:m.size - 1], ', ') || ' & ' || m.names[m.size]
  end as display_names,
  m.student_ids
from public.groups g
cross join lateral (
  select
    count(*)::int as size,
    array_agg(s.name order by s.name, s.id) as names,
    array_agg(s.id order by s.name, s.id) as student_ids
  from public.group_members gm
  join public.students s on s.id = gm.student_id
  where gm.group_id = g.id
) m;

-- Every counted ('booked') booking per group in start order, with its lesson
-- numbers. Numbering starts after opening_used_lessons; a 2-hour lesson takes two
-- numbers. package_no = ceil(first_index / lessons_per_package) (BR-23), used for
-- labels like "Package 4, lesson 2 of 4". `used` = its end time has passed (BR-19).
create view public.booking_ledger
with (security_invoker = true)
as
with counted as (
  select
    b.id as booking_id,
    b.group_id,
    b.starts_at,
    b.ends_at,
    public.lessons_for(b.starts_at, b.ends_at) as lessons,
    g.opening_used_lessons
      + sum(public.lessons_for(b.starts_at, b.ends_at))
          over (partition by b.group_id order by b.starts_at, b.id) as last_index
  from public.bookings b
  join public.groups g on g.id = b.group_id
  where b.status = 'booked'
)
select
  c.booking_id,
  c.group_id,
  c.starts_at,
  c.ends_at,
  c.lessons,
  (c.last_index - c.lessons + 1)::int as first_index,
  c.last_index::int as last_index,
  ((c.last_index - c.lessons) / ps.lessons_per_package + 1)::int as package_no,
  ((c.last_index - c.lessons) % ps.lessons_per_package + 1)::int as lesson_in_package,
  c.ends_at <= public.app_now() as used
from counted c
cross join public.package_settings() ps;

-- Balance per group as of app_now() (TECH_SPEC §4, BR-19 to BR-25).
--   package_no          floor(used / package_size) + 1
--   unpaid              used + booked > paid
--   unpaid_since        start of the first lesson past paid_lessons (null when that
--                       lesson is in the opening balance, before the system)
--   can_still_book      paid + unpaid_packages_allowed × package_size − used − booked
--                       (BR-21; negative if the coach booked past the limit)
--   last_lesson_at      start of the upcoming lesson that uses the last paid lesson,
--                       when used + booked = paid (BR-22)
create view public.group_balance
with (security_invoker = true)
as
with ledger as (
  select * from public.booking_ledger
),
totals as (
  select
    g.id as group_id,
    g.account_id,
    ps.lessons_per_package as package_size,
    ps.unpaid_packages_allowed,
    g.opening_paid_lessons + coalesce(p.lessons, 0) as paid_lessons,
    g.opening_used_lessons + coalesce(l.used, 0) as used_lessons,
    coalesce(l.booked, 0) as booked_lessons
  from public.groups g
  cross join public.package_settings() ps
  left join lateral (
    select sum(py.lessons)::int as lessons
    from public.payments py
    where py.group_id = g.id
  ) p on true
  left join lateral (
    select
      (sum(le.lessons) filter (where le.used))::int as used,
      (sum(le.lessons) filter (where not le.used))::int as booked
    from ledger le
    where le.group_id = g.id
  ) l on true
),
packages as (
  select
    t.*,
    t.used_lessons / t.package_size + 1 as package_no,
    t.used_lessons % t.package_size as used_in_package
  from totals t
)
select
  k.group_id,
  k.account_id,
  k.package_size,
  k.paid_lessons,
  k.used_lessons,
  k.booked_lessons,
  k.package_no,
  k.used_in_package,
  least(k.booked_lessons, k.package_size - k.used_in_package) as booked_in_package,
  k.package_size - k.used_in_package
    - least(k.booked_lessons, k.package_size - k.used_in_package) as left_in_package,
  k.used_lessons + k.booked_lessons > k.paid_lessons as unpaid,
  (
    select le.starts_at
    from ledger le
    where le.group_id = k.group_id
      and k.paid_lessons + 1 between le.first_index and le.last_index
  ) as unpaid_since,
  k.paid_lessons + k.unpaid_packages_allowed * k.package_size
    - k.used_lessons - k.booked_lessons as can_still_book,
  case when k.used_lessons + k.booked_lessons = k.paid_lessons then (
    select le.starts_at
    from ledger le
    where le.group_id = k.group_id and le.last_index = k.paid_lessons and not le.used
  ) end as last_lesson_at,
  lp.paid_on as last_paid_on,
  lp.method as last_payment_method
from packages k
left join lateral (
  select py.paid_on, py.method
  from public.payments py
  where py.group_id = k.group_id
  order by py.paid_on desc, py.created_at desc, py.id desc
  limit 1
) lp on true;
