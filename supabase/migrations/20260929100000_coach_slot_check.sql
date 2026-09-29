-- The coach's options for the availability check (TECH_SPEC §5.2, PRD BR-31).
-- slot_check stops at the first failure, so outside open hours it would never reach the
-- overlap and travel-gap checks. It is recreated with options that default to the
-- customer rules (week_slots keeps calling it with four arguments):
--   p_ignore_open_hours  no start step and no open hours: the coach may book outside
--                        them (BR-31); the start must still be a whole minute
--   p_allow_past         a start that has passed is fine (Herman, prompt 04: the coach
--                        may record a lesson that already happened)
--   p_ignore_window      no booking window (Herman, prompt 04: the coach may book any
--                        number of weeks ahead)
-- The travel gap is the last check, so skipping it needs no option: when the coach
-- chose to skip the gap, coach_book and coach_slot_check accept gap_after/gap_before
-- (and coach_book marks the booking gap_override). Overlaps are never optional (BR-14).

drop function public.slot_check(timestamptz, int, uuid, uuid);

-- Can a lesson of p_minutes start at p_starts_at? The checks run in this order and the
-- first failure wins (TECH_SPEC §5.1):
--   1. past: it has already started (starts_at <= app_now()); a null start never fits.
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
-- existing booking only changes how travel is drawn (lesson_travel). Cancelled and
-- excused bookings block nothing. p_group_id is the group the lesson would be for; no
-- check depends on it (every lesson blocks every group, BR-10, BR-14).
--
-- Internal: no grant. p_viewer decides whose names appear in overlap_mine, so a caller
-- who could choose it could read other customers' names. week_slots, book_lesson and
-- coach_slot_check pass the caller.
create function public.slot_check(
  p_starts_at timestamptz,
  p_minutes int,
  p_group_id uuid,
  p_viewer uuid,
  p_ignore_open_hours boolean default false,
  p_allow_past boolean default false,
  p_ignore_window boolean default false
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
  if p_starts_at is null
     or (p_starts_at <= v_now and not coalesce(p_allow_past, false)) then
    return query select false, 'past', null::jsonb;
    return;
  end if;

  if not coalesce(p_ignore_window, false) then
    -- The Sunday of the week booking_window_weeks after the current MYT week.
    v_last_day := v_today - extract(isodow from v_today)::int
      + 7 * (v_settings.booking_window_weeks + 1);
    if (p_starts_at at time zone 'Asia/Kuala_Lumpur')::date > v_last_day then
      return query select false, 'outside_window', null::jsonb;
      return;
    end if;
  end if;

  -- 2. Length and start step.
  if p_minutes is null or not (p_minutes = any (v_settings.lesson_lengths)) then
    return query select false, 'invalid_length', null::jsonb;
    return;
  end if;
  v_ends_at := p_starts_at + make_interval(mins => p_minutes);

  if coalesce(p_ignore_open_hours, false) then
    -- Outside open hours there is no window to step from, but a lesson still starts
    -- on a whole minute.
    if mod(extract(epoch from p_starts_at), 60) <> 0 then
      return query select false, 'off_step', null::jsonb;
      return;
    end if;
  else
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

-- The Add booking dialog's live clash reason (prompt 08): slot_check with the coach's
-- options, and with the coach as the viewer, so overlaps show times only (names are in
-- coach_week). The coach may book in the past and beyond the booking window. With
-- p_gap_override a travel-gap clash is no clash: coach_book books it with
-- gap_override. Coach only.
create function public.coach_slot_check(
  p_group_id uuid,
  p_starts_at timestamptz,
  p_minutes int,
  p_ignore_open_hours boolean default false,
  p_gap_override boolean default false
)
returns table (ok boolean, reason text, detail jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_check record;
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;
  if not exists (select 1 from public.groups g where g.id = p_group_id) then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;

  select c.ok, c.reason, c.detail
  into v_check
  from public.slot_check(p_starts_at, p_minutes, p_group_id, public.my_account_id(),
                         coalesce(p_ignore_open_hours, false), true, true) c;

  if not v_check.ok and coalesce(p_gap_override, false)
     and v_check.reason in ('gap_after', 'gap_before') then
    return query select true, null::text, null::jsonb;
  else
    return query select v_check.ok, v_check.reason, v_check.detail;
  end if;
end;
$$;

-- Grants (TECH_SPEC §6): slot_check stays internal; the browser calls coach_slot_check
-- (it checks is_coach() first).
revoke all on function
  public.slot_check(timestamptz, int, uuid, uuid, boolean, boolean, boolean),
  public.coach_slot_check(uuid, timestamptz, int, boolean, boolean)
from public, anon, authenticated;

grant execute on function
  public.coach_slot_check(uuid, timestamptz, int, boolean, boolean)
to authenticated;
