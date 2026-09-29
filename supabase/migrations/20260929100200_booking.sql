-- Booking, cancelling, excusing and payments (TECH_SPEC §5.2; PRD BR-10, BR-13 to BR-21,
-- BR-31). Every rule is checked here; the browser only asks (CLAUDE.md rule 1).
--
-- Two bookings that clash can never both succeed (BR-14), even when they arrive at the
-- same moment:
--   1. A booking first locks its group row, so two bookings for one group queue up and
--      the second one's credit check sees the first one's lessons.
--   2. Then it takes an advisory lock on every MYT date that each of its lessons plus
--      the travel gap touches (the gap check crosses midnight: a lesson ending 23:30
--      blocks 00:00 the next day), in date order. Two bookings that could clash always
--      share one of these locks, and nobody waits for anybody in a circle.
--   3. Only then does it run slot_check and insert. These functions are volatile, so
--      each statement sees everything committed before it: a booking that waited for a
--      lock sees the lessons of the booking that held it.
-- The bookings_no_overlap constraint stays underneath as the backstop for overlaps.

-- Step 2's locks, held until the transaction ends. The key is (20260929, days since
-- 2000-01-01); 20260929 is this app's namespace for booking-date locks. Internal.
create function public.lock_booking_dates(p_starts timestamptz[], p_minutes int)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_gap interval;
  v_day date;
begin
  select make_interval(mins => s.travel_gap_minutes) into v_gap
  from public.settings s
  where s.id = 1;

  for v_day in
    select distinct d.first_day + i.n
    from (
      select
        ((w.starts_at - v_gap) at time zone 'Asia/Kuala_Lumpur')::date as first_day,
        ((w.starts_at + make_interval(mins => p_minutes) + v_gap)
          at time zone 'Asia/Kuala_Lumpur')::date as last_day
      from unnest(p_starts) as w (starts_at)
    ) d
    cross join lateral generate_series(0, d.last_day - d.first_day) as i (n)
    order by 1
  loop
    perform pg_advisory_xact_lock(20260929, v_day - date '2000-01-01');
  end loop;
end;
$$;

-- The default amount for p_lessons lessons of a group: its type's package price
-- (price_1to1_cents … price_1to3_cents) pro rata, rounded to the cent; null while that
-- price isn't set (BR-26). Internal.
create function public.package_price_cents(p_group_id uuid, p_lessons int)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select round(
    case gd.size
      when 1 then s.price_1to1_cents
      when 2 then s.price_1to2_cents
      when 3 then s.price_1to3_cents
    end * p_lessons::numeric / s.lessons_per_package
  )::int
  from public.group_details gd
  cross join public.settings s
  where gd.group_id = p_group_id and s.id = 1
$$;

