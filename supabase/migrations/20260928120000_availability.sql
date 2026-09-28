-- The availability engine (TECH_SPEC §5.1): which start times are free and, if not,
-- why. Booking (prompt 04) and every schedule screen use these functions, so the rules
-- live in one place (CLAUDE.md rule 1).
--
-- Days, weekdays and wall-clock times are MYT (Asia/Kuala_Lumpur, UTC+8 all year):
--   the MYT day of an instant       (ts at time zone 'Asia/Kuala_Lumpur')::date
--   a MYT day and time as an instant (day + time) at time zone 'Asia/Kuala_Lumpur'
--   the ISO weekday of a day         extract(isodow from day)
-- None of these depend on the session's time zone (UTC through the API, and the tests
-- use America/Los_Angeles on purpose).

-- An instant as MYT wall-clock text with its offset, "2026-09-29T19:30:00+08:00", for
-- the JSON these functions return, so the output is the same whatever the session's
-- time zone. Malaysia has no daylight saving, so the offset is always +08:00.
create function public.myt_text(p_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(p_at at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD"T"HH24:MI:SS"+08:00"')
$$;

-- Exceptions pile up over the years; open_windows only needs those that haven't ended.
create index availability_exceptions_ends_at_idx on public.availability_exceptions (ends_at);

-- Open windows for one MYT day (BR-9, BR-29, BR-30): the weekly rules for its ISO
-- weekday plus 'open' exceptions overlapping the day, merged (touching ranges join, so
-- an extra 15:00–17:30 and the 17:30–22:00 rule make one 15:00–22:00 window), minus
-- 'closed' exceptions (a closed range wins over an open one). Exceptions are cut at
-- midnight, so a window never crosses into the next day and neither can a lesson.
-- Start times step from each window's start. PL/pgSQL so its plan is cached: slot_check
-- calls it for every start time. Internal: no grant; the functions below call it.
create function public.open_windows(p_day date)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_day_start timestamptz := p_day::timestamp at time zone 'Asia/Kuala_Lumpur';
  v_day_end timestamptz := (p_day + 1)::timestamp at time zone 'Asia/Kuala_Lumpur';
begin
  if p_day is null then
    return;
  end if;

  return query
    with opened as (
      select range_agg(o.span) as spans
      from (
        select tstzrange(
          (p_day + r.opens_at) at time zone 'Asia/Kuala_Lumpur',
          (p_day + r.closes_at) at time zone 'Asia/Kuala_Lumpur',
          '[)'
        ) as span
        from public.availability_rules r
        where r.weekday = extract(isodow from p_day)
        union all
        select tstzrange(greatest(x.starts_at, v_day_start), least(x.ends_at, v_day_end), '[)')
        from public.availability_exceptions x
        where x.kind = 'open' and x.starts_at < v_day_end and x.ends_at > v_day_start
      ) o
    ),
    closed as (
      select range_agg(tstzrange(x.starts_at, x.ends_at, '[)')) as spans
      from public.availability_exceptions x
      where x.kind = 'closed' and x.starts_at < v_day_end and x.ends_at > v_day_start
    )
    select lower(w.span), upper(w.span)
    from opened o
    cross join closed c
    cross join lateral unnest(
      coalesce(o.spans, '{}'::tstzmultirange) - coalesce(c.spans, '{}'::tstzmultirange)
    ) as w (span)
    order by 1;
end;
$$;

-- Can a lesson of p_minutes start at p_starts_at? The checks run in this order and the
-- first failure wins (TECH_SPEC §5.1):
--   1. past: it has already started (starts_at <= app_now()).
--      outside_window: its MYT day is after the booking window (BR-11). The window
--      runs to the Sunday of the week booking_window_weeks after the current MYT week:
--      on Mon 28 Sep with 4 weeks, up to Sun 1 Nov.
--   2. invalid_length: not one of lesson_lengths (BR-8).
--      off_step: not on the start step counted from the start of its open window (BR-8).
--   3. outside_open_hours: not entirely inside one open window (BR-9).
--   4. overlap_mine / overlap_other: overlaps a booked lesson, earliest first. Mine
--      means a lesson of p_viewer's account (BR-12, BR-14).
--   5. gap_after / gap_before: less than travel_gap_minutes after a booked lesson ends
--      or before one starts, bookings in start order (BR-10).
-- detail: overlap_mine {starts_at, ends_at, names}; overlap_other {starts_at, ends_at};
-- gap_after {ends_at}; gap_before {starts_at}; otherwise null. Times are MYT text.
--
-- New lessons always need the full gap next to every booked lesson: gap_override on an
-- existing booking only changes how travel is drawn (lesson_travel below). Cancelled
-- and excused bookings block nothing. p_group_id is the group the lesson would be for;
-- no check depends on it (every lesson blocks every group, BR-10, BR-14).
--
-- Internal: no grant. p_viewer decides whose names appear in overlap_mine, so a caller
-- who could choose it could read other customers' names. week_slots passes the caller,
-- and book_lesson (prompt 04) must do the same.
create function public.slot_check(
  p_starts_at timestamptz,
  p_minutes int,
  p_group_id uuid,
  p_viewer uuid
)
returns table (ok boolean, reason text, detail jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_settings public.settings;
  v_now timestamptz := public.app_now();
  v_today date := (v_now at time zone 'Asia/Kuala_Lumpur')::date;
  v_last_day date;
  v_ends_at timestamptz;
  v_gap interval;
  v_window_starts_at timestamptz;
  v_window_ends_at timestamptz;
  v_other_starts_at timestamptz;
  v_other_ends_at timestamptz;
  v_other_group_id uuid;
  v_other_account_id uuid;
begin
  select s.* into v_settings from public.settings s where s.id = 1;

  -- 1. The clock and the booking window. A missing start never fits.
  if p_starts_at is null or p_starts_at <= v_now then
    return query select false, 'past', null::jsonb;
    return;
  end if;

  -- The Sunday of the week booking_window_weeks after the current MYT week.
  v_last_day := v_today - extract(isodow from v_today)::int
    + 7 * (v_settings.booking_window_weeks + 1);
  if (p_starts_at at time zone 'Asia/Kuala_Lumpur')::date > v_last_day then
    return query select false, 'outside_window', null::jsonb;
    return;
  end if;

  -- 2. Length and start step.
  if p_minutes is null or not (p_minutes = any (v_settings.lesson_lengths)) then
    return query select false, 'invalid_length', null::jsonb;
    return;
  end if;
  v_ends_at := p_starts_at + make_interval(mins => p_minutes);

  -- The open window the lesson starts in, if any. The step counts from its start.
  select w.starts_at, w.ends_at
  into v_window_starts_at, v_window_ends_at
  from public.open_windows((p_starts_at at time zone 'Asia/Kuala_Lumpur')::date) w
  where w.starts_at <= p_starts_at and p_starts_at < w.ends_at;

  if v_window_starts_at is not null
     and mod(extract(epoch from p_starts_at - v_window_starts_at),
             v_settings.start_step_minutes * 60) <> 0 then
    return query select false, 'off_step', null::jsonb;
    return;
  end if;

  -- 3. Entirely inside that one window.
  if v_window_starts_at is null or v_ends_at > v_window_ends_at then
    return query select false, 'outside_open_hours', null::jsonb;
    return;
  end if;

  -- 4. Overlaps, earliest lesson first. A lesson is at most 2 hours long
  -- (bookings_length), so the bound on b.starts_at lets the index do the work.
  select b.starts_at, b.ends_at, b.group_id, g.account_id
  into v_other_starts_at, v_other_ends_at, v_other_group_id, v_other_account_id
  from public.bookings b
  join public.groups g on g.id = b.group_id
  where b.status = 'booked'
    and b.starts_at < v_ends_at
    and b.ends_at > p_starts_at
    and b.starts_at > p_starts_at - interval '2 hours'
  order by b.starts_at
  limit 1;

  if found then
    if v_other_account_id = p_viewer then
      return query select false, 'overlap_mine', jsonb_build_object(
        'starts_at', public.myt_text(v_other_starts_at),
        'ends_at', public.myt_text(v_other_ends_at),
        'names', (
          select gd.display_names from public.group_details gd
          where gd.group_id = v_other_group_id
        )
      );
    else
      return query select false, 'overlap_other', jsonb_build_object(
        'starts_at', public.myt_text(v_other_starts_at),
        'ends_at', public.myt_text(v_other_ends_at)
      );
    end if;
    return;
  end if;

  -- 5. Travel gap, lessons in start order. A lesson that ends at or before this start
  -- is before it; one that starts at or after this end is after it (none overlap now).
  v_gap := make_interval(mins => v_settings.travel_gap_minutes);

  select b.starts_at, b.ends_at
  into v_other_starts_at, v_other_ends_at
  from public.bookings b
  where b.status = 'booked'
    and (
      (b.ends_at <= p_starts_at and b.ends_at + v_gap > p_starts_at)
      or (b.starts_at >= v_ends_at and b.starts_at - v_gap < v_ends_at)
    )
    and b.starts_at > p_starts_at - v_gap - interval '2 hours'
    and b.starts_at < v_ends_at + v_gap
  order by b.starts_at
  limit 1;

  if found then
    if v_other_ends_at <= p_starts_at then
      return query select false, 'gap_after',
        jsonb_build_object('ends_at', public.myt_text(v_other_ends_at));
    else
      return query select false, 'gap_before',
        jsonb_build_object('starts_at', public.myt_text(v_other_starts_at));
    end if;
    return;
  end if;

  return query select true, null::text, null::jsonb;
end;
$$;

-- Travel to draw next to each booked lesson starting in [p_from, p_to), in minutes:
-- the travel gap, shortened so it never covers the neighbouring lesson (possible when
-- the gap setting grew after booking), and 0 between a lesson the coach squeezed in
-- with gap_override and the neighbour it is closer than the gap to. Neighbours may lie
-- outside the range. Internal: no grant.
create function public.lesson_travel(p_from timestamptz, p_to timestamptz)
returns table (booking_id uuid, travel_before int, travel_after int)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    case
      when prev.ends_at is null
        or prev.ends_at + make_interval(mins => s.travel_gap_minutes) <= b.starts_at
        then s.travel_gap_minutes
      when prev.gap_override or b.gap_override then 0
      else floor(extract(epoch from b.starts_at - prev.ends_at) / 60)::int
    end,
    case
      when next.starts_at is null
        or b.ends_at + make_interval(mins => s.travel_gap_minutes) <= next.starts_at
        then s.travel_gap_minutes
      when next.gap_override or b.gap_override then 0
      else floor(extract(epoch from next.starts_at - b.ends_at) / 60)::int
    end
  from public.bookings b
  cross join (
    select st.travel_gap_minutes from public.settings st where st.id = 1
  ) s
  -- Booked lessons never overlap, so the previous one by start is also the previous
  -- one by end.
  left join lateral (
    select p.ends_at, p.gap_override
    from public.bookings p
    where p.status = 'booked' and p.starts_at < b.starts_at
    order by p.starts_at desc
    limit 1
  ) prev on true
  left join lateral (
    select n.starts_at, n.gap_override
    from public.bookings n
    where n.status = 'booked' and n.starts_at > b.starts_at
    order by n.starts_at
    limit 1
  ) next on true
  where b.status = 'booked'
    and b.starts_at >= p_from
    and b.starts_at < p_to
$$;

-- Every start time in the open windows of the 7 days from p_week_start (the Book
-- screen passes a Monday), stepping start_step_minutes from each window's start, with
-- the slot_check result for a p_minutes lesson (BR-8 to BR-12). Crossed-out times are
-- included: the screen shows every start and explains the clashes.
-- Approved customers may pass only their own groups; the coach may pass any group.
-- Overlap names are the caller's own (slot_check's viewer is the caller).
create function public.week_slots(p_week_start date, p_minutes int, p_group_id uuid)
returns table (day date, starts_at timestamptz, ok boolean, reason text, detail jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.my_account_id();
  v_settings public.settings;
begin
  if public.is_coach() then
    if not exists (select 1 from public.groups g where g.id = p_group_id) then
      raise exception using errcode = 'P0001', message = 'not_found';
    end if;
  else
    if not public.is_approved() then
      raise exception using errcode = 'P0001', message = 'not_approved';
    end if;
    if not exists (
      select 1 from public.groups g where g.id = p_group_id and g.account_id = v_me
    ) then
      raise exception using errcode = 'P0001', message = 'not_your_group';
    end if;
  end if;

  if p_week_start is null then
    raise exception using errcode = 'P0001', message = 'invalid_week';
  end if;
  select s.* into v_settings from public.settings s where s.id = 1;
  if p_minutes is null or not (p_minutes = any (v_settings.lesson_lengths)) then
    raise exception using errcode = 'P0001', message = 'invalid_length';
  end if;

  return query
    select d.day, t.starts_at, c.ok, c.reason, c.detail
    from generate_series(0, 6) as i (n)
    cross join lateral (select p_week_start + i.n as day) d
    cross join lateral public.open_windows(d.day) w
    cross join lateral generate_series(
      w.starts_at,
      w.ends_at - make_interval(mins => p_minutes),
      make_interval(mins => v_settings.start_step_minutes)
    ) as t (starts_at)
    cross join lateral public.slot_check(t.starts_at, p_minutes, p_group_id, v_me) c
    order by t.starts_at;
end;
$$;

-- The coach's week for the customer Schedule grid (BR-27): 7 days from p_week_start,
-- in date order, each
--   {day, open: [{starts_at, ends_at}], closed: [{starts_at, ends_at}],
--    busy: [{starts_at, ends_at, mine, travel_before, travel_after}]}
-- open = open_windows; closed = 'closed' exceptions cut to the day (no notes); busy =
-- booked lessons starting that day. travel_* are minutes (lesson_travel). A block of
-- the caller's own account also has booking_id and group_id; nothing else carries a
-- name, location or id, so other customers' lessons are only "Booked" (rule 6).
-- For approved customers and the coach.
create function public.week_busy(p_week_start date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.my_account_id();
  v_from timestamptz;
  v_to timestamptz;
begin
  if not public.is_coach() and not public.is_approved() then
    raise exception using errcode = 'P0001', message = 'not_approved';
  end if;
  if p_week_start is null then
    raise exception using errcode = 'P0001', message = 'invalid_week';
  end if;
  v_from := p_week_start::timestamp at time zone 'Asia/Kuala_Lumpur';
  v_to := (p_week_start + 7)::timestamp at time zone 'Asia/Kuala_Lumpur';

  return (
    with days as (
      select
        p_week_start + i.n as day,
        (p_week_start + i.n)::timestamp at time zone 'Asia/Kuala_Lumpur' as day_start,
        (p_week_start + i.n + 1)::timestamp at time zone 'Asia/Kuala_Lumpur' as day_end
      from generate_series(0, 6) as i (n)
    ),
    busy as (
      select
        (b.starts_at at time zone 'Asia/Kuala_Lumpur')::date as day,
        jsonb_agg(
          jsonb_build_object(
            'starts_at', public.myt_text(b.starts_at),
            'ends_at', public.myt_text(b.ends_at),
            'mine', coalesce(g.account_id = v_me, false),
            'travel_before', t.travel_before,
            'travel_after', t.travel_after
          )
          || case when g.account_id = v_me
               then jsonb_build_object('booking_id', b.id, 'group_id', b.group_id)
               else '{}'::jsonb
             end
          order by b.starts_at
        ) as blocks
      from public.lesson_travel(v_from, v_to) t
      join public.bookings b on b.id = t.booking_id
      join public.groups g on g.id = b.group_id
      group by 1
    )
    select jsonb_agg(
      jsonb_build_object(
        'day', d.day,
        'open', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'starts_at', public.myt_text(w.starts_at),
            'ends_at', public.myt_text(w.ends_at)
          ) order by w.starts_at), '[]'::jsonb)
          from public.open_windows(d.day) w
        ),
        'closed', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'starts_at', public.myt_text(greatest(e.starts_at, d.day_start)),
            'ends_at', public.myt_text(least(e.ends_at, d.day_end))
          ) order by e.starts_at, e.id), '[]'::jsonb)
          from public.availability_exceptions e
          where e.kind = 'closed' and e.starts_at < d.day_end and e.ends_at > d.day_start
        ),
        'busy', coalesce(x.blocks, '[]'::jsonb)
      )
      order by d.day
    )
    from days d
    left join busy x on x.day = d.day
  );
