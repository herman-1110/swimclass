-- Each account's language, and the student emails in it (Herman, 7–8 Oct 2026; HANDOFF v0.26
-- stage 4). The student screens switch between English and Simplified Chinese; this keeps
-- the choice on the account, so emails go out in it, and so a phone that signs in follows the
-- account (Herman: "2. B", the account's choice wins over the phone's).
--
-- 1. profiles.language: 'en', 'zh', or null for an account that never chose (made by the coach
--    in Add students, or before this migration). Null reads as English. The account holder
--    sets it, like the name and phone: a column grant under the profiles_update policy.
-- 2. handle_new_user: also reads the language Sign up sends (only 'en' or 'zh').
-- 3. Chinese dates and times for emails, written as the screens write them: "10月3日 周六",
--    "晚上7:30" (上午 before noon, 下午 to 6 pm, 晚上 from 6 pm), "下午5:30–6:30".
-- 4. The four student emails (booked, cancelled, broadcast, reminder) in Chinese. Each English
--    template is renamed to …_en, unchanged; a function under the old name picks …_en or …_zh
--    by the account's language, so the callers, the dedupe keys and the English text stay as
--    they were. The coach's emails (late alert, digest) stay English. Typed text (names,
--    pools, reasons, messages, the business name) stays as typed.
--
-- Internal functions: no grants (TECH_SPEC §6).

-- 1. The account's language ---------------------------------------------------------------------

alter table public.profiles
  add column language text check (language in ('en', 'zh'));

grant update (language) on public.profiles to authenticated;

-- 2. Sign-up ------------------------------------------------------------------------------------

-- A profile row for every new auth user (sign-up, invite, seed).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_username text := lower(btrim(v_meta ->> 'username'));
  v_display_name text := nullif(btrim(v_meta ->> 'display_name'), '');
  v_phone text := nullif(btrim(v_meta ->> 'phone'), '');
  v_language text := case when v_meta ->> 'language' in ('en', 'zh') then v_meta ->> 'language' end;
  v_require_approval boolean;
begin
  -- The metadata comes from the person signing up, so only these four fields are read
  -- from it. Role and approval never are.
  if v_username is null or v_username !~ '^[a-z0-9._]{3,30}$' then
    raise exception using errcode = 'P0001', message = 'invalid_username';
  end if;

  select s.require_approval into v_require_approval from public.settings s where s.id = 1;

  insert into public.profiles (id, username, display_name, phone, language, approved)
  values (
    new.id,
    v_username,
    coalesce(v_display_name, v_username),
    v_phone,
    v_language,
    not coalesce(v_require_approval, true)
  );
  return new;
end;
$$;

-- 3. Chinese dates and times (MYT) --------------------------------------------------------------

