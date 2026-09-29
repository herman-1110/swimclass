-- Emails queued by the functions that change bookings and announcements (TECH_SPEC §8;
-- PRD BR-17, BR-34 to BR-37). They only add rows to email_outbox; the mail-queue Edge
-- Function hands the rows to the Apps Script poller, which sends them from the coach's
-- Gmail (prompt 11).
--
-- Each email is short plain text plus the same text as simple HTML (names and messages
-- are free text, so they are escaped). Times are MYT, written like
-- "Sat 3 Oct, 9:00–10:00 am". Links start with {{site_url}}, which mail-queue replaces
-- with its SITE_URL secret when it hands the email out (prompt 11), so the same rows
-- work on dev and production. Free text never carries the placeholder (email_text), so
-- only the templates' own links become links to the site. Every email has a dedupe_key
-- (BR-37): queueing the same email again adds nothing.
--
-- Internal: no grants. Only the security definer functions in the next migrations call
-- these.

-- "Sat 3 Oct" (MYT).
create function public.myt_day_text(p_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(p_at at time zone 'Asia/Kuala_Lumpur', 'Dy FMDD Mon')
$$;

-- "9:00 am" (MYT).
create function public.myt_time_text(p_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(p_at at time zone 'Asia/Kuala_Lumpur', 'FMHH12:MI am')
$$;

-- "9:00–10:00 am", or "11:00 am–12:00 pm" when the two halves differ (DESIGN §6).
create function public.myt_range_text(p_starts_at timestamptz, p_ends_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when to_char(p_starts_at at time zone 'Asia/Kuala_Lumpur', 'am')
       = to_char(p_ends_at at time zone 'Asia/Kuala_Lumpur', 'am')
      then to_char(p_starts_at at time zone 'Asia/Kuala_Lumpur', 'FMHH12:MI')
        || '–' || public.myt_time_text(p_ends_at)
    else public.myt_time_text(p_starts_at) || '–' || public.myt_time_text(p_ends_at)
  end
$$;

-- "Sat 3 Oct, 9:00–10:00 am" (TECH_SPEC §8).
create function public.myt_when_text(p_starts_at timestamptz, p_ends_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select public.myt_day_text(p_starts_at) || ', ' || public.myt_range_text(p_starts_at, p_ends_at)
$$;

create function public.html_escape(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(replace(replace(p_text,
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;')
$$;

-- Free text in an email (names, locations, reasons, messages, the business name): '{{'
-- becomes '{ {', so a customer can't put the {{site_url}} placeholder into a coach's
-- email and have mail-queue turn it into a link to somewhere else.
create function public.email_text(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(p_text, '{{', '{ {')
$$;

-- The HTML version of an email's text: each paragraph (separated by a blank line) in a
-- <p>, line breaks as <br>, everything escaped, and the templates' {{site_url}} links
-- (the bare site or a path like /classes) clickable.
create function public.email_html(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select string_agg(
    '<p>' || regexp_replace(
      replace(public.html_escape(t.part), E'\n', '<br>'),
      '\{\{site_url\}\}(/[a-z/]*)?', '<a href="\&">\&</a>', 'g'
    ) || '</p>',
    E'\n' order by t.n
  )
  from regexp_split_to_table(p_text, E'\n\n') with ordinality as t (part, n)
$$;

-- An account's email address. Emails stay in auth.users (TECH_SPEC §3); only these
-- internal functions read them.
create function public.account_email(p_account_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(btrim(u.email), '') from auth.users u where u.id = p_account_id
$$;

-- Adds one email to the outbox, unless one with the same dedupe_key is already there
-- (BR-37) or there is no address to send it to. Returns whether it was added.
create function public.queue_email(
  p_to text,
  p_kind text,
  p_dedupe_key text,
  p_subject text,
  p_body_text text,
  p_body_html text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(p_to), '') is null or p_subject is null or p_body_text is null then
    return false;
  end if;
  insert into public.email_outbox (to_email, subject, body_text, body_html, kind, dedupe_key)
  values (btrim(p_to), p_subject, p_body_text, p_body_html, p_kind, p_dedupe_key)
  on conflict (dedupe_key) do nothing;
  return found;
end;
$$;

-- Booking confirmation to the customer (BR-34): one per series, listing every lesson.
create function public.email_booked(p_series_id uuid)
returns table (subject text, body_text text, body_html text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_settings public.settings;
  v_now timestamptz := public.app_now();
  v_account_name text;
  v_names text;
  v_location text;
  v_count int;
  v_first_starts_at timestamptz;
  v_first_ends_at timestamptz;
  v_lines text;
  v_cutoff_at timestamptz;
  v_hours text;
  v_intro text;
  v_cancel text;
  v_text text;
begin
  select s.* into v_settings from public.settings s where s.id = 1;

  select public.email_text(p.display_name), public.email_text(gd.display_names),
         public.email_text(min(b.location)), count(*)::int, min(b.starts_at), min(b.ends_at),
         string_agg(public.myt_when_text(b.starts_at, b.ends_at), E'\n' order by b.starts_at)
  into v_account_name, v_names, v_location, v_count, v_first_starts_at, v_first_ends_at,
       v_lines
  from public.bookings b
  join public.group_details gd on gd.group_id = b.group_id
  join public.profiles p on p.id = gd.account_id
  where b.series_id = p_series_id and b.status = 'booked'
  group by p.display_name, gd.display_names;

  if not found then
    return;
  end if;

  -- Customers may cancel up to cancel_cutoff_hours before a lesson (BR-15). Every lesson
  -- of a series is later than its first, so only the first can already be past it.
  v_cutoff_at := v_first_starts_at - make_interval(hours => v_settings.cancel_cutoff_hours);
  v_hours := v_settings.cancel_cutoff_hours
    || case when v_settings.cancel_cutoff_hours = 1 then ' hour' else ' hours' end;

  if v_count = 1 then
    subject := 'Booked: ' || v_names || ', '
      || public.myt_when_text(v_first_starts_at, v_first_ends_at);
    v_intro := 'Your lesson for ' || v_names || ' is booked:' || E'\n'
      || v_lines || ' at ' || v_location;
    if v_cutoff_at > v_now then
      v_cancel := 'Free to cancel or reschedule until ' || public.myt_time_text(v_cutoff_at)
        || ', ' || public.myt_day_text(v_cutoff_at) || '.';
    else
      v_cancel := 'It starts in less than ' || v_hours || ', so it can''t be cancelled.';
    end if;
  else
    subject := 'Booked: ' || v_count || ' lessons for ' || v_names || ' from '
      || public.myt_day_text(v_first_starts_at);
    v_intro := 'Your ' || v_count || ' lessons for ' || v_names || ' at ' || v_location
      || ' are booked:' || E'\n' || v_lines;
    v_cancel := 'Free to cancel or reschedule each lesson '
      || case when v_settings.cancel_cutoff_hours = 0 then 'until it starts'
              else 'up to ' || v_hours || ' before it starts' end || '.';
    if v_cutoff_at <= v_now then
      v_cancel := v_cancel || ' The first one starts in less than ' || v_hours
        || ', so it can''t be cancelled.';
    end if;
  end if;

  v_text := 'Hi ' || v_account_name || ',' || E'\n\n'
    || v_intro || E'\n\n'
    || v_cancel || E'\n'
    || 'See your lessons: {{site_url}}/classes' || E'\n\n'
    || 'Sent by ' || public.email_text(v_settings.business_name)
    || '. Reply to this email to reach your coach.';
  body_text := v_text;
  body_html := public.email_html(v_text);
  return next;
end;
$$;

-- Cancellation email to the customer (BR-17, BR-34), whoever cancelled. It says when
-- the coach cancelled, with his reason.
create function public.email_cancelled(p_booking_id uuid)
returns table (subject text, body_text text, body_html text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_business_name text;
  v_booking public.bookings;
  v_account_name text;
  v_names text;
  v_by_coach boolean;
  v_when text;
  v_text text;
begin
  select public.email_text(s.business_name) into v_business_name
  from public.settings s
  where s.id = 1;
  select b.* into v_booking from public.bookings b where b.id = p_booking_id;
  if not found then
    return;
  end if;

  select public.email_text(p.display_name), public.email_text(gd.display_names)
  into v_account_name, v_names
  from public.group_details gd
  join public.profiles p on p.id = gd.account_id
  where gd.group_id = v_booking.group_id;

  v_by_coach := exists (
    select 1 from public.profiles c where c.id = v_booking.cancelled_by and c.role = 'coach'
  );
  v_when := public.myt_when_text(v_booking.starts_at, v_booking.ends_at);

  subject := 'Cancelled: ' || v_names || ', ' || v_when;
  v_text := 'Hi ' || v_account_name || ',' || E'\n\n'
    || case when v_by_coach then 'Your coach cancelled this lesson:'
            else 'You cancelled this lesson:' end || E'\n'
    || v_when || ' for ' || v_names || ' at ' || public.email_text(v_booking.location)
    || case when v_by_coach and v_booking.cancel_reason is not null
            then E'\n' || 'Reason: ' || public.email_text(v_booking.cancel_reason)
            else '' end || E'\n\n'
    || 'The lesson goes back to your package. Book another time: {{site_url}}/book' || E'\n\n'
    || 'Sent by ' || v_business_name || '. Reply to this email to reach your coach.';
  body_text := v_text;
  body_html := public.email_html(v_text);
  return next;
end;
$$;

-- Late-change alert to the coach (BR-35): a customer booked or cancelled a lesson that
-- starts within 24 hours. p_event is 'booked' or 'cancelled'.
create function public.email_late_alert(p_booking_id uuid, p_event text)
returns table (subject text, body_text text, body_html text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_business_name text;
  v_booking public.bookings;
  v_account_name text;
  v_names text;
  v_type_label text;
  v_when text;
  v_lesson text;
  v_text text;
begin
  select public.email_text(s.business_name) into v_business_name
  from public.settings s
  where s.id = 1;
  select b.* into v_booking from public.bookings b where b.id = p_booking_id;
  if not found then
    return;
  end if;

  select public.email_text(p.display_name), public.email_text(gd.display_names), gd.type_label
  into v_account_name, v_names, v_type_label
  from public.group_details gd
  join public.profiles p on p.id = gd.account_id
  where gd.group_id = v_booking.group_id;

  v_when := public.myt_when_text(v_booking.starts_at, v_booking.ends_at);
  v_lesson := v_when || ' · ' || v_names || ' (' || v_type_label || ') · '
    || public.email_text(v_booking.location);

  if p_event = 'cancelled' then
    subject := 'Late cancellation: ' || v_names || ', ' || v_when;
    v_text := v_account_name || ' cancelled a lesson that was due to start within 24 hours:'
      || E'\n' || v_lesson
      || case when v_booking.cancel_reason is not null
              then E'\n' || 'Reason: ' || public.email_text(v_booking.cancel_reason)
              else '' end || E'\n\n'
      || 'The time is free again. Your schedule: {{site_url}}/coach/schedule';
  else
    subject := 'Late booking: ' || v_names || ', ' || v_when;
    v_text := v_account_name || ' booked a lesson that starts within 24 hours:'
      || E'\n' || v_lesson || E'\n\n'
      || 'Your schedule: {{site_url}}/coach/schedule';
  end if;
  v_text := v_text || E'\n\n' || 'Sent by ' || v_business_name || '.';
  body_text := v_text;
  body_html := public.email_html(v_text);
  return next;
end;
$$;

-- Broadcast (BR-36): the coach's message, to one customer.
create function public.email_broadcast(p_announcement_id uuid, p_account_id uuid)
returns table (subject text, body_text text, body_html text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_business_name text;
  v_message text;
  v_account_name text;
  v_text text;
begin
  select public.email_text(s.business_name) into v_business_name
  from public.settings s
  where s.id = 1;
  select public.email_text(a.message) into v_message
  from public.announcements a
  where a.id = p_announcement_id;
  select public.email_text(p.display_name) into v_account_name
  from public.profiles p
  where p.id = p_account_id;
  if v_message is null or v_account_name is null then
    return;
  end if;

  subject := 'Message from your coach';
  v_text := 'Hi ' || v_account_name || ',' || E'\n\n'
    || v_message || E'\n\n'
    || 'Open ' || v_business_name || ': {{site_url}}' || E'\n\n'
    || 'Sent by ' || v_business_name || '. Reply to this email to reach your coach.';
  body_text := v_text;
  body_html := public.email_html(v_text);
  return next;
end;
$$;

-- After a customer books (book_lesson): the confirmation for the series (setting
-- booking_confirmations) and a late alert to the coach for each of its lessons that
-- starts within 24 hours (setting late_change_alert; nothing while coach_email is '').
-- Bookings the coach makes himself send neither (TECH_SPEC §8).
create function public.queue_booked_emails(p_series_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_settings public.settings;
  v_now timestamptz := public.app_now();
  v_account_id uuid;
begin
  select s.* into v_settings from public.settings s where s.id = 1;
  select g.account_id into v_account_id
  from public.bookings b
  join public.groups g on g.id = b.group_id
  where b.series_id = p_series_id
  limit 1;
  if v_account_id is null then
    return;
  end if;

  if v_settings.booking_confirmations then
    perform public.queue_email(public.account_email(v_account_id), 'booked',
      'booked:' || p_series_id, e.subject, e.body_text, e.body_html)
    from public.email_booked(p_series_id) e;
  end if;

  if v_settings.late_change_alert and v_settings.coach_email <> '' then
    perform public.queue_email(v_settings.coach_email, 'late_alert',
      'late:' || b.id || ':booked', e.subject, e.body_text, e.body_html)
    from public.bookings b
    cross join lateral public.email_late_alert(b.id, 'booked') e
    where b.series_id = p_series_id
      and b.status = 'booked'
      and b.starts_at > v_now
      and b.starts_at <= v_now + make_interval(hours => 24);
  end if;
end;
$$;

-- After a lesson is cancelled (cancel_booking): the email to the customer, always, and
-- when the customer cancelled a lesson starting within 24 hours, the late alert to the
-- coach (setting late_change_alert). The coach isn't alerted about his own changes.
create function public.queue_cancelled_emails(p_booking_id uuid, p_by_customer boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_settings public.settings;
  v_now timestamptz := public.app_now();
  v_booking public.bookings;
  v_account_id uuid;
begin
  select s.* into v_settings from public.settings s where s.id = 1;
  select b.* into v_booking from public.bookings b where b.id = p_booking_id;
  if not found then
    return;
  end if;
  select g.account_id into v_account_id from public.groups g where g.id = v_booking.group_id;

  perform public.queue_email(public.account_email(v_account_id), 'cancelled',
    'cancelled:' || p_booking_id, e.subject, e.body_text, e.body_html)
  from public.email_cancelled(p_booking_id) e;

  if p_by_customer and v_settings.late_change_alert and v_settings.coach_email <> ''
     and v_booking.starts_at > v_now
     and v_booking.starts_at <= v_now + make_interval(hours => 24) then
    perform public.queue_email(v_settings.coach_email, 'late_alert',
      'late:' || p_booking_id || ':cancelled', e.subject, e.body_text, e.body_html)
    from public.email_late_alert(p_booking_id, 'cancelled') e;
  end if;
end;
$$;

-- A broadcast (BR-36) to every approved customer whose address is known to be theirs:
-- confirmed by the customer, or entered by the coach when he invited them (prompt 05).
-- An account approved before its owner confirmed the address (require_approval off, or
-- approved early) gets nothing, so strangers' addresses are never mailed in bulk.
create function public.queue_broadcast_emails(p_announcement_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.queue_email(public.account_email(p.id), 'broadcast',
    'broadcast:' || p_announcement_id || ':' || p.id, e.subject, e.body_text, e.body_html)
  from public.profiles p
  join auth.users u on u.id = p.id
  cross join lateral public.email_broadcast(p_announcement_id, p.id) e
  where p.role = 'customer'
    and p.approved
    and (u.email_confirmed_at is not null or u.invited_at is not null);
end;
$$;

-- All internal (TECH_SPEC §6): no grants.
revoke all on function
  public.myt_day_text(timestamptz),
  public.myt_time_text(timestamptz),
  public.myt_range_text(timestamptz, timestamptz),
  public.myt_when_text(timestamptz, timestamptz),
  public.html_escape(text),
  public.email_text(text),
  public.email_html(text),
  public.account_email(uuid),
  public.queue_email(text, text, text, text, text, text),
  public.email_booked(uuid),
  public.email_cancelled(uuid),
  public.email_late_alert(uuid, text),
  public.email_broadcast(uuid, uuid),
  public.queue_booked_emails(uuid),
  public.queue_cancelled_emails(uuid, boolean),
  public.queue_broadcast_emails(uuid)
from public, anon, authenticated;
