-- The customer's pages moved to the routes in docs/ARCHITECTURE.md §3.5 (Herman, 29 Sep
-- 2026): My classes is now /my-classes. email_booked is the only email that links there,
-- so it is recreated with the new link; nothing else changes. The same signature, so
-- callers and the missing grant (internal, TECH_SPEC §6) stay as they were.

-- email_booked: the booking confirmation to the customer (BR-34), one per series.
create or replace function public.email_booked(p_series_id uuid)
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
    || 'See your lessons: {{site_url}}/my-classes' || E'\n\n'
    || 'Sent by ' || public.email_text(v_settings.business_name)
    || '. Reply to this email to reach your coach.';
  body_text := v_text;
  body_html := public.email_html(v_text);
  return next;
end;
$$;