-- 上午 before noon, 下午 from noon, 晚上 from 6 pm.
create function public.myt_period_zh(p_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when extract(hour from p_at at time zone 'Asia/Kuala_Lumpur') < 12 then '上午'
    when extract(hour from p_at at time zone 'Asia/Kuala_Lumpur') < 18 then '下午'
    else '晚上'
  end
$$;

-- "10月3日 周六".
create function public.myt_day_text_zh(p_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(p_at at time zone 'Asia/Kuala_Lumpur', 'FMMM"月"FMDD"日"') || ' '
    || (array['周日', '周一', '周二', '周三', '周四', '周五', '周六'])[
         extract(dow from p_at at time zone 'Asia/Kuala_Lumpur')::int + 1]
$$;

-- "晚上7:30", "下午12:00".
create function public.myt_time_text_zh(p_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select public.myt_period_zh(p_at) || to_char(p_at at time zone 'Asia/Kuala_Lumpur', 'FMHH12:MI')
$$;

-- "晚上7:30–8:30", the period word once; "下午5:00–晚上6:00" when it changes.
create function public.myt_range_text_zh(p_starts_at timestamptz, p_ends_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select public.myt_time_text_zh(p_starts_at) || '–' || case
    when public.myt_period_zh(p_starts_at) = public.myt_period_zh(p_ends_at)
      then to_char(p_ends_at at time zone 'Asia/Kuala_Lumpur', 'FMHH12:MI')
    else public.myt_time_text_zh(p_ends_at)
  end
$$;

-- "10月3日 周六 上午9:00–10:00".
create function public.myt_when_text_zh(p_starts_at timestamptz, p_ends_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select public.myt_day_text_zh(p_starts_at) || ' ' || public.myt_range_text_zh(p_starts_at, p_ends_at)
$$;

-- 4. The student emails in Chinese --------------------------------------------------------------

-- The booking confirmation (BR-34), as email_booked_en words it.
create function public.email_booked_zh(p_series_id uuid)
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
         string_agg(public.myt_when_text_zh(b.starts_at, b.ends_at), E'\n' order by b.starts_at)
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

  v_cutoff_at := v_first_starts_at - make_interval(hours => v_settings.cancel_cutoff_hours);
  v_hours := v_settings.cancel_cutoff_hours || ' 小时';

  if v_count = 1 then
    subject := '已预约：' || v_names || '，'
      || public.myt_when_text_zh(v_first_starts_at, v_first_ends_at);
    v_intro := v_names || ' 的课已预约：' || E'\n' || v_lines || '，地点：' || v_location;
    if v_cutoff_at > v_now then
      v_cancel := public.myt_day_text_zh(v_cutoff_at) || ' ' || public.myt_time_text_zh(v_cutoff_at)
        || '前可以免费取消或改期。';
    else
      v_cancel := '离上课不到 ' || v_hours || '，所以不能取消。';
    end if;
  else
    subject := '已预约：' || v_names || ' 的 ' || v_count || ' 节课，从'
      || public.myt_day_text_zh(v_first_starts_at) || '开始';
    v_intro := v_names || ' 在 ' || v_location || ' 的 ' || v_count || ' 节课已预约：' || E'\n'
      || v_lines;
    v_cancel := case when v_settings.cancel_cutoff_hours = 0 then '每节课开课前都可以免费取消或改期。'
                     else '每节课开课 ' || v_hours || '前都可以免费取消或改期。' end;
    if v_cutoff_at <= v_now then
      v_cancel := v_cancel || '第一节离上课不到 ' || v_hours || '，所以不能取消。';
    end if;
  end if;

  v_text := v_account_name || '，你好：' || E'\n\n'
    || v_intro || E'\n\n'
    || v_cancel || E'\n'
    || '查看你的课：{{site_url}}/my-classes' || E'\n\n'
    || '由 ' || public.email_text(v_settings.business_name)
    || ' 发送。回复这封电子邮件就能联系教练。';
  body_text := v_text;
  body_html := public.email_html(v_text);
  return next;
end;
$$;

-- A cancelled lesson, as email_cancelled_en words it.
create function public.email_cancelled_zh(p_booking_id uuid)
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
  v_when := public.myt_when_text_zh(v_booking.starts_at, v_booking.ends_at);

  subject := '已取消：' || v_names || '，' || v_when;
  v_text := v_account_name || '，你好：' || E'\n\n'
    || case when v_by_coach then '教练取消了这节课：' else '你取消了这节课：' end || E'\n'
    || v_when || '，' || v_names || '，地点：' || public.email_text(v_booking.location)
    || case when v_by_coach and v_booking.cancel_reason is not null
            then E'\n' || '原因：' || public.email_text(v_booking.cancel_reason)
            else '' end || E'\n\n'
    || '这节课已回到你的配套。预约别的时间：{{site_url}}/book' || E'\n\n'
    || '由 ' || v_business_name || ' 发送。回复这封电子邮件就能联系教练。';
  body_text := v_text;
  body_html := public.email_html(v_text);
  return next;
end;
$$;

-- The coach's message to every customer (BR-36), as email_broadcast_en words it.
create function public.email_broadcast_zh(p_announcement_id uuid, p_account_id uuid)
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

  subject := '教练的消息';
  v_text := v_account_name || '，你好：' || E'\n\n'
    || v_message || E'\n\n'
    || '打开 ' || v_business_name || '：{{site_url}}' || E'\n\n'
    || '由 ' || v_business_name || ' 发送。回复这封电子邮件就能联系教练。';
  body_text := v_text;
  body_html := public.email_html(v_text);
  return next;
end;
$$;

-- The evening reminder (BR-32), as email_reminder_en words it.
create function public.email_reminder_zh(p_account_id uuid, p_for_date date)
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
  v_day text;
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

  v_hours := v_settings.cancel_cutoff_hours || ' 小时';
  -- Noon MYT names the date.
  v_day := public.myt_day_text_zh((p_for_date + time '12:00') at time zone 'Asia/Kuala_Lumpur');

  select count(*)::int,
         string_agg(
           public.myt_range_text_zh(b.starts_at, b.ends_at) || '，'
             || public.email_text(gd.display_names) || '，地点：' || public.email_text(b.location)
             || E'\n'
             || case
                  when b.starts_at - make_interval(hours => v_settings.cancel_cutoff_hours) > v_now
                    then public.myt_day_text_zh(
                           b.starts_at - make_interval(hours => v_settings.cancel_cutoff_hours))
                      || ' '
                      || public.myt_time_text_zh(
                           b.starts_at - make_interval(hours => v_settings.cancel_cutoff_hours))
                      || '前可以免费取消或改期。'
                  else '离上课不到 ' || v_hours || '，所以不能取消。'
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

  subject := '明天的游泳课，' || v_day;
  v_text := v_account_name || '，你好：' || E'\n\n'
    || case when v_count = 1 then '你明天（' || v_day || '）的游泳课：'
            else '你明天（' || v_day || '）的 ' || v_count || ' 节游泳课：' end || E'\n\n'
    || v_lessons || E'\n\n'
    || '查看你的课：{{site_url}}/my-classes' || E'\n\n'
    || '由 ' || public.email_text(v_settings.business_name)
    || ' 发送。回复这封电子邮件就能联系教练。';
  body_text := v_text;
  body_html := public.email_html(v_text);
  return next;
end;
$$;

-- The English templates keep their text under a new name; the old names pick a language.
alter function public.email_booked(uuid) rename to email_booked_en;
alter function public.email_cancelled(uuid) rename to email_cancelled_en;
alter function public.email_broadcast(uuid, uuid) rename to email_broadcast_en;
alter function public.email_reminder(uuid, date) rename to email_reminder_en;

create function public.email_booked(p_series_id uuid)
returns table (subject text, body_text text, body_html text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.bookings b
    join public.groups g on g.id = b.group_id
    join public.profiles p on p.id = g.account_id
    where b.series_id = p_series_id and p.language = 'zh'
  ) then
    return query select * from public.email_booked_zh(p_series_id);
  else
    return query select * from public.email_booked_en(p_series_id);
  end if;
end;
$$;

create function public.email_cancelled(p_booking_id uuid)
returns table (subject text, body_text text, body_html text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.bookings b
    join public.groups g on g.id = b.group_id
    join public.profiles p on p.id = g.account_id
    where b.id = p_booking_id and p.language = 'zh'
  ) then
    return query select * from public.email_cancelled_zh(p_booking_id);
  else
    return query select * from public.email_cancelled_en(p_booking_id);
  end if;
end;
$$;

create function public.email_broadcast(p_announcement_id uuid, p_account_id uuid)
returns table (subject text, body_text text, body_html text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles p where p.id = p_account_id and p.language = 'zh') then
    return query select * from public.email_broadcast_zh(p_announcement_id, p_account_id);
  else
    return query select * from public.email_broadcast_en(p_announcement_id, p_account_id);
  end if;
end;
$$;

create function public.email_reminder(p_account_id uuid, p_for_date date)
returns table (subject text, body_text text, body_html text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles p where p.id = p_account_id and p.language = 'zh') then
    return query select * from public.email_reminder_zh(p_account_id, p_for_date);
  else
    return query select * from public.email_reminder_en(p_account_id, p_for_date);
  end if;
end;
$$;

-- All internal (TECH_SPEC §6): no grants.
revoke all on function
  public.myt_period_zh(timestamptz),
  public.myt_day_text_zh(timestamptz),
  public.myt_time_text_zh(timestamptz),
  public.myt_range_text_zh(timestamptz, timestamptz),
  public.myt_when_text_zh(timestamptz, timestamptz),
  public.email_booked_zh(uuid),
  public.email_cancelled_zh(uuid),
  public.email_broadcast_zh(uuid, uuid),
  public.email_reminder_zh(uuid, date),
  public.email_booked(uuid),
  public.email_cancelled(uuid),
  public.email_broadcast(uuid, uuid),
  public.email_reminder(uuid, date)
from public, anon, authenticated;
