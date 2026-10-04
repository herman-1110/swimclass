-- The login rate limit (BR-4; TECH_SPEC §7 as redesigned after the 4 Oct 2026 audit),
-- for the `login` Edge Function. Service role only.
--
-- 1. login_attempts gains the client's IP and a cap on the username's length, and indexes
--    for the per-IP count and for pruning.
-- 2. check_login_attempt decides whether a try may go ahead and records it, under advisory
--    locks, before the function signs in: the try is stored as a failure first, so tries
--    racing in parallel all count. record_login_success marks it a success afterwards.
-- 3. Limits over 15 minutes: 10 failures for one username from one IP, and 30 failures from
--    one IP for any usernames. Failures for one username from many IPs never lock the
--    account (anyone knows `herman`): in production Auth asks for the CAPTCHA on every
--    sign-in (TECH_SPEC §9), and that is what stops them.

-- 1. The table -----------------------------------------------------------------------------

alter table public.login_attempts
  add column ip inet,
  add constraint login_attempts_username_length check (char_length(username) <= 64);

create index login_attempts_ip_attempted_at_idx on public.login_attempts (ip, attempted_at);
create index login_attempts_attempted_at_idx on public.login_attempts (attempted_at);

comment on column public.login_attempts.ip is
  'The client IP the login Edge Function saw (the first x-forwarded-for entry); null if none.';

-- 2. The functions ---------------------------------------------------------------------------

-- check_login_attempt: the login limit's decision, made before signing in, and the try's record.
-- Who: the service role (the login Edge Function); nobody else may call it.
-- Takes the username as typed (it is trimmed and lowercased here too) and the client's IP.
-- Refuses when the last 15 minutes hold 10 failures for this username from this IP, or 30
-- from this IP for any usernames. Otherwise records the try as a failure (it becomes a
-- success through record_login_success) and returns {attempt_id, email}: the email of the
-- account with that username, or null when there is none (the try still counts).
-- Rows older than a day are deleted. Times are real time (now()), not app_now().
-- Errors: invalid_username (not 3 to 30 of a-z 0-9 . _), too_many_attempts.
create function public.check_login_attempt(p_username text, p_ip inet)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_username text := lower(btrim(p_username));
  v_since timestamptz := now() - interval '15 minutes';
  v_user_ip_failures int;
  v_ip_failures int;
  v_attempt_id bigint;
  v_email text;
begin
  if p_username is null or length(p_username) > 64 or v_username !~ '^[a-z0-9._]{3,30}$' then
    raise exception using errcode = 'P0001', message = 'invalid_username';
  end if;

  -- One try at a time per username, then per IP (always in this order, so two tries can't
  -- wait for each other), so parallel tries can't all pass the count before any is
  -- recorded. The class numbers keep these locks apart from the booking date locks.
  perform pg_advisory_xact_lock(20261004, hashtext(v_username));
  perform pg_advisory_xact_lock(20261005, hashtext(coalesce(host(p_ip), '')));

  delete from public.login_attempts a where a.attempted_at < now() - interval '1 day';

  select count(*) into v_user_ip_failures
  from public.login_attempts a
  where a.username = v_username
    and a.ip is not distinct from p_ip
    and not a.ok
    and a.attempted_at > v_since;

  select count(*) into v_ip_failures
  from public.login_attempts a
  where a.ip is not distinct from p_ip
    and not a.ok
    and a.attempted_at > v_since;

  if v_user_ip_failures >= 10 or v_ip_failures >= 30 then
    raise exception using errcode = 'P0001', message = 'too_many_attempts';
  end if;

  insert into public.login_attempts (username, ip, ok)
  values (v_username, p_ip, false)
  returning id into v_attempt_id;

  select u.email into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username = v_username;

  return jsonb_build_object('attempt_id', v_attempt_id, 'email', v_email);
end;
$$;

comment on function public.check_login_attempt(text, inet) is
  'check_login_attempt: the login limit''s decision, made before signing in, and the try''s record.';

-- record_login_success: marks a try from check_login_attempt as a success, and forgets the
-- earlier failures for that username from that IP (a person who mistyped and then got in
-- starts afresh; the IP's failures for other usernames still count).
-- Who: the service role (the login Edge Function); nobody else may call it.
-- Errors: not_found (no such try still marked a failure).
create function public.record_login_success(p_attempt_id bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_ip inet;
begin
  update public.login_attempts a
  set ok = true
  where a.id = p_attempt_id and not a.ok
  returning a.username, a.ip into v_username, v_ip;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;

  delete from public.login_attempts a
  where a.username = v_username
    and a.ip is not distinct from v_ip
    and not a.ok
    and a.id < p_attempt_id;
end;
$$;

comment on function public.record_login_success(bigint) is
  'record_login_success: marks a try from check_login_attempt as a success.';

-- The service role keeps the execute right every new function gets in this schema
-- (20260928100300_rls removed it only for anon and authenticated); everyone else loses it.
revoke all on function public.check_login_attempt(text, inet) from public, anon, authenticated;
revoke all on function public.record_login_success(bigint) from public, anon, authenticated;
grant execute on function public.check_login_attempt(text, inet) to service_role;
grant execute on function public.record_login_success(bigint) to service_role;
