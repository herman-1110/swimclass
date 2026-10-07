-- Payments go at most one package ahead (BR-20; Herman, 7 Oct 2026: "the record payment
-- shouldn't be able to save payment for package that is not exist"). Before this, Save
-- payment could be pressed again and again, and each payment paid for a later package,
-- none of which had a lesson.
--
-- The rule, with S = the package size, P = paid lessons and C = lessons used + booked
-- (group_balance): the package a payment starts paying for, floor(P / S) + 1, may be at most
-- one past the last package that has a lesson, ceil(C / S). So with Package 1 paid and its
-- 4 lessons booked, Package 2 can be paid once before anything is booked in it; the next
-- payment waits until a lesson is booked in Package 2. One payment may not pay past the end
-- of that package either, but a whole package (S lessons) is always allowed, so a group with
-- a free lesson can still pay for a normal package, and lessons already used past what is
-- paid (an opening balance) can be paid off in one go. A group that owes a payment can
-- always pay: C > P, or the current package isn't covered.

-- record_payment as in 20260929100200_booking.sql, with two new errors:
--   paid_ahead {package_no}: already paid one package past the last package with a lesson;
--     package_no is the package where the next lesson booked opens payments again
--   too_many_lessons {max}: the payment would pay further ahead; at most max lessons now
-- Errors: not_coach, not_found, invalid_lessons, paid_ahead, too_many_lessons,
-- invalid_method, invalid_date, invalid_note, invalid_amount, price_not_set.
-- The signature is unchanged, so its grants (coach only, through is_coach()) stay.
create or replace function public.record_payment(
  p_group_id uuid,
  p_lessons int,
  p_amount_cents int,
  p_method public.payment_method,
  p_paid_on date default null,
  p_note text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_today date := (public.app_now() at time zone 'Asia/Kuala_Lumpur')::date;
  v_note text := nullif(btrim(p_note, E' \t\r\n'), '');
  v_amount int := p_amount_cents;
  v_size int;
  v_paid int;
  v_counted int;
  v_limit int;
  v_max int;
  v_id uuid;
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;
  -- Locked, so two payments saved at once (two tabs) can't both go ahead.
  perform 1 from public.groups g where g.id = p_group_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if p_lessons is null or p_lessons < 1 then
    raise exception using errcode = 'P0001', message = 'invalid_lessons';
  end if;

  select gb.package_size, gb.paid_lessons, gb.used_lessons + gb.booked_lessons
  into v_size, v_paid, v_counted
  from public.group_balance gb
  where gb.group_id = p_group_id;
  -- One package past the last one with a lesson: (ceil(C / S) + 1) × S lessons.
  v_limit := ((v_counted + v_size - 1) / v_size + 1) * v_size;
  if v_paid >= v_limit then
    raise exception using errcode = 'P0001', message = 'paid_ahead',
      detail = jsonb_build_object('package_no', v_paid / v_size)::text;
  end if;
  v_max := greatest(v_size, v_limit - v_paid);
  if p_lessons > v_max then
    raise exception using errcode = 'P0001', message = 'too_many_lessons',
      detail = jsonb_build_object('max', v_max)::text;
  end if;

  if p_method is null then
    raise exception using errcode = 'P0001', message = 'invalid_method';
  end if;
  if p_paid_on > v_today then
    raise exception using errcode = 'P0001', message = 'invalid_date';
  end if;
  if length(v_note) > 500 then
    raise exception using errcode = 'P0001', message = 'invalid_note';
  end if;
  if v_amount is null then
    v_amount := public.package_price_cents(p_group_id, p_lessons);
    if v_amount is null then
      raise exception using errcode = 'P0001', message = 'price_not_set';
    end if;
  elsif v_amount < 0 then
    raise exception using errcode = 'P0001', message = 'invalid_amount';
  end if;

  insert into public.payments (group_id, lessons, amount_cents, method, paid_on, note, created_by)
  values (p_group_id, p_lessons, v_amount, p_method, coalesce(p_paid_on, v_today), v_note,
          public.my_account_id())
  returning id into v_id;
  return v_id;
end;
$$;