-- Steps 1 to 3 and the insert, for book_lesson (the customer rules) and coach_book:
-- p_by_coach allows the past and beyond the booking window (Herman, prompt 04);
-- p_ignore_open_hours skips the start step and open hours; with p_gap_override a week
-- that fails only the travel gap is booked with gap_override; p_ignore_credit skips the
-- credit check. p_repeat_weeks lessons at the same MYT time, 7 days apart, all or
-- nothing (BR-13). Returns the new booking ids in start order. Internal: the callers
-- check who may book for the group.
create function public.place_bookings(
  p_group_id uuid,
  p_starts_at timestamptz,
  p_minutes int,
  p_repeat_weeks int,
  p_by_coach boolean,
  p_ignore_open_hours boolean,
  p_gap_override boolean,
  p_ignore_credit boolean
)
returns uuid[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.my_account_id();
  v_lengths int[];
  v_group public.groups;
  v_starts timestamptz[];
  v_start timestamptz;
  v_check record;
  v_overrides boolean[] := '{}'::boolean[];
  v_clashes jsonb := '[]'::jsonb;
  v_needed int;
  v_can_still_book int;
  v_series_id uuid := gen_random_uuid();
  v_ids uuid[];
begin
  -- 1. The group, locked.
  select g.* into v_group
  from public.groups g
  where g.id = p_group_id
  for no key update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if not v_group.active then
    raise exception using errcode = 'P0001', message = 'group_inactive';
  end if;

  if p_repeat_weeks is null or p_repeat_weeks not between 1 and 52 then
    raise exception using errcode = 'P0001', message = 'invalid_repeat';
  end if;
  select s.lesson_lengths into v_lengths from public.settings s where s.id = 1;
  if p_minutes is null or not (p_minutes = any (v_lengths)) then
    raise exception using errcode = 'P0001', message = 'invalid_length';
  end if;
  if p_starts_at is null then
    raise exception using errcode = 'P0001', message = 'past';
  end if;

  -- The same MYT time every 7 days: 168 hours, never interval '7 days', which follows
  -- the session's daylight saving (TECH_SPEC §5.2).
  select array_agg(p_starts_at + make_interval(hours => 168 * k.n) order by k.n)
  into v_starts
  from generate_series(0, p_repeat_weeks - 1) as k (n);

  -- 2. The date locks.
  perform public.lock_booking_dates(v_starts, p_minutes);

  -- 3. Every week, with the caller as the viewer (names only for their own lessons).
  foreach v_start in array v_starts loop
    select c.ok, c.reason, c.detail
    into v_check
    from public.slot_check(v_start, p_minutes, p_group_id, v_me,
                           p_ignore_open_hours, p_by_coach, p_by_coach) c;
    if v_check.ok then
      v_overrides := v_overrides || false;
    elsif p_gap_override and v_check.reason in ('gap_after', 'gap_before') then
      v_overrides := v_overrides || true;
    else
      v_clashes := v_clashes || jsonb_build_array(jsonb_build_object(
        'date', (v_start at time zone 'Asia/Kuala_Lumpur')::date,
        'reason', v_check.reason,
        'detail', v_check.detail
      ));
    end if;
  end loop;

  if jsonb_array_length(v_clashes) > 0 then
    -- One lesson: its own reason and detail, as week_slots shows them.
    if p_repeat_weeks = 1 then
      if jsonb_typeof(v_clashes -> 0 -> 'detail') = 'null' then
        raise exception using errcode = 'P0001', message = v_clashes -> 0 ->> 'reason';
      end if;
      raise exception using errcode = 'P0001', message = v_clashes -> 0 ->> 'reason',
        detail = (v_clashes -> 0 -> 'detail')::text;
    end if;
    -- Several: all or nothing (BR-13), with the clashing dates and why.
    raise exception using errcode = 'P0001', message = 'repeat_conflict',
      detail = jsonb_build_object(
        'dates', (
          select jsonb_agg(c.value -> 'date' order by c.ordinality)
          from jsonb_array_elements(v_clashes) with ordinality as c
        ),
        'clashes', v_clashes
      )::text;
  end if;

  -- Credit (BR-21): the lessons this needs must fit in what the group may still book.
  if not p_ignore_credit then
    v_needed := p_repeat_weeks
      * public.lessons_for(p_starts_at, p_starts_at + make_interval(mins => p_minutes));
    select gb.can_still_book into v_can_still_book
    from public.group_balance gb
    where gb.group_id = p_group_id;
    if v_needed > v_can_still_book then
      raise exception using errcode = 'P0001', message = 'credit_exceeded',
        detail = jsonb_build_object(
          'needed', v_needed, 'can_still_book', v_can_still_book
        )::text;
    end if;
  end if;

  -- Every week shares one series_id; the location is copied from the group.
  begin
    with inserted as (
      insert into public.bookings
        (group_id, starts_at, ends_at, location, gap_override, series_id, created_by)
      select p_group_id, w.starts_at, w.starts_at + make_interval(mins => p_minutes),
             v_group.location, w.gap_override, v_series_id, v_me
      from unnest(v_starts, v_overrides) as w (starts_at, gap_override)
      returning id, starts_at
    )
    select array_agg(i.id order by i.starts_at) into v_ids from inserted i;
  exception
    when exclusion_violation then
      -- Unreachable while every booking takes the date locks; the constraint is the
      -- backstop (BR-14).
      raise exception using errcode = 'P0001', message = 'overlap_other';
  end;

  return v_ids;
end;
$$;

-- A customer books for one of their groups (BR-7 to BR-14, BR-21): a p_minutes lesson,
-- or p_repeat_weeks lessons at the same time each week (BR-13). Queues the booking
-- confirmation and, for a lesson starting within 24 hours, the coach's late alert
-- (BR-34, BR-35). Returns the new booking ids in start order.
-- Errors: not_approved, not_your_group, group_inactive, invalid_repeat (1 to 52 weeks),
-- invalid_length; for one lesson, slot_check's reason with its detail (past,
-- outside_window, off_step, outside_open_hours, overlap_mine, overlap_other, gap_after,
-- gap_before); for several, repeat_conflict {dates, clashes: [{date, reason, detail}]};
-- credit_exceeded {needed, can_still_book}.
create function public.book_lesson(
  p_group_id uuid,
  p_starts_at timestamptz,
  p_minutes int,
  p_repeat_weeks int default 1
)
returns uuid[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
begin
  if not public.is_approved() then
    raise exception using errcode = 'P0001', message = 'not_approved';
  end if;
  if not exists (
    select 1 from public.groups g
    where g.id = p_group_id and g.account_id = public.my_account_id()
  ) then
    raise exception using errcode = 'P0001', message = 'not_your_group';
  end if;

  v_ids := public.place_bookings(p_group_id, p_starts_at, p_minutes, p_repeat_weeks,
                                 false, false, false, false);

  perform public.queue_booked_emails(b.series_id)
  from public.bookings b
  where b.id = v_ids[1];
  return v_ids;
end;
$$;

-- The coach books for any group (BR-31): also in the past and beyond the booking window
-- (Herman, prompt 04); outside open hours with p_ignore_open_hours; closer to a
-- neighbouring lesson than the travel gap with p_gap_override (those weeks get
-- gap_override); past the credit limit with p_ignore_credit. Overlaps are still refused.
-- No emails: the coach made the change himself (TECH_SPEC §8). Returns the new booking
-- ids. Errors: not_coach, not_found, and book_lesson's from group_inactive on.
create function public.coach_book(
  p_group_id uuid,
  p_starts_at timestamptz,
  p_minutes int,
  p_repeat_weeks int default 1,
  p_ignore_open_hours boolean default false,
  p_gap_override boolean default false,
  p_ignore_credit boolean default false
)
returns uuid[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;
  return public.place_bookings(p_group_id, p_starts_at, p_minutes, p_repeat_weeks, true,
                               coalesce(p_ignore_open_hours, false),
                               coalesce(p_gap_override, false),
                               coalesce(p_ignore_credit, false));
end;
$$;

-- Cancels a booked lesson (BR-15 to BR-17): the customer who owns it until
-- cancel_cutoff_hours before it starts (after that it is locked), the coach any time.
-- The lesson goes back to the package: cancelled lessons never count (BR-19). Queues
-- the cancellation email and, when a customer cancels a lesson starting within 24
-- hours, the coach's late alert (BR-34, BR-35).
-- Errors: not_approved, not_your_booking (a customer's booking that isn't theirs or
-- doesn't exist), not_found (the coach), not_booked {status}, locked {cutoff_at},
-- invalid_reason (over 500 characters).
create function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_coach boolean := public.is_coach();
  v_me uuid := public.my_account_id();
  v_reason text := nullif(btrim(p_reason, E' \t\r\n'), '');
  v_booking public.bookings;
  v_cutoff_at timestamptz;
begin
  if not v_coach and not public.is_approved() then
    raise exception using errcode = 'P0001', message = 'not_approved';
  end if;
  if length(v_reason) > 500 then
    raise exception using errcode = 'P0001', message = 'invalid_reason';
  end if;

  -- Locked, so two cancels of one lesson can't both go through.
  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and (v_coach or exists (
      select 1 from public.groups g where g.id = b.group_id and g.account_id = v_me
    ))
  for update;
  if not found then
    raise exception using errcode = 'P0001',
      message = case when v_coach then 'not_found' else 'not_your_booking' end;
  end if;
  if v_booking.status <> 'booked' then
    raise exception using errcode = 'P0001', message = 'not_booked',
      detail = jsonb_build_object('status', v_booking.status)::text;
  end if;

  if not v_coach then
    select v_booking.starts_at - make_interval(hours => s.cancel_cutoff_hours)
    into v_cutoff_at
    from public.settings s
    where s.id = 1;
    if public.app_now() > v_cutoff_at then
      raise exception using errcode = 'P0001', message = 'locked',
        detail = jsonb_build_object('cutoff_at', public.myt_text(v_cutoff_at))::text;
    end if;
  end if;

  update public.bookings b
  set status = 'cancelled',
      cancelled_at = public.app_now(),
      cancelled_by = v_me,
      cancel_reason = v_reason
  where b.id = p_booking_id;

  perform public.queue_cancelled_emails(p_booking_id, not v_coach);
end;
$$;

-- The coach excuses a lesson that has started, for example when the student was sick
-- (BR-18): excused lessons never count (BR-19) and free their time. A future lesson is
-- cancelled instead (BR-17). Errors: not_coach, not_found, not_booked {status},
-- not_started.
create function public.excuse_booking(p_booking_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;

  select b.* into v_booking from public.bookings b where b.id = p_booking_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_booking.status <> 'booked' then
    raise exception using errcode = 'P0001', message = 'not_booked',
      detail = jsonb_build_object('status', v_booking.status)::text;
  end if;
  if v_booking.starts_at > public.app_now() then
    raise exception using errcode = 'P0001', message = 'not_started';
  end if;

  update public.bookings b set status = 'excused' where b.id = p_booking_id;
end;
$$;

-- The coach records a payment for a group (BR-20, BR-26): p_lessons lessons (normally
-- lessons_per_package), p_amount_cents (null: the type's package price for that many
-- lessons), p_method, p_paid_on (null: today in MYT; never in the future), p_note (up to
-- 500 characters). Returns the payment id. Errors: not_coach, not_found,
-- invalid_lessons, invalid_method, invalid_date, invalid_note, invalid_amount,
-- price_not_set.
create function public.record_payment(
  p_group_id uuid,
  p_lessons int,
  p_amount_cents int,
  p_method public.payment_method,
  p_paid_on date default null,
  p_note text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_today date := (public.app_now() at time zone 'Asia/Kuala_Lumpur')::date;
  v_note text := nullif(btrim(p_note, E' \t\r\n'), '');
  v_amount int := p_amount_cents;
  v_id uuid;
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;
  if not exists (select 1 from public.groups g where g.id = p_group_id) then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if p_lessons is null or p_lessons < 1 then
    raise exception using errcode = 'P0001', message = 'invalid_lessons';
  end if;
  if p_method is null then
    raise exception using errcode = 'P0001', message = 'invalid_method';
  end if;
  if p_paid_on > v_today then
    raise exception using errcode = 'P0001', message = 'invalid_date';
  end if;
  if length(v_note) > 500 then
    raise exception using errcode = 'P0001', message = 'invalid_note';
  end if;
  if v_amount is null then
    v_amount := public.package_price_cents(p_group_id, p_lessons);
    if v_amount is null then
      raise exception using errcode = 'P0001', message = 'price_not_set';
    end if;
  elsif v_amount < 0 then
    raise exception using errcode = 'P0001', message = 'invalid_amount';
  end if;

  insert into public.payments (group_id, lessons, amount_cents, method, paid_on, note, created_by)
  values (p_group_id, p_lessons, v_amount, p_method, coalesce(p_paid_on, v_today), v_note,
          public.my_account_id())
  returning id into v_id;
  return v_id;
end;
$$;

-- A free lesson (BR-20): a payment of 1 lesson, RM 0, method 'free', dated today (MYT).
-- Returns the payment id. Errors: not_coach, not_found, invalid_note.
create function public.add_free_lesson(p_group_id uuid, p_note text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_note text := nullif(btrim(p_note, E' \t\r\n'), '');
  v_id uuid;
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;
  if not exists (select 1 from public.groups g where g.id = p_group_id) then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if length(v_note) > 500 then
    raise exception using errcode = 'P0001', message = 'invalid_note';
  end if;

  insert into public.payments (group_id, lessons, amount_cents, method, paid_on, note, created_by)
  values (p_group_id, 1, 0, 'free',
          (public.app_now() at time zone 'Asia/Kuala_Lumpur')::date, v_note,
          public.my_account_id())
  returning id into v_id;
  return v_id;
end;
$$;

-- Grants (TECH_SPEC §6): the browser calls book_lesson and cancel_booking (customers
-- and the coach) and the coach's coach_book, excuse_booking, record_payment and
-- add_free_lesson (each checks is_coach() first). The rest is internal.
revoke all on function
  public.lock_booking_dates(timestamptz[], int),
  public.package_price_cents(uuid, int),
  public.place_bookings(uuid, timestamptz, int, int, boolean, boolean, boolean, boolean),
  public.book_lesson(uuid, timestamptz, int, int),
  public.coach_book(uuid, timestamptz, int, int, boolean, boolean, boolean),
  public.cancel_booking(uuid, text),
  public.excuse_booking(uuid),
  public.record_payment(uuid, int, int, public.payment_method, date, text),
  public.add_free_lesson(uuid, text)
from public, anon, authenticated;

grant execute on function
  public.book_lesson(uuid, timestamptz, int, int),
  public.coach_book(uuid, timestamptz, int, int, boolean, boolean, boolean),
  public.cancel_booking(uuid, text),
  public.excuse_booking(uuid),
  public.record_payment(uuid, int, int, public.payment_method, date, text),
  public.add_free_lesson(uuid, text)
to authenticated;
