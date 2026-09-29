-- Students, groups and accounts (TECH_SPEC §5.3; PRD BR-1, BR-2, BR-6, BR-7, BR-25).
-- A group is 1 to max_students_per_lesson students of one account who always book
-- together; only the coach creates and changes groups. The group_members triggers
-- (prompt 02) still check the account and the size underneath.

-- The coach adds a group for a customer account (Add students, prompt 09).
-- p_students: a JSON array of 1 to max_students_per_lesson items, each
-- {"student_id": "<uuid>"} (a student of that account) or {"name": "<new student>"}.
-- p_location: the pool. p_first_package_paid records a payment of lessons_per_package
-- lessons dated today (p_amount_cents, null: the type's package price; p_method).
-- p_opening_used and p_opening_paid: lessons used and paid before the system (BR-25).
-- An exact duplicate of an active group (same account, same students) is refused.
-- Returns the group id. Errors: not_coach, not_found (account), not_customer,
-- invalid_students {index}, group_full {max}, student_other_account {index},
-- invalid_name {index}, invalid_location, invalid_opening, duplicate_group {group_id},
-- invalid_method, invalid_amount, price_not_set.
create function public.create_group(
  p_account_id uuid,
  p_students jsonb,
  p_location text,
  p_first_package_paid boolean default false,
  p_amount_cents int default null,
  p_method public.payment_method default null,
  p_opening_used int default 0,
  p_opening_paid int default 0
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_settings public.settings;
  v_account public.profiles;
  v_location text := btrim(p_location, E' \t\r\n');
  v_opening_used int := coalesce(p_opening_used, 0);
  v_opening_paid int := coalesce(p_opening_paid, 0);
  v_paid boolean := coalesce(p_first_package_paid, false);
  v_amount int := p_amount_cents;
  v_item jsonb;
  v_index int;
  v_student_id uuid;
  v_student_account uuid;
  v_name text;
  v_student_ids uuid[] := '{}'::uuid[];
  v_new_names text[] := '{}'::text[];
  v_duplicate uuid;
  v_group_id uuid;
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;

  -- Locked, so two identical groups added at the same moment can't both pass the
  -- duplicate check.
  select p.* into v_account from public.profiles p where p.id = p_account_id for no key update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_account.role <> 'customer' then
    raise exception using errcode = 'P0001', message = 'not_customer';
  end if;

  select s.* into v_settings from public.settings s where s.id = 1;
  if p_students is null or jsonb_typeof(p_students) <> 'array'
     or jsonb_array_length(p_students) = 0 then
    raise exception using errcode = 'P0001', message = 'invalid_students';
  end if;
  if jsonb_array_length(p_students) > v_settings.max_students_per_lesson then
    raise exception using errcode = 'P0001', message = 'group_full',
      detail = jsonb_build_object('max', v_settings.max_students_per_lesson)::text;
  end if;

  for v_item, v_index in
    select e.value, e.ordinality::int
    from jsonb_array_elements(p_students) with ordinality as e
  loop
    if jsonb_typeof(v_item) = 'object' and v_item ? 'student_id' and not v_item ? 'name' then
      -- An existing student of this account, listed once.
      begin
        v_student_id := (v_item ->> 'student_id')::uuid;
      exception
        when invalid_text_representation then
          v_student_id := null;
      end;
      v_student_account := null;
      if v_student_id is not null then
        select s.account_id into v_student_account
        from public.students s
        where s.id = v_student_id;
      end if;
      if v_student_account is null or v_student_id = any (v_student_ids) then
        raise exception using errcode = 'P0001', message = 'invalid_students',
          detail = jsonb_build_object('index', v_index)::text;
      end if;
      if v_student_account <> p_account_id then
        raise exception using errcode = 'P0001', message = 'student_other_account',
          detail = jsonb_build_object('index', v_index)::text;
      end if;
      v_student_ids := v_student_ids || v_student_id;
    elsif jsonb_typeof(v_item) = 'object' and v_item ? 'name' and not v_item ? 'student_id' then
      -- A new student.
      v_name := btrim(v_item ->> 'name', E' \t\r\n');
      if jsonb_typeof(v_item -> 'name') <> 'string' or length(v_name) not between 1 and 100 then
        raise exception using errcode = 'P0001', message = 'invalid_name',
          detail = jsonb_build_object('index', v_index)::text;
      end if;
      v_new_names := v_new_names || v_name;
    else
      raise exception using errcode = 'P0001', message = 'invalid_students',
        detail = jsonb_build_object('index', v_index)::text;
    end if;
  end loop;

  if v_location is null or length(v_location) not between 1 and 100 then
    raise exception using errcode = 'P0001', message = 'invalid_location';
  end if;
  if v_opening_used < 0 or v_opening_paid < 0 then
    raise exception using errcode = 'P0001', message = 'invalid_opening';
  end if;

  -- New students can't be in a group yet, so only a group of existing ones can be a
  -- duplicate.
  if cardinality(v_new_names) = 0 then
    select gd.group_id into v_duplicate
    from public.group_details gd
    where gd.account_id = p_account_id
      and gd.active
      and gd.size = cardinality(v_student_ids)
      and gd.student_ids @> v_student_ids
    limit 1;
    if v_duplicate is not null then
      raise exception using errcode = 'P0001', message = 'duplicate_group',
        detail = jsonb_build_object('group_id', v_duplicate)::text;
    end if;
  end if;

  if v_paid and p_method is null then
    raise exception using errcode = 'P0001', message = 'invalid_method';
  end if;
  if v_paid and v_amount < 0 then
    raise exception using errcode = 'P0001', message = 'invalid_amount';
  end if;

  insert into public.groups (account_id, location, opening_used_lessons, opening_paid_lessons)
  values (p_account_id, v_location, v_opening_used, v_opening_paid)
  returning id into v_group_id;

  if cardinality(v_new_names) > 0 then
    with added as (
      insert into public.students (account_id, name)
      select p_account_id, n.name
      from unnest(v_new_names) with ordinality as n (name, i)
      order by n.i
      returning id
    )
    select v_student_ids || array_agg(a.id) into v_student_ids from added a;
  end if;

  insert into public.group_members (group_id, student_id)
  select v_group_id, m.student_id
  from unnest(v_student_ids) as m (student_id);

  if v_paid then
    if v_amount is null then
      v_amount := public.package_price_cents(v_group_id, v_settings.lessons_per_package);
      if v_amount is null then
        raise exception using errcode = 'P0001', message = 'price_not_set';
      end if;
    end if;
    insert into public.payments (group_id, lessons, amount_cents, method, paid_on, created_by)
    values (v_group_id, v_settings.lessons_per_package, v_amount, p_method,
            (public.app_now() at time zone 'Asia/Kuala_Lumpur')::date, public.my_account_id());
  end if;

  return v_group_id;
end;
$$;

-- The coach edits a group (prompt 09): its pool and its starting balances (BR-25). Null
-- leaves a value as it is. A new location also applies to the group's upcoming booked
-- lessons: that is where the coach will travel. Past lessons keep theirs.
-- Errors: not_coach, not_found, invalid_location, invalid_opening.
create function public.update_group(
  p_group_id uuid,
  p_location text default null,
  p_opening_used int default null,
  p_opening_paid int default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_group public.groups;
  v_location text := btrim(p_location, E' \t\r\n');
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;

  select g.* into v_group from public.groups g where g.id = p_group_id for no key update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if p_location is not null and length(v_location) not between 1 and 100 then
    raise exception using errcode = 'P0001', message = 'invalid_location';
  end if;
  if p_opening_used < 0 or p_opening_paid < 0 then
    raise exception using errcode = 'P0001', message = 'invalid_opening';
  end if;

  update public.groups g
  set location = coalesce(v_location, g.location),
      opening_used_lessons = coalesce(p_opening_used, g.opening_used_lessons),
      opening_paid_lessons = coalesce(p_opening_paid, g.opening_paid_lessons)
  where g.id = p_group_id;

  if v_location is not null and v_location <> v_group.location then
    update public.bookings b
    set location = v_location
    where b.group_id = p_group_id
      and b.status = 'booked'
      and b.starts_at > public.app_now();
  end if;
end;
$$;

-- The coach deactivates or reactivates a group (BR-6, BR-7: customers book only for
-- active groups). A group with upcoming booked lessons can't be deactivated: cancel
-- them first. Reactivating is refused while an active group has the same students.
-- Errors: not_coach, invalid_active, not_found, has_upcoming_lessons {count},
-- duplicate_group {group_id}.
create function public.set_group_active(p_group_id uuid, p_active boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_group public.groups;
  v_count int;
  v_duplicate uuid;
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;
  if p_active is null then
    raise exception using errcode = 'P0001', message = 'invalid_active';
  end if;

  -- Locked like a booking locks it, so a booking can't slip in between.
  select g.* into v_group from public.groups g where g.id = p_group_id for no key update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if p_active = v_group.active then
    return;
  end if;

  if not p_active then
    select count(*)::int into v_count
    from public.bookings b
    where b.group_id = p_group_id and b.status = 'booked' and b.starts_at > public.app_now();
    if v_count > 0 then
      raise exception using errcode = 'P0001', message = 'has_upcoming_lessons',
        detail = jsonb_build_object('count', v_count)::text;
    end if;
  else
    -- The account lock create_group takes, so a group added (or another one reactivated)
    -- at the same moment can't slip past this duplicate check.
    perform 1 from public.profiles p where p.id = v_group.account_id for no key update;
    select g2.group_id into v_duplicate
    from public.group_details g1
    join public.group_details g2
      on g2.account_id = g1.account_id
     and g2.group_id <> g1.group_id
     and g2.active
     and g2.size = g1.size
     and g2.student_ids @> g1.student_ids
    where g1.group_id = p_group_id
    limit 1;
    if v_duplicate is not null then
      raise exception using errcode = 'P0001', message = 'duplicate_group',
        detail = jsonb_build_object('group_id', v_duplicate)::text;
    end if;
  end if;

  update public.groups g set active = p_active where g.id = p_group_id;
end;
$$;

-- The coach approves an account that is waiting for approval (BR-2).
-- Errors: not_coach, not_found.
create function public.approve_account(p_account_id uuid)
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

  update public.profiles p set approved = true where p.id = p_account_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
end;
$$;

-- Sign-up's live check (BR-1): true when p_username, lowercased and trimmed like the
-- profile trigger does, is a valid username that no account has. Only true or false,
-- never whose it is. The one function visitors (anon) may call; the coach's form for a
-- new account (prompt 09) uses it too.
create function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(lower(btrim(p_username)) ~ '^[a-z0-9._]{3,30}$', false)
    and not exists (
      select 1 from public.profiles p where p.username = lower(btrim(p_username))
    )
$$;

-- Grants (TECH_SPEC §6): the coach's functions check is_coach() first;
-- username_available is also for visitors.
revoke all on function
  public.create_group(uuid, jsonb, text, boolean, int, public.payment_method, int, int),
  public.update_group(uuid, text, int, int),
  public.set_group_active(uuid, boolean),
  public.approve_account(uuid),
  public.username_available(text)
from public, anon, authenticated;

grant execute on function
  public.create_group(uuid, jsonb, text, boolean, int, public.payment_method, int, int),
  public.update_group(uuid, text, int, int),
  public.set_group_active(uuid, boolean),
  public.approve_account(uuid),
  public.username_available(text)
to authenticated;

grant execute on function public.username_available(text) to anon;
