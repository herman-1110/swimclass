-- Security hardening from the 4 Oct 2026 audit (HANDOFF v0.12).
--
-- 1. A customer may book or cancel at most 10 times in 24 hours, so a script can't flood
--    the outbox (Gmail sends about 100 emails a day). A repeat-weekly booking counts once;
--    the coach's own bookings and cancellations never count. The 10 is an abuse limit like
--    the login limit (TECH_SPEC §7), not a business setting, so it isn't in `settings`.
-- 2. The coach changes open hours, time off, announcements and settings only through their
--    functions, which check and trim what is written; direct table writes are revoked.
-- 3. Tables cap what the functions cap (notes, reasons, payment instructions), plus upper
--    bounds for payments, starting balances and the number of open-hours ranges.
-- 4. username_available (visitors may call it) refuses long input before any work.

-- 1. Booking changes ----------------------------------------------------------------

-- One row per customer change: a booking (one per series) or a cancellation. Only
-- limit_booking_changes writes it; nothing reads it but that function.
create table public.booking_changes (
  id bigint generated always as identity primary key,
  account_id uuid not null references public.profiles on delete cascade,
  series_id uuid,
  changed_at timestamptz not null default now()
);
create index booking_changes_account_changed_idx
  on public.booking_changes (account_id, changed_at);
create unique index booking_changes_series_idx
  on public.booking_changes (account_id, series_id) where series_id is not null;
alter table public.booking_changes enable row level security;
-- RLS on, no policies, no grants: the trigger below writes it as the owner.

-- Before a customer's booking is inserted or cancelled: refuses the change when they made
-- 10 in the last 24 hours, otherwise records it. Acts only for a signed-in customer, so
-- the seed, migrations, coach_book and the coach's cancellations and excuses pass.
-- Every row of one book_lesson call shares its series_id, so a repeat counts once.
-- No extra lock: two calls racing past the 10th change is harmless, and a lock here would
-- come after the group and date locks the booking functions take.
-- Error: too_many_changes {limit}.
create function public.limit_booking_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid;
  v_series uuid;
  v_recent int;
begin
  if auth.uid() is null or public.is_coach() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    v_account := new.created_by;
    v_series := new.series_id;
    if v_series is not null and exists (
      select 1 from public.booking_changes c
      where c.account_id = v_account and c.series_id = v_series
    ) then
      return new;
    end if;
  else
    if not (old.status = 'booked' and new.status = 'cancelled') then
      return new;
    end if;
    v_account := new.cancelled_by;
  end if;
  if v_account is null then
    return new;
  end if;

  select count(*) into v_recent
  from public.booking_changes c
  where c.account_id = v_account and c.changed_at > now() - interval '24 hours';
  if v_recent >= 10 then
    raise exception using errcode = 'P0001', message = 'too_many_changes',
      detail = jsonb_build_object('limit', 10)::text;
  end if;

  insert into public.booking_changes (account_id, series_id) values (v_account, v_series);
  -- Rows older than a day no longer count; keep the table small.
  delete from public.booking_changes c
  where c.account_id = v_account and c.changed_at < now() - interval '2 days';
  return new;
end;
$$;

revoke all on function public.limit_booking_changes() from public, anon, authenticated;

create trigger bookings_limit_changes_insert
  before insert on public.bookings
  for each row execute function public.limit_booking_changes();
create trigger bookings_limit_changes_cancel
  before update of status on public.bookings
  for each row execute function public.limit_booking_changes();

-- 2. The coach writes these tables only through functions ------------------------------

drop policy availability_rules_insert on public.availability_rules;
drop policy availability_rules_update on public.availability_rules;
drop policy availability_rules_delete on public.availability_rules;
drop policy availability_exceptions_insert on public.availability_exceptions;
drop policy availability_exceptions_update on public.availability_exceptions;
drop policy availability_exceptions_delete on public.availability_exceptions;
drop policy announcements_insert on public.announcements;
drop policy announcements_update on public.announcements;
drop policy announcements_delete on public.announcements;
drop policy settings_update on public.settings;

revoke insert, update, delete on public.availability_rules from authenticated;
revoke insert, update, delete on public.availability_exceptions from authenticated;
revoke insert, update, delete on public.announcements from authenticated;
revoke update on public.settings from authenticated;

-- 3. Caps ---------------------------------------------------------------------------------

-- The same limits the functions check (invalid_note, invalid_reason, payment
-- instructions), so nothing longer gets in another way.
alter table public.availability_exceptions
  add constraint availability_exceptions_note_length check (length(note) <= 500);
alter table public.settings
  add constraint settings_payment_instructions_length
  check (length(payment_instructions) <= 2000);
alter table public.bookings
  add constraint bookings_cancel_reason_length check (length(cancel_reason) <= 500);
alter table public.payments
  add constraint payments_note_length check (length(note) <= 500);

-- Upper bounds no real entry reaches; they keep sums like group_balance far from overflow.
alter table public.payments
  add constraint payments_lessons_max check (lessons <= 100),
  add constraint payments_amount_max check (amount_cents <= 10000000);
alter table public.groups
  add constraint groups_opening_max
  check (opening_used_lessons <= 10000 and opening_paid_lessons <= 10000);

-- At most 50 open-hours ranges in the week (the Settings form offers a few per day).
-- Every customer's week_slots reads them all.
create function public.limit_open_hours_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.availability_rules) > 50 then
    raise exception using errcode = 'P0001', message = 'too_many_rules';
  end if;
  return null;
end;
$$;

revoke all on function public.limit_open_hours_rules() from public, anon, authenticated;

create trigger availability_rules_limit
  after insert on public.availability_rules
  for each statement execute function public.limit_open_hours_rules();

-- 4. username_available ------------------------------------------------------------------

-- As before, but anything longer than 64 characters is simply not available, before any
-- lowercasing or lookup. create or replace keeps its grants (anon and authenticated).
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(length(p_username) <= 64, false)
    and coalesce(lower(btrim(p_username)) ~ '^[a-z0-9._]{3,30}$', false)
    and not exists (
      select 1 from public.profiles p where p.username = lower(btrim(p_username))
    )
$$;
