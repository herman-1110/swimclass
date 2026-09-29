-- The parts of Supabase that supabase/migrations and supabase/seed.sql rely on, so they
-- run unchanged in PGlite for demo mode (src/shared/api/demo). Only what the repo uses:
-- the API roles, auth.users and auth.identities with the columns read or written,
-- auth.uid(), and the two pgcrypto functions the seed calls. Passwords are plain md5
-- here, which is fine only because demo mode holds sample accounts.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;
create schema extensions;
grant usage on schema auth, extensions to anon, authenticated, service_role;

create table auth.users (
  instance_id uuid,
  id uuid primary key,
  aud text,
  role text,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  confirmation_token text,
  recovery_token text,
  email_change_token_new text,
  email_change text
);

create table auth.identities (
  id uuid primary key,
  user_id uuid references auth.users on delete cascade,
  provider_id text,
  identity_data jsonb,
  provider text,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);

-- Supabase reads the caller from the request's JWT claims; demo mode sets the same
-- setting for every call (src/shared/api/demo/index.ts).
create function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

create function extensions.gen_salt(text) returns text
language sql immutable
as $$ select 'demo' $$;

create function extensions.crypt(text, text) returns text
language sql immutable
as $$ select md5($1) $$;
