-- Row Level Security and grants, exactly as the TECH_SPEC §6 matrix.
-- Customers (approved or not) see only their own account's rows; the coach sees
-- everything. Writes go through security definer functions except where the matrix
-- allows direct access. email_outbox, daily_jobs and login_attempts are service role
-- only (Edge Functions).

-- Helpers for policies. Security definer so they can read `profiles` without
-- running into its own policies.
create function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'coach'
  )
$$;

create function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.approved
  )
$$;

-- The caller's account (profile) id, or null for someone without a profile.
create function public.my_account_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p where p.id = (select auth.uid())
$$;

-- Nothing is granted by default: new tables, views, sequences and functions start
-- with no access for anon and authenticated (and functions with none for PUBLIC).
-- Every later migration grants what it needs explicitly.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;
-- PUBLIC's execute right on functions is a global default, so it is revoked globally
-- (for objects created by postgres).
alter default privileges for role postgres
  revoke execute on functions from public;

-- And the same for everything the earlier migrations created.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.announcements enable row level security;
alter table public.settings enable row level security;
alter table public.email_outbox enable row level security;
alter table public.daily_jobs enable row level security;
alter table public.login_attempts enable row level security;

-- profiles: own row (update display_name and phone only); the coach sees and can
-- update every row's display_name and phone. Role and approval change only through
-- functions (approve_account, coach bootstrap).
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_coach()));
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_coach()))
  with check (id = (select auth.uid()) or (select public.is_coach()));
grant select, update (display_name, phone) on public.profiles to authenticated;

-- students, groups, group_members: own account's; the coach all. Writes via functions.
create policy students_select on public.students
  for select to authenticated
  using (account_id = (select public.my_account_id()) or (select public.is_coach()));
grant select on public.students to authenticated;

create policy groups_select on public.groups
  for select to authenticated
  using (account_id = (select public.my_account_id()) or (select public.is_coach()));
grant select on public.groups to authenticated;

create policy group_members_select on public.group_members
  for select to authenticated
  using (
    (select public.is_coach())
    or group_id in (
      select g.id from public.groups g where g.account_id = (select public.my_account_id())
    )
  );
grant select on public.group_members to authenticated;

-- bookings, payments: own groups'; the coach all. Writes via functions.
create policy bookings_select on public.bookings
  for select to authenticated
  using (
    (select public.is_coach())
    or group_id in (
      select g.id from public.groups g where g.account_id = (select public.my_account_id())
    )
  );
grant select on public.bookings to authenticated;

create policy payments_select on public.payments
  for select to authenticated
  using (
    (select public.is_coach())
    or group_id in (
      select g.id from public.groups g where g.account_id = (select public.my_account_id())
    )
  );
grant select on public.payments to authenticated;

-- Open hours: everyone signed in reads them; the coach writes them.
create policy availability_rules_select on public.availability_rules
  for select to authenticated
  using (true);
create policy availability_rules_insert on public.availability_rules
  for insert to authenticated
  with check ((select public.is_coach()));
create policy availability_rules_update on public.availability_rules
  for update to authenticated
  using ((select public.is_coach()))
  with check ((select public.is_coach()));
create policy availability_rules_delete on public.availability_rules
  for delete to authenticated
  using ((select public.is_coach()));
grant select, insert, update, delete on public.availability_rules to authenticated;

-- `note` is the coach's private text (it may name a customer), so signed-in users can
-- read every column except it. The coach reads notes through coach functions
-- (coach_week, prompt 03).
create policy availability_exceptions_select on public.availability_exceptions
  for select to authenticated
  using (true);
create policy availability_exceptions_insert on public.availability_exceptions
  for insert to authenticated
  with check ((select public.is_coach()));
create policy availability_exceptions_update on public.availability_exceptions
  for update to authenticated
  using ((select public.is_coach()))
  with check ((select public.is_coach()));
create policy availability_exceptions_delete on public.availability_exceptions
  for delete to authenticated
  using ((select public.is_coach()));
grant select (id, starts_at, ends_at, kind, created_at), insert, update, delete
  on public.availability_exceptions to authenticated;

-- Announcements: customers read the ones not removed; the coach reads and writes all.
create policy announcements_select on public.announcements
  for select to authenticated
  using (removed_at is null or (select public.is_coach()));
create policy announcements_insert on public.announcements
  for insert to authenticated
  with check ((select public.is_coach()));
create policy announcements_update on public.announcements
  for update to authenticated
  using ((select public.is_coach()))
  with check ((select public.is_coach()));
create policy announcements_delete on public.announcements
  for delete to authenticated
  using ((select public.is_coach()));
grant select, insert, update, delete on public.announcements to authenticated;

-- settings: the coach only; customers use get_public_settings().
create policy settings_select on public.settings
  for select to authenticated
  using ((select public.is_coach()));
create policy settings_update on public.settings
  for update to authenticated
  using ((select public.is_coach()))
  with check ((select public.is_coach()));
grant select, update on public.settings to authenticated;

-- email_outbox, daily_jobs, login_attempts: RLS on, no policies, no grants.

-- Views run with the caller's rights, so the policies above apply to them.
grant select on public.group_details, public.booking_ledger, public.group_balance
  to authenticated;

-- Functions the policies and views call.
grant execute on function
  public.is_coach(),
  public.is_approved(),
  public.my_account_id(),
  public.app_now(),
  public.lessons_for(timestamptz, timestamptz),
  public.package_settings()
to authenticated;
