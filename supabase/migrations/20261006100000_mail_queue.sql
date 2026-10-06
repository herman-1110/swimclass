-- The mail queue (prompt 11; TECH_SPEC §5.5, §7, §8; PRD BR-32, BR-33, BR-37): the evening
-- reminders and the coach's digest, and the functions the mail-queue Edge Function calls to
-- hand the outbox to the Apps Script poller, which sends it from the coach's Gmail.
--
-- 1. Templates: email_reminder (one per account, BR-32) and email_digest (the coach's
--    "Tomorrow's schedule", BR-33), built with prompt 04's helpers (…_emails.sql).
-- 2. queue_daily_emails(p_for_date): queues each daily job once it is due (reminder_time,
--    digest_time) and records it in daily_jobs, so running it again adds nothing.
-- 3. claim_outbox / ack_outbox: hand out up to 50 unsent rows (reminders, digests and late
--    alerts first, then oldest first) and record what happened; up to 5 failed tries.
-- 4. email_log: the coach's Email log in Settings. The coach never reads email_outbox itself.
--
-- Times come from app_now(), which is the real time for API calls and pinned in the database
-- tests. Service role only, except email_log.

-- 1. Templates -------------------------------------------------------------------------------

-- "RM 260", "RM 260.50", "RM 1,200" (like the screens' formatRinggit).
create function public.ringgit_text(p_cents int)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'RM ' || case
    when p_cents % 100 = 0 then to_char(p_cents / 100, 'FM999,999,990')
    else to_char(p_cents / 100.0, 'FM999,999,990.00')
  end
$$;

-- "30 min", "1 hour", "1 hour 30 min", "5 hours".
create function public.duration_text(p_minutes int)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_minutes < 60 then p_minutes || ' min'
    else (p_minutes / 60) || case when p_minutes / 60 = 1 then ' hour' else ' hours' end
      || case when p_minutes % 60 > 0 then ' ' || (p_minutes % 60) || ' min' else '' end
  end
$$;

-- The evening reminder to one account (BR-32): every lesson its groups have on p_for_date (MYT),
-- each with its cancellation deadline worded like email_booked, and a link to My classes.
-- Nothing when the account has no lessons that day.
create function public.email_reminder(p_account_id uuid, p_for_date date)
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
  v_hours text;
  v_count int;
  v_lessons text;
  v_text text;
begin
  select s.* into v_settings from public.settings s where s.id = 1;
  select public.email_text(p.display_name) into v_account_name
  from public.profiles p
  where p.id = p_account_id;
  if v_account_name is null then
    return;
  end if;

  v_hours := v_settings.cancel_cutoff_hours
    || case when v_settings.cancel_cutoff_hours = 1 then ' hour' else ' hours' end;

  -- One paragraph per lesson: when, who and where, then whether it can still be cancelled.
  select count(*)::int,
         string_agg(
           public.myt_range_text(b.starts_at, b.ends_at) || ' for '
             || public.email_text(gd.display_names) || ' at ' || public.email_text(b.location)
             || E'\n'
             || case
                  when b.starts_at - make_interval(hours => v_settings.cancel_cutoff_hours) > v_now
                    then 'Free to cancel or reschedule until '
                      || public.myt_time_text(
                           b.starts_at - make_interval(hours => v_settings.cancel_cutoff_hours))
                      || ', '
                      || public.myt_day_text(
                           b.starts_at - make_interval(hours => v_settings.cancel_cutoff_hours))
                      || '.'
                  else 'It starts in less than ' || v_hours || ', so it can''t be cancelled.'
                end,
           E'\n\n' order by b.starts_at, b.id)
  into v_count, v_lessons
  from public.bookings b
  join public.group_details gd on gd.group_id = b.group_id
  where gd.account_id = p_account_id
    and b.status = 'booked'
    and (b.starts_at at time zone 'Asia/Kuala_Lumpur')::date = p_for_date;

  if v_count = 0 then
    return;
  end if;

  subject := case when v_count = 1 then 'Swim lesson tomorrow, ' else 'Swim lessons tomorrow, ' end
    || to_char(p_for_date, 'Dy FMDD Mon');
  v_text := 'Hi ' || v_account_name || ',' || E'\n\n'
    || case when v_count = 1 then 'Your swim lesson tomorrow, '
            else 'Your ' || v_count || ' swim lessons tomorrow, ' end
    || to_char(p_for_date, 'Dy FMDD Mon') || ':' || E'\n\n'
    || v_lessons || E'\n\n'
    || 'See your lessons: {{site_url}}/my-classes' || E'\n\n'
    || 'Sent by ' || public.email_text(v_settings.business_name)
    || '. Reply to this email to reach your coach.';
  body_text := v_text;
  body_html := public.email_html(v_text);
  return next;
end;
$$;

-- The coach's digest for p_for_date (BR-33; the Settings page calls it "Tomorrow's schedule"):
-- the day's lessons in order with their location and the travel gap to the next one; the
-- groups among them that are unpaid ("collect RM 260") or on their last paid lesson; and the
-- sign-ups waiting for approval, by username and a count (never the name a stranger typed).
-- Sent on a day with no lessons too: "Tomorrow: no lessons" (Herman, 6 Oct 2026).
create function public.email_digest(p_for_date date)
returns table (subject text, body_text text, body_html text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_settings public.settings;
  v_day text := to_char(p_for_date, 'Dy FMDD Mon');
  v_count int;
  v_first_at timestamptz;
  v_lessons text;
  v_unpaid text;
  v_last text;
  v_waiting_count int;
  v_waiting text;
  v_text text;
begin
  select s.* into v_settings from public.settings s where s.id = 1;

  -- The day's lessons in order, each followed by the travel gap to the next one.
  with lessons as (
    select b.id, b.group_id, b.starts_at, b.ends_at, b.location,
           lead(b.starts_at) over (order by b.starts_at, b.id) as next_starts_at
    from public.bookings b
    where b.status = 'booked'
      and (b.starts_at at time zone 'Asia/Kuala_Lumpur')::date = p_for_date
  )
  select count(*)::int, min(d.starts_at),
         string_agg(
           public.myt_range_text(d.starts_at, d.ends_at) || ' · '
             || public.email_text(gd.display_names) || ' (' || gd.type_label || ') · '
             || public.email_text(d.location)
             || case
                  when d.next_starts_at is null then ''
                  else E'\n' || 'Travel gap to the next lesson: '
                    || public.duration_text(
                         (extract(epoch from d.next_starts_at - d.ends_at) / 60)::int)
                    || case
                         when d.next_starts_at - d.ends_at
                              < make_interval(mins => v_settings.travel_gap_minutes)
                           then ' (less than your usual '
                             || public.duration_text(v_settings.travel_gap_minutes) || ')'
                         else ''
                       end
                end,
           E'\n\n' order by d.starts_at, d.id)
  into v_count, v_first_at, v_lessons
  from lessons d
  join public.group_details gd on gd.group_id = d.group_id;

  -- The groups with a lesson that day that are unpaid: what to collect, a whole number of
  -- packages at the group's price (no amount while that price isn't set).
  select string_agg(
           public.email_text(gd.display_names) || ': collect '
             || coalesce(
                  public.ringgit_text(public.package_price_cents(gb.group_id,
                    ceil((gb.used_lessons + gb.booked_lessons - gb.paid_lessons)::numeric
                         / gb.package_size)::int * gb.package_size)),
                  'payment (no ' || gd.type_label || ' price in Settings)'),
           E'\n' order by first_at.starts_at, gd.display_names)
  into v_unpaid
  from public.group_balance gb
  join public.group_details gd on gd.group_id = gb.group_id
  cross join lateral (
    select min(b.starts_at) as starts_at
    from public.bookings b
    where b.group_id = gb.group_id
      and b.status = 'booked'
      and (b.starts_at at time zone 'Asia/Kuala_Lumpur')::date = p_for_date
  ) first_at
  where gb.unpaid and first_at.starts_at is not null;

  -- The groups whose last paid lesson is that day (BR-22).
  select string_agg(
           public.email_text(gd.display_names) || ' at ' || public.myt_time_text(gb.last_lesson_at),
           E'\n' order by gb.last_lesson_at, gd.display_names)
  into v_last
  from public.group_balance gb
  join public.group_details gd on gd.group_id = gb.group_id
  where (gb.last_lesson_at at time zone 'Asia/Kuala_Lumpur')::date = p_for_date;

  -- Sign-ups waiting for approval: the count and the first ten usernames, oldest first.
  select count(*)::int,
         string_agg(public.email_text(w.username), ', ' order by w.created_at, w.id)
           filter (where w.n <= 10)
  into v_waiting_count, v_waiting
  from (
    select p.id, p.username, p.created_at,
           row_number() over (order by p.created_at, p.id) as n
    from public.profiles p
    where p.role = 'customer' and not p.approved
  ) w;

  if v_count = 0 then
    subject := 'Tomorrow: no lessons';
    v_text := 'No lessons tomorrow, ' || v_day || '.';
  else
    subject := 'Tomorrow: ' || case
      when v_count = 1 then '1 lesson at ' || public.myt_time_text(v_first_at)
      else v_count || ' lessons, first at ' || public.myt_time_text(v_first_at)
    end;
    v_text := 'Tomorrow, ' || v_day || ': '
      || case when v_count = 1 then '1 lesson' else v_count || ' lessons' end || '.'
      || E'\n\n' || v_lessons;
  end if;

  if v_unpaid is not null then
    v_text := v_text || E'\n\n' || 'Unpaid:' || E'\n' || v_unpaid;
  end if;
  if v_last is not null then
    v_text := v_text || E'\n\n' || 'Last paid lesson:' || E'\n' || v_last;
  end if;
  if v_waiting_count > 0 then
    v_text := v_text || E'\n\n' || 'Waiting for approval: ' || v_waiting_count
      || ' (' || v_waiting
      || case when v_waiting_count > 10 then ' and ' || (v_waiting_count - 10) || ' more'
              else '' end
      || ')' || E'\n'
      || 'Approve or remove them on Students & payments: {{site_url}}/coach/students';
  end if;

  v_text := v_text || E'\n\n' || 'Your schedule: {{site_url}}/coach/schedule' || E'\n\n'
    || 'Sent by ' || public.email_text(v_settings.business_name) || '.';
  body_text := v_text;
  body_html := public.email_html(v_text);
  return next;
end;
$$;

-- 2. Queueing the daily emails ---------------------------------------------------------------

-- queue_daily_emails: p_for_date is tomorrow in MYT (mail-queue passes it on every poll).
-- Who: the service role (the mail-queue Edge Function).
-- Each job runs once per date, and only while it is due: from its time on the evening before
-- (reminder_time, digest_time) until p_for_date begins. The reminders (BR-32) are one per
-- account with lessons that day (dedupe reminder:<account>:<date>); the digest (BR-33) goes
-- to coach_email (dedupe digest:<date>; nothing while coach_email is '', but the job is still
-- recorded). daily_jobs records each job ('reminder', 'digest') for the date, so running it
-- again, or two polls at once, adds nothing. Returns how many emails it queued.
create function public.queue_daily_emails(p_for_date date)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_settings public.settings;
  v_now timestamptz := public.app_now();
  v_day_starts timestamptz;
  v_rows int;
  v_queued int := 0;
begin
  if p_for_date is null then
    return 0;
  end if;
  select s.* into v_settings from public.settings s where s.id = 1;
  v_day_starts := p_for_date::timestamp at time zone 'Asia/Kuala_Lumpur';
  if v_now >= v_day_starts then
    return 0;
  end if;

  if v_now >= ((p_for_date - 1) + v_settings.reminder_time) at time zone 'Asia/Kuala_Lumpur' then
    insert into public.daily_jobs (job, for_date) values ('reminder', p_for_date)
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      select v_queued + count(*) filter (where public.queue_email(
               public.account_email(a.account_id), 'reminder',
               'reminder:' || a.account_id || ':' || p_for_date,
               e.subject, e.body_text, e.body_html))::int
      into v_queued
      from (
        select distinct g.account_id
        from public.bookings b
        join public.groups g on g.id = b.group_id
        where b.status = 'booked'
          and (b.starts_at at time zone 'Asia/Kuala_Lumpur')::date = p_for_date
      ) a
      cross join lateral public.email_reminder(a.account_id, p_for_date) e;
    end if;
  end if;

  if v_now >= ((p_for_date - 1) + v_settings.digest_time) at time zone 'Asia/Kuala_Lumpur' then
    insert into public.daily_jobs (job, for_date) values ('digest', p_for_date)
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows > 0 and v_settings.coach_email <> '' then
      select v_queued + count(*) filter (where public.queue_email(
               v_settings.coach_email, 'digest', 'digest:' || p_for_date,
               e.subject, e.body_text, e.body_html))::int
      into v_queued
      from public.email_digest(p_for_date) e;
    end if;
  end if;

  return v_queued;
end;
$$;

-- 3. Handing out the outbox ------------------------------------------------------------------

create index email_outbox_unsent_idx on public.email_outbox (created_at, id)
  where sent_at is null;

-- claim_outbox: up to p_limit (at most 50) rows for the mailer to send, marked as claimed.
-- Who: the service role (the mail-queue Edge Function).
-- First, a claim older than 15 minutes that was never acknowledged counts as a failed try
-- and is released. Then the unsent rows with fewer than 5 failed tries and no claim are
-- handed out: reminders, digests and late alerts first (they matter on the day), then the
-- rest, oldest first (BR-37: what doesn't fit in Gmail's daily quota goes out the next day).
-- Rows sent more than 90 days ago, and rows given up on more than 90 days ago, are deleted:
-- they hold names and addresses.
create function public.claim_outbox(p_limit int)
returns setof public.email_outbox
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := public.app_now();
  v_limit int := least(greatest(coalesce(p_limit, 0), 0), 50);
begin
  delete from public.email_outbox o
  where o.sent_at < v_now - interval '90 days'
     or (o.sent_at is null and o.attempts >= 5 and o.created_at < v_now - interval '90 days');

  update public.email_outbox o
  set claimed_at = null,
      attempts = o.attempts + 1,
      last_error = 'The mailer took it but didn''t say whether it was sent.'
  where o.sent_at is null
    and o.claimed_at <= v_now - interval '15 minutes';

  return query
  with picked as (
    select o.id
    from public.email_outbox o
    where o.sent_at is null
      and o.claimed_at is null
      and o.attempts < 5
    order by o.kind in ('reminder', 'digest', 'late_alert') desc, o.created_at, o.id
    limit v_limit
    for update skip locked
  ),
  claimed as (
    update public.email_outbox o
    set claimed_at = v_now
    from picked
    where o.id = picked.id
    returning o.*
  )
  -- In the order they were picked: the mailer sends them in this order.
  select c.*
  from claimed c
  order by c.kind in ('reminder', 'digest', 'late_alert') desc, c.created_at, c.id;
end;
$$;

-- ack_outbox: what the mailer did with a claimed row.
-- Who: the service role (the mail-queue Edge Function).
-- p_ok: sent (sent_at). Otherwise a failed try: attempts + 1, the error (its first 500
-- characters) in last_error, and the claim released so the next poll tries again, up to 5
-- tries; after that last_error stays and it isn't handed out again. Acts only on a row that
-- is still claimed and unsent; returns whether it did.
create function public.ack_outbox(p_id bigint, p_ok boolean, p_error text default null)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_ok then
    update public.email_outbox o
    set sent_at = public.app_now()
    where o.id = p_id and o.claimed_at is not null and o.sent_at is null;
  else
    update public.email_outbox o
    set claimed_at = null,
        attempts = o.attempts + 1,
        last_error = left(coalesce(nullif(btrim(p_error), ''), 'Unknown error'), 500)
    where o.id = p_id and o.claimed_at is not null and o.sent_at is null;
  end if;
  return found;
end;
$$;

-- 4. The coach's Email log -------------------------------------------------------------------

-- email_log: the latest p_limit (1 to 200; null: 50) emails the site queued, newest first,
-- for the Email log in Settings: when, to whom, which kind, and whether it went out.
-- Who: the coach (not_coach for anyone else). The coach has no grant on email_outbox.
create function public.email_log(p_limit int default 50)
returns table (
  created_at timestamptz,
  to_email text,
  kind text,
  sent_at timestamptz,
  attempts int,
  last_error text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;

  return query
  select o.created_at, o.to_email, o.kind, o.sent_at, o.attempts, o.last_error
  from public.email_outbox o
  order by o.created_at desc, o.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

comment on function public.queue_daily_emails(date) is
  'queue_daily_emails: queues the reminders and the coach digest for a date once they are due.';
comment on function public.claim_outbox(int) is
  'claim_outbox: hands the mailer up to 50 unsent emails, the day''s emails first.';
comment on function public.ack_outbox(bigint, boolean, text) is
  'ack_outbox: records whether the mailer sent a claimed email.';
comment on function public.email_log(int) is
  'email_log: the coach''s list of the latest emails and whether they went out.';

-- Internal: no grants (TECH_SPEC §6).
revoke all on function
  public.ringgit_text(int),
  public.duration_text(int),
  public.email_reminder(uuid, date),
  public.email_digest(date)
from public, anon, authenticated;

-- The service role keeps the execute right every new function gets in this schema
-- (20260928100300_rls removed it only for anon and authenticated); everyone else loses it.
revoke all on function public.queue_daily_emails(date) from public, anon, authenticated;
revoke all on function public.claim_outbox(int) from public, anon, authenticated;
revoke all on function public.ack_outbox(bigint, boolean, text) from public, anon, authenticated;
grant execute on function public.queue_daily_emails(date) to service_role;
grant execute on function public.claim_outbox(int) to service_role;
grant execute on function public.ack_outbox(bigint, boolean, text) to service_role;

revoke all on function public.email_log(int) from public, anon, authenticated;
grant execute on function public.email_log(int) to authenticated;
