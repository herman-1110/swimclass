-- The coach removes a payment saved by mistake (Herman, 9 Oct 2026: "when i misclicked a
-- package for a student i can remove it"). The payment is deleted, so the package counts
-- (group_balance) are what they would be without it, and it leaves the customer's receipts.
-- Nobody is emailed. A free lesson is a payment too and goes the same way. A starting balance
-- isn't a payment: Edit group changes it.

-- remove_payment(p_payment_id): coach only. Errors: not_coach, not_found (no such payment,
-- or already removed), online_payment (a payment gateway recorded it: gateway_ref is set).
create function public.remove_payment(p_payment_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_gateway_ref text;
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;
  select py.group_id into v_group_id from public.payments py where py.id = p_payment_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  -- The group's lock, as record_payment takes it: a payment saved at the same moment is
  -- checked against the balance without this one.
  perform 1 from public.groups g where g.id = v_group_id for update;
  -- Read again under the lock: another tab may have removed it meanwhile.
  select py.gateway_ref into v_gateway_ref from public.payments py where py.id = p_payment_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_gateway_ref is not null then
    raise exception using errcode = 'P0001', message = 'online_payment';
  end if;

  delete from public.payments py where py.id = p_payment_id;
end;
$$;

revoke all on function public.remove_payment(uuid) from public, anon, authenticated;
grant execute on function public.remove_payment(uuid) to authenticated;
