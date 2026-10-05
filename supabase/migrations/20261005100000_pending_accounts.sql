-- Accounts waiting for approval, with their email (prompt 09; TECH_SPEC §5.3, §6; PRD BR-2),
-- for the coach's Waiting for approval tab. Emails stay in auth.users (TECH_SPEC §3): the
-- coach reads them only through this function, never a view over auth.users.

-- pending_accounts: the customer accounts with approved = false, oldest sign-up first.
-- Who: the coach (not_coach for anyone else).
-- Returns per account: id, username, display_name, phone, email (account_email; null if
-- the address is empty), email_confirmed (whether Auth has confirmed the address; an
-- invited or unconfirmed sign-up has not), created_at (the sign-up).
create function public.pending_accounts()
returns table (
  id uuid,
  username text,
  display_name text,
  phone text,
  email text,
  email_confirmed boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_coach() then
    raise exception using errcode = 'P0001', message = 'not_coach';
  end if;

  return query
  select p.id, p.username, p.display_name, p.phone,
         public.account_email(p.id),
         coalesce(u.email_confirmed_at is not null, false),
         p.created_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.role = 'customer' and not p.approved
  order by p.created_at, p.id;
end;
$$;

comment on function public.pending_accounts() is
  'pending_accounts: the coach''s list of accounts waiting for approval, with their email.';

revoke all on function public.pending_accounts() from public, anon, authenticated;
grant execute on function public.pending_accounts() to authenticated;
