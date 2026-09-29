-- Open hours, settings and announcements (TECH_SPEC §5.4; PRD BR-8, BR-29, BR-30,
-- BR-36): what customers may read (get_public_settings) and the coach's changes, each
-- validated. Prompts 06, 08 and 10 use these. The coach may also still write these
-- tables directly (TECH_SPEC §6); the functions are what the app uses.

-- The settings customers need (TECH_SPEC §5.4): lesson lengths, start step, travel gap
-- (the {gap} in DESIGN §6 messages), cancel cutoff, booking window, package size,
-- prices, payment instructions and business name. Nothing private: coach_email,
-- reminder times and the coach's switches stay out. For every signed-in account (the
-- grant is the check).
create function public.get_public_settings()
returns table (
  business_name text,
  lesson_lengths int[],
  start_step_minutes int,
  travel_gap_minutes int,
  cancel_cutoff_hours int,
  booking_window_weeks int,
  lessons_per_package int,
  price_1to1_cents int,
  price_1to2_cents int,
  price_1to3_cents int,
  payment_instructions text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.business_name, s.lesson_lengths, s.start_step_minutes, s.travel_gap_minutes,
         s.cancel_cutoff_hours, s.booking_window_weeks, s.lessons_per_package,
         s.price_1to1_cents, s.price_1to2_cents, s.price_1to3_cents, s.payment_instructions
  from public.settings s
  where s.id = 1
$$;

-- Replaces the weekly open hours (BR-29). p_rules: a JSON array of
-- {"weekday": 1 to 7 (ISO: Monday is 1), "opens_at": "17:30", "closes_at": "22:00"};
-- an empty array closes every day. Each range ends after it starts, and ranges of one
-- day don't overlap (touching ranges are fine: they join). Existing lessons stay
-- booked. Errors: not_coach, invalid_rules {index}, invalid_range {index},
-- overlapping_rules {weekday}.
create function public.set_open_hours(p_rules jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_index int;
  v_weekday smallint;
  v_opens_at time;
  v_closes_at time;
  v_weekdays smallint[] := '{}'::smallint[];
  v_opens time[] := '{}'::time[];
  v_closes time[] := '{}'::time[];
  v_overlap smallint;
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;
  if p_rules is null or jsonb_typeof(p_rules) <> 'array' then
    raise exception using errcode = 'P0001', message = 'invalid_rules';
  end if;

  for v_item, v_index in
    select e.value, e.ordinality::int
    from jsonb_array_elements(p_rules) with ordinality as e
  loop
    begin
      v_weekday := (v_item ->> 'weekday')::smallint;
      v_opens_at := (v_item ->> 'opens_at')::time;
      v_closes_at := (v_item ->> 'closes_at')::time;
    exception
      when data_exception then
        v_weekday := null;
    end;
    if jsonb_typeof(v_item) <> 'object' or v_weekday is null or v_weekday not between 1 and 7
       or v_opens_at is null or v_closes_at is null then
      raise exception using errcode = 'P0001', message = 'invalid_rules',
        detail = jsonb_build_object('index', v_index)::text;
    end if;
    if v_closes_at <= v_opens_at then
      raise exception using errcode = 'P0001', message = 'invalid_range',
        detail = jsonb_build_object('index', v_index)::text;
    end if;
    v_weekdays := v_weekdays || v_weekday;
    v_opens := v_opens || v_opens_at;
    v_closes := v_closes || v_closes_at;
  end loop;

  select a.weekday into v_overlap
  from unnest(v_weekdays, v_opens, v_closes) with ordinality as a (weekday, opens_at, closes_at, i)
  join unnest(v_weekdays, v_opens, v_closes) with ordinality as b (weekday, opens_at, closes_at, i)
    on b.weekday = a.weekday
   and b.i > a.i
   and b.opens_at < a.closes_at
   and a.opens_at < b.closes_at
  order by a.weekday
  limit 1;
  if v_overlap is not null then
    raise exception using errcode = 'P0001', message = 'overlapping_rules',
      detail = jsonb_build_object('weekday', v_overlap)::text;
  end if;

  -- One replacement at a time (two at once could mix their rules); reading the rules is
  -- never blocked.
  lock table public.availability_rules in exclusive mode;
  -- A WHERE clause is needed: API requests refuse a DELETE without one (safeupdate).
  delete from public.availability_rules r where r.id is not null;
  insert into public.availability_rules (weekday, opens_at, closes_at)
  select w.weekday, w.opens_at, w.closes_at
  from unnest(v_weekdays, v_opens, v_closes) as w (weekday, opens_at, closes_at);
end;
$$;

-- "Block time" (p_kind 'closed') or "Open extra time" ('open') from p_starts_at to
-- p_ends_at (BR-30), with the coach's private note. The dialogs (prompt 08) offer
-- times in whole start steps from the hour: starts count from each window's start
-- (BR-8), so an exception at 3:10 pm moves that evening's start times.
-- Returns the id. Errors: not_coach, invalid_kind, invalid_range, invalid_note.
create function public.add_exception(
  p_kind public.exception_kind,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_note text default null
)
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
  if p_kind is null then
    raise exception using errcode = 'P0001', message = 'invalid_kind';
  end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception using errcode = 'P0001', message = 'invalid_range';
  end if;
  if length(v_note) > 500 then
    raise exception using errcode = 'P0001', message = 'invalid_note';
  end if;

  insert into public.availability_exceptions (kind, starts_at, ends_at, note)
  values (p_kind, p_starts_at, p_ends_at, v_note)
  returning id into v_id;
  return v_id;
end;
$$;

-- Removes a Block time or Open extra time. Errors: not_coach, not_found.
create function public.remove_exception(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;

  delete from public.availability_exceptions e where e.id = p_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
end;
$$;

-- Reminder and digest times are times of the day. Postgres also accepts '24:00', which
-- the MYT clock never reaches, so the daily emails would silently stop (TECH_SPEC §7).
alter table public.settings
  add constraint settings_reminder_time_check check (reminder_time < '24:00'),
  add constraint settings_digest_time_check check (digest_time < '24:00');

-- The coach changes settings (prompt 10). p_settings: a JSON object with any of the
-- columns listed below, each as its JSON type: text as strings (times like "20:00"),
-- numbers, lesson_lengths as an array, switches as booleans; null empties the ones
-- that may be empty (prices, payment_instructions, lesson_expiry_months). The table's
-- checks validate the values, so a travel gap of 500 is refused by the database, not
-- only by the form. Text is trimmed; payment_instructions may be up to 2000
-- characters. Returns the new settings row.
-- Errors: not_coach, invalid_settings (not a JSON object), unknown_setting {keys},
-- invalid_setting {field}.
create function public.update_settings(p_settings jsonb)
returns public.settings
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  -- The columns the coach may change (not id or updated_at), with their JSON types.
  v_types constant jsonb := '{
    "business_name": "string", "coach_email": "string",
    "travel_gap_minutes": "number", "start_step_minutes": "number",
    "lesson_lengths": "array", "max_students_per_lesson": "number",
    "cancel_cutoff_hours": "number", "booking_window_weeks": "number",
    "lessons_per_package": "number", "unpaid_packages_allowed": "number",
    "price_1to1_cents": "number", "price_1to2_cents": "number",
    "price_1to3_cents": "number", "payment_instructions": "string",
    "lesson_expiry_months": "number", "reminder_time": "string", "digest_time": "string",
    "booking_confirmations": "boolean", "late_change_alert": "boolean",
    "require_approval": "boolean"
  }'::jsonb;
  v_unknown text[];
  v_key text;
  v_old public.settings;
  v_new public.settings;
  v_row public.settings;
  v_constraint text;
  v_column text;
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception using errcode = 'P0001', message = 'invalid_settings';
  end if;

  select array_agg(k.key order by k.key) into v_unknown
  from jsonb_object_keys(p_settings) as k (key)
  where not v_types ? k.key;
  if v_unknown is not null then
    raise exception using errcode = 'P0001', message = 'unknown_setting',
      detail = jsonb_build_object('keys', v_unknown)::text;
  end if;

  -- Each value has its column's JSON type and reads as the column's type ("25:00" is
  -- no time, 1.5 no whole number).
  for v_key in select k.key from jsonb_object_keys(p_settings) as k (key) loop
    if jsonb_typeof(p_settings -> v_key) not in (v_types ->> v_key, 'null') then
      raise exception using errcode = 'P0001', message = 'invalid_setting',
        detail = jsonb_build_object('field', v_key)::text;
    end if;
    begin
      perform jsonb_populate_record(
        null::public.settings, jsonb_build_object(v_key, p_settings -> v_key)
      );
    exception
      when data_exception then
        raise exception using errcode = 'P0001', message = 'invalid_setting',
          detail = jsonb_build_object('field', v_key)::text;
    end;
  end loop;

  select s.* into v_old from public.settings s where s.id = 1 for update;
  v_new := jsonb_populate_record(v_old, p_settings);
  v_new.business_name := btrim(v_new.business_name, E' \t\r\n');
  v_new.coach_email := btrim(v_new.coach_email, E' \t\r\n');
  v_new.payment_instructions := nullif(btrim(v_new.payment_instructions, E' \t\r\n'), '');
  v_new.lesson_lengths := array(
    select distinct l.minutes
    from unnest(v_new.lesson_lengths) as l (minutes)
    where l.minutes is not null
    order by 1
  );
  if length(v_new.payment_instructions) > 2000 then
    raise exception using errcode = 'P0001', message = 'invalid_setting',
      detail = jsonb_build_object('field', 'payment_instructions')::text;
  end if;

  begin
    update public.settings s
    set business_name = v_new.business_name,
        coach_email = v_new.coach_email,
        travel_gap_minutes = v_new.travel_gap_minutes,
        start_step_minutes = v_new.start_step_minutes,
        lesson_lengths = v_new.lesson_lengths,
        max_students_per_lesson = v_new.max_students_per_lesson,
        cancel_cutoff_hours = v_new.cancel_cutoff_hours,
        booking_window_weeks = v_new.booking_window_weeks,
        lessons_per_package = v_new.lessons_per_package,
        unpaid_packages_allowed = v_new.unpaid_packages_allowed,
        price_1to1_cents = v_new.price_1to1_cents,
        price_1to2_cents = v_new.price_1to2_cents,
        price_1to3_cents = v_new.price_1to3_cents,
        payment_instructions = v_new.payment_instructions,
        lesson_expiry_months = v_new.lesson_expiry_months,
        reminder_time = v_new.reminder_time,
        digest_time = v_new.digest_time,
        booking_confirmations = v_new.booking_confirmations,
        late_change_alert = v_new.late_change_alert,
        require_approval = v_new.require_approval
    where s.id = 1
    returning s.* into v_row;
  exception
    when check_violation then
      -- The column checks are named settings_<column>_check.
      get stacked diagnostics v_constraint = constraint_name;
      raise exception using errcode = 'P0001', message = 'invalid_setting',
        detail = jsonb_build_object(
          'field', regexp_replace(v_constraint, '^settings_(.*)_check$', '\1')
        )::text;
    when not_null_violation then
      get stacked diagnostics v_column = column_name;
      raise exception using errcode = 'P0001', message = 'invalid_setting',
        detail = jsonb_build_object('field', v_column)::text;
  end;
  return v_row;
end;
$$;

-- The coach's message to all customers (BR-36): a banner in the app until removed
-- (p_pinned: the design's "Pin as a banner until I remove it") and, with p_send_email,
-- an email to every approved customer. Returns the id.
-- Errors: not_coach, invalid_message (1 to 1000 characters after trimming).
create function public.post_announcement(
  p_message text,
  p_send_email boolean default true,
  p_pinned boolean default true
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_message text := btrim(p_message, E' \t\r\n');
  v_send_email boolean := coalesce(p_send_email, true);
  v_id uuid;
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;
  if v_message is null or length(v_message) not between 1 and 1000 then
    raise exception using errcode = 'P0001', message = 'invalid_message';
  end if;

  insert into public.announcements (message, pinned, send_email, created_by)
  values (v_message, coalesce(p_pinned, true), v_send_email, public.my_account_id())
  returning id into v_id;

  if v_send_email then
    perform public.queue_broadcast_emails(v_id);
  end if;
  return v_id;
end;
$$;

-- Takes a message down: customers no longer see it (RLS shows only messages not
-- removed). Emails already queued still go out. Errors: not_coach, not_found.
create function public.remove_announcement(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;

  update public.announcements a
  set removed_at = coalesce(a.removed_at, public.app_now())
  where a.id = p_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
end;
$$;

-- Grants (TECH_SPEC §6): get_public_settings for every signed-in account; the coach's
-- functions check is_coach() first.
revoke all on function
  public.get_public_settings(),
  public.set_open_hours(jsonb),
  public.add_exception(public.exception_kind, timestamptz, timestamptz, text),
  public.remove_exception(uuid),
  public.update_settings(jsonb),
  public.post_announcement(text, boolean, boolean),
  public.remove_announcement(uuid)
from public, anon, authenticated;

grant execute on function
  public.get_public_settings(),
  public.set_open_hours(jsonb),
  public.add_exception(public.exception_kind, timestamptz, timestamptz, text),
  public.remove_exception(uuid),
  public.update_settings(jsonb),
  public.post_announcement(text, boolean, boolean),
  public.remove_announcement(uuid)
to authenticated;
