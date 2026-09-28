-- Triggers that keep the data consistent (TECH_SPEC §3).
-- Errors use errcode P0001 with a short code as the message, like the RPC functions.

-- A profile row for every new auth user (sign-up, invite, seed).
create function public.handle_new_user()
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
  v_require_approval boolean;
begin
  -- The metadata comes from the person signing up, so only these three fields are
  -- read from it. Role and approval never are.
  if v_username is null or v_username !~ '^[a-z0-9._]{3,30}$' then
    raise exception using errcode = 'P0001', message = 'invalid_username';
  end if;

  select s.require_approval into v_require_approval from public.settings s where s.id = 1;

  insert into public.profiles (id, username, display_name, phone, approved)
  values (
    new.id,
    v_username,
    coalesce(v_display_name, v_username),
    v_phone,
    not coalesce(v_require_approval, true)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- group_members: the student belongs to the group's account (BR-6, BR-7) and the
-- group has at most settings.max_students_per_lesson members.
create function public.check_group_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_account uuid;
  v_student_account uuid;
  v_max int;
  v_count int;
begin
  -- Lock the group so two members added at the same time can't both pass the size check.
  select g.account_id into v_group_account
  from public.groups g
  where g.id = new.group_id
  for update;

  select s.account_id into v_student_account
  from public.students s
  where s.id = new.student_id;

  if v_group_account is distinct from v_student_account then
    raise exception using errcode = 'P0001', message = 'student_other_account';
  end if;

  select s.max_students_per_lesson into v_max from public.settings s where s.id = 1;
  select count(*) into v_count from public.group_members m where m.group_id = new.group_id;

  -- An after trigger, so the count includes this row.
  if v_count > v_max then
    raise exception using errcode = 'P0001', message = 'group_full',
      detail = jsonb_build_object('max', v_max)::text;
  end if;
  return null;
end;
$$;

create trigger group_members_check
  after insert or update on public.group_members
  for each row execute function public.check_group_member();

-- A group always keeps at least one member. Checked at commit, so a group can be
-- inserted first and its members added by later statements in the same transaction
-- (the group must come first: group_members.group_id is an ordinary foreign key).
create function public.check_group_not_empty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  -- Separate statements: plpgsql resolves every field in an expression, and each
  -- table only has one of these.
  if tg_table_name = 'groups' then
    v_group_id := new.id;
  else
    v_group_id := old.group_id;
  end if;

  if exists (select 1 from public.groups g where g.id = v_group_id)
     and not exists (select 1 from public.group_members m where m.group_id = v_group_id) then
    raise exception using errcode = 'P0001', message = 'group_empty';
  end if;
  return null;
end;
$$;

create constraint trigger groups_not_empty
  after insert on public.groups
  deferrable initially deferred
  for each row execute function public.check_group_not_empty();

create constraint trigger group_members_not_empty
  after update or delete on public.group_members
  deferrable initially deferred
  for each row execute function public.check_group_not_empty();

-- Moving a group or a student to another account would break the same-account rule
-- for existing members, so it is refused.
create function public.check_account_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'groups' then
    if exists (
      select 1
      from public.group_members m
      join public.students s on s.id = m.student_id
      where m.group_id = new.id and s.account_id <> new.account_id
    ) then
      raise exception using errcode = 'P0001', message = 'student_other_account';
    end if;
  else
    if exists (
      select 1
      from public.group_members m
      join public.groups g on g.id = m.group_id
      where m.student_id = new.id and g.account_id <> new.account_id
    ) then
      raise exception using errcode = 'P0001', message = 'student_other_account';
    end if;
  end if;
  return new;
end;
$$;

create trigger groups_account_change
  before update of account_id on public.groups
  for each row execute function public.check_account_change();

create trigger students_account_change
  before update of account_id on public.students
  for each row execute function public.check_account_change();

-- settings.updated_at, since the coach may update the row directly (TECH_SPEC §6).
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger settings_touch_updated_at
  before update on public.settings
  for each row execute function public.touch_updated_at();

-- Trigger functions are never called directly.
revoke execute on function
  public.handle_new_user(),
  public.check_group_member(),
  public.check_group_not_empty(),
  public.check_account_change(),
  public.touch_updated_at()
from public, anon, authenticated;
