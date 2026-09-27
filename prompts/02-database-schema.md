# Prompt 02: Database schema, security and seed data

## CONTEXT
Skeleton from prompt 01 exists. Now build the data layer that everything else relies on.
Read TECH_SPEC §3 (tables), §4 (views), §6 (RLS and grants), §10 (fixture), and
PRD §4–5 (concepts and rules BR-6, BR-19 to BR-25). Functions for booking come in
prompts 03–04; this prompt is tables, constraints, views, security, seed and tests.

## DIAGNOSE
1. Confirm Supabase is reachable: local (`npx supabase status`) or linked dev project.
2. List existing migrations; there should be none besides what `supabase init` made.
3. Confirm the `btree_gist` extension is not needed for the exclusion constraint
   (range-only exclusion works with plain gist); note if you enable any extension.
4. Stop and report if you can't connect.

## TASK
1. Migration `..._schema.sql`: enums, all tables in TECH_SPEC §3 with checks, foreign
   keys, indexes (`bookings(starts_at)`, `bookings(group_id, starts_at)`,
   `payments(group_id)`, `students(account_id)`, `groups(account_id)`), the
   `bookings_no_overlap` exclusion constraint, and the single `settings` row.
2. Migration `..._triggers.sql`:
   - create a `profiles` row when an `auth.users` row is inserted (from
     `raw_user_meta_data`: username lowercased, display_name, phone; `approved` =
     not `require_approval`);
   - `group_members` checks (same account; 1..max members).
3. Migration `..._views.sql`: the `app_now()` helper (TECH_SPEC §5), then
   `group_details`, `booking_ledger`, `group_balance`, all using `app_now()` and
   `security_invoker = true`.
4. Migration `..._rls.sql`: helper functions `is_coach()`, `is_approved()`,
   `my_account_id()`; enable RLS everywhere; policies and grants exactly as the §6
   matrix; revoke default privileges from `anon` and `public`.
5. `supabase/seed.sql`: the §10 fixture: the coach (`herman`), all customer accounts
   (create auth users with known test passwords), students, groups with opening
   balances, payments, bookings, weekly open hours. Dates in MYT.
   Also `supabase/snippets/shift-seed.sql`: moves every fixture booking, payment and
   exception forward by whole weeks so the fixture week becomes next week (for trying
   the UI on the dev project; tests keep the original dates).
6. `tests/db/helpers.ts`: open a `pg` client from `DATABASE_URL`, begin a transaction,
   impersonate a user (`set local role authenticated; set local request.jwt.claims = ...`),
   pin the clock (`set local app.now = ...`), and roll back after each test.
7. `npm run db:types` to generate `src/lib/database.types.ts`.

## VALIDATION
- Migrations apply from scratch (`npx supabase db reset` locally, or to the dev project).
- `tests/db/balance.test.ts`: with `set local app.now = '2026-09-26 12:00+08'`,
  `group_balance` matches the expected table in TECH_SPEC §10 for all ten groups (package, used in package, booked,
  left, paid/unpaid, unpaid_since, last_lesson_at).
- `tests/db/rls.test.ts`:
  - meiling sees only her students, groups, bookings and payments;
  - meiling cannot select `settings`, `email_outbox`, `login_attempts`;
  - meiling cannot insert into `bookings` or `payments` directly;
  - the coach can read everything.
- Inserting two overlapping 'booked' rows fails on `bookings_no_overlap`; overlapping
  a 'cancelled' row succeeds.
- A group with a student from another account is rejected; a 4th member is rejected.
- HANDOFF.md updated.