end;
$$;

-- The coach's week with everything (BR-28): 7 days from p_week_start, each
--   {day, open, closed (as week_busy), exceptions, lessons}
-- exceptions = every exception overlapping the day, uncut, with id, kind and the
-- coach's private note (the only way notes are read, TECH_SPEC §6). lessons = every
-- booking starting that day, any status, with booking and group ids, the account and
-- its display name, display_names, type_label, size, location, times, lessons (1 or
-- 2), status, gap_override, travel_before/travel_after (booked lessons only), the
-- ledger position (used, package_no, lesson_in_package, package_size) and the group's
-- balance flags: unpaid, and last_lesson when this is the group's last paid lesson.
-- Coach only.
create function public.coach_week(p_week_start date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz;
  v_to timestamptz;
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;
  if p_week_start is null then
    raise exception using errcode = 'P0001', message = 'invalid_week';
  end if;
  v_from := p_week_start::timestamp at time zone 'Asia/Kuala_Lumpur';
  v_to := (p_week_start + 7)::timestamp at time zone 'Asia/Kuala_Lumpur';

  return (
    with days as (
      select
        p_week_start + i.n as day,
        (p_week_start + i.n)::timestamp at time zone 'Asia/Kuala_Lumpur' as day_start,
        (p_week_start + i.n + 1)::timestamp at time zone 'Asia/Kuala_Lumpur' as day_end
      from generate_series(0, 6) as i (n)
    ),
    -- The week's lessons, read once: the ledger and balance views cover every booking.
    lessons as (
      select
        (b.starts_at at time zone 'Asia/Kuala_Lumpur')::date as day,
        jsonb_agg(jsonb_build_object(
          'booking_id', b.id,
          'group_id', b.group_id,
          'account_id', gd.account_id,
          'account_name', p.display_name,
          'display_names', gd.display_names,
          'type_label', gd.type_label,
          'size', gd.size,
          'location', b.location,
          'starts_at', public.myt_text(b.starts_at),
          'ends_at', public.myt_text(b.ends_at),
          'lessons', public.lessons_for(b.starts_at, b.ends_at),
          'status', b.status,
          'gap_override', b.gap_override,
          'travel_before', t.travel_before,
          'travel_after', t.travel_after,
          'used', le.used,
          'package_no', le.package_no,
          'lesson_in_package', le.lesson_in_package,
          'package_size', gb.package_size,
          'unpaid', gb.unpaid,
          'last_lesson', b.status = 'booked' and gb.last_lesson_at is not null
            and gb.last_lesson_at = b.starts_at
        ) order by b.starts_at, b.id) as lessons
      from public.bookings b
      join public.group_details gd on gd.group_id = b.group_id
      join public.profiles p on p.id = gd.account_id
      join public.group_balance gb on gb.group_id = b.group_id
      left join public.booking_ledger le on le.booking_id = b.id
      left join public.lesson_travel(v_from, v_to) t on t.booking_id = b.id
      where b.starts_at >= v_from and b.starts_at < v_to
      group by 1
    )
    select jsonb_agg(
      jsonb_build_object(
        'day', d.day,
        'open', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'starts_at', public.myt_text(w.starts_at),
            'ends_at', public.myt_text(w.ends_at)
          ) order by w.starts_at), '[]'::jsonb)
          from public.open_windows(d.day) w
        ),
        'closed', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'starts_at', public.myt_text(greatest(e.starts_at, d.day_start)),
            'ends_at', public.myt_text(least(e.ends_at, d.day_end))
          ) order by e.starts_at, e.id), '[]'::jsonb)
          from public.availability_exceptions e
          where e.kind = 'closed' and e.starts_at < d.day_end and e.ends_at > d.day_start
        ),
        'exceptions', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', e.id,
            'kind', e.kind,
            'starts_at', public.myt_text(e.starts_at),
            'ends_at', public.myt_text(e.ends_at),
            'note', e.note
          ) order by e.starts_at, e.id), '[]'::jsonb)
          from public.availability_exceptions e
          where e.starts_at < d.day_end and e.ends_at > d.day_start
        ),
        'lessons', coalesce(l.lessons, '[]'::jsonb)
      )
      order by d.day
    )
    from days d
    left join lessons l on l.day = d.day
  );
end;
$$;

-- Grants (TECH_SPEC §6). The default privileges already give new functions no access;
-- this says so explicitly. The browser calls week_slots, week_busy and coach_week
-- (coach_week checks is_coach() first). open_windows, slot_check, lesson_travel and
-- myt_text are internal: only the functions above call them.
revoke all on function
  public.myt_text(timestamptz),
  public.open_windows(date),
  public.slot_check(timestamptz, int, uuid, uuid),
  public.lesson_travel(timestamptz, timestamptz),
  public.week_slots(date, int, uuid),
  public.week_busy(date),
  public.coach_week(date)
from public, anon, authenticated;

grant execute on function
  public.week_slots(date, int, uuid),
  public.week_busy(date),
  public.coach_week(date)
to authenticated;
