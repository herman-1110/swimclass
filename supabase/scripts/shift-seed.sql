-- Moves the sample data forward by whole weeks so the seed's sample week
-- (Mon 28 Sep 2026 in seed.sql) becomes next week, Malaysia time. For clicking around
-- the UI on the dev project; the database tests keep the original dates.
--
-- Run it in the dev project's SQL editor (Dashboard → SQL Editor → paste → Run), or:
--   npx supabase db query --linked -f supabase/snippets/shift-seed.sql
-- Running it again in the same week changes nothing. Dev project only: it moves every
-- booking, payment and open-hours exception in the database, including ones you
-- created while trying the UI, so they keep their place relative to the sample.

do $$
declare
  -- Jun Hao's lesson on the sample Monday (seed.sql) marks where the sample week is now.
  v_anchor timestamptz;
  v_sample_monday date;
  v_next_monday date :=
    (date_trunc('week', now() at time zone 'Asia/Kuala_Lumpur') + interval '7 days')::date;
  v_days int;
  v_shift interval;
  r record;
begin
  select b.starts_at into v_anchor
  from public.bookings b
  where b.id = 'd0000000-0000-4000-8000-000000000013';

  if v_anchor is null then
    raise exception 'The sample booking this snippet looks for is missing. Load supabase/seed.sql first (npx supabase db reset --linked).';
  end if;

  v_sample_monday := (v_anchor at time zone 'Asia/Kuala_Lumpur')::date;
  v_days := v_next_monday - v_sample_monday;  -- whole weeks: both are Mondays

  if v_days <= 0 then
    raise notice 'Nothing to move: the sample week already starts %.', v_sample_monday;
    return;
  end if;

  -- In hours, so the result doesn't depend on the session's time zone.
  v_shift := make_interval(hours => v_days * 24);

  -- Latest first, so no booking lands on one that hasn't moved yet (bookings_no_overlap
  -- is checked row by row).
  for r in select b.id from public.bookings b order by b.starts_at desc loop
    update public.bookings
    set starts_at = starts_at + v_shift,
        ends_at = ends_at + v_shift,
        cancelled_at = cancelled_at + v_shift
    where id = r.id;
  end loop;

  update public.payments set paid_on = paid_on + v_days;

  update public.availability_exceptions
  set starts_at = starts_at + v_shift,
      ends_at = ends_at + v_shift;

  raise notice 'Moved the sample data forward by % days: the sample week now starts %.',
    v_days, v_next_monday;
end;
$$;
