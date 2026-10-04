-- Makes the coach's account the coach (TECH_SPEC §9). Run it once per project, before the
-- site is announced:
--   1. Sign up on the site as `herman` with the coach's own email, and click the link in
--      the confirmation email.
--   2. Put that email on the line marked below.
--   3. Dashboard → SQL Editor → paste this file → Run (or, for the linked project:
--      npx supabase db query --linked -f supabase/scripts/make-coach.sql).
--
-- It matches the confirmed email in auth.users, never the username: anyone could sign up
-- as `herman` first. It changes nothing unless exactly one account has that confirmed
-- email and no coach exists yet. Running it again stops with "There is already a coach".

do $$
declare
  -- ▼ The coach's email, exactly as he signed up with it.
  v_email text := lower(btrim('coach-email@example.com'));
  v_coach text;
  v_changed int;
begin
  -- The example address (or none) means the line above wasn't filled in.
  if v_email = '' or v_email like '%@example.com' then
    raise exception 'Put the coach''s email in this script first (the line marked ▼).';
  end if;

  select p.username into v_coach from public.profiles p where p.role = 'coach' limit 1;
  if v_coach is not null then
    raise exception 'There is already a coach (%). Nothing was changed.', v_coach;
  end if;

  update public.profiles p
  set role = 'coach', approved = true
  from auth.users u
  where u.id = p.id
    and lower(u.email) = v_email
    and u.email_confirmed_at is not null;
  get diagnostics v_changed = row_count;

  if v_changed <> 1 then
    raise exception 'Expected one account with the confirmed email %, found %. Sign up with it '
      'and click the link in the confirmation email first. Nothing was changed.',
      v_email, v_changed;
  end if;

  select p.username into v_coach from public.profiles p where p.role = 'coach';
  raise notice 'Done: % is the coach.', v_coach;
end;
$$;
