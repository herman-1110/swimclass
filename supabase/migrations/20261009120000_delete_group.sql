-- The coach deletes a group added by mistake (Herman, 9 Oct 2026: "the group that i
-- accidentally added the student into to be gone"). The group goes with its lessons (past,
-- cancelled and excused), its payments and its starting balance, so it leaves Students &
-- payments, the coach's week and the customer's screens. The account stays, with its other
-- groups. The group's students go too, unless another group has them. Nobody is emailed.
-- Refused while the group has upcoming lessons, as set_group_active refuses to deactivate it:
-- the coach cancels them first. Those cancellation emails may still wait in email_outbox
-- when the group goes; they are left there, so the customer still hears of them.

-- delete_group(p_group_id): coach only. Errors: not_coach, not_found (no such group, or
-- already deleted), group_has_upcoming_lessons {count}, group_online_payment (a payment
-- gateway recorded one of its payments: gateway_ref is set; remove_payment keeps those too).
create function public.delete_group(p_group_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count int;
  v_student_ids uuid[];
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;
  -- The strongest row lock: a booking, payment or change for this group (they lock it more
  -- weakly, or through the foreign key) waits until the group is gone, then fails.
  perform 1 from public.groups g where g.id = p_group_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;

  -- set_group_active's test, so Deactivate and Delete agree about a group.
  select count(*)::int into v_count
  from public.bookings b
  where b.group_id = p_group_id and b.status = 'booked' and b.starts_at > public.app_now();
  if v_count > 0 then
    raise exception using errcode = 'P0001', message = 'group_has_upcoming_lessons',
      detail = jsonb_build_object('count', v_count)::text;
  end if;
  if exists (
    select 1 from public.payments py
    where py.group_id = p_group_id and py.gateway_ref is not null
  ) then
    raise exception using errcode = 'P0001', message = 'group_online_payment';
  end if;

  select coalesce(array_agg(gm.student_id), '{}') into v_student_ids
  from public.group_members gm
  where gm.group_id = p_group_id;

  delete from public.bookings b where b.group_id = p_group_id;
  delete from public.payments py where py.group_id = p_group_id;
  -- Its group_members go with it (on delete cascade); check_group_not_empty lets them, as
  -- the group itself is gone.
  delete from public.groups g where g.id = p_group_id;
  -- Its students that no other group has (only these: a student of the account with no
  -- group for another reason stays).
  delete from public.students s
  where s.id = any (v_student_ids)
    and not exists (select 1 from public.group_members gm where gm.student_id = s.id);
end;
$$;

revoke all on function public.delete_group(uuid) from public, anon, authenticated;
grant execute on function public.delete_group(uuid) to authenticated;
