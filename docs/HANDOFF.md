# Handoff

Update this file at the end of every Claude Code session. Newest entry on top.
Keep entries short; link to files instead of pasting code.

## v0.4 · 29 Sep 2026 · Prompt 04: Booking, cancelling, packages and payments
**State**: Everything that changes data is live on `swimclass-dev`: five migrations
(`supabase/migrations/20260929100000_coach_slot_check.sql` to `…100400_settings.sql`,
applied with `npx supabase db push`); `src/lib/database.types.ts` regenerated. Typecheck,
lint, format and build pass; `npm run test` runs 275 tests (46 unit, 229 database) and they
pass twice in a row, leaving the seed unchanged. Work is committed on branch
`04-booking-and-payments` (not pushed).
**Done**
- `…_coach_slot_check.sql`: `slot_check` recreated with the coach's options
  (`p_ignore_open_hours`, `p_allow_past`, `p_ignore_window`; defaults are the customer
  rules) and `coach_slot_check` for the Add booking dialog.
- `…_emails.sql`: MYT text helpers (`myt_when_text` "Sat 3 Oct, 9:00–10:00 am" and its
  parts), `email_text`, `email_html`, `account_email`, `queue_email`; templates
  `email_booked`, `email_cancelled`, `email_late_alert`, `email_broadcast`; the queueing
  functions behind them. Names are HTML-escaped (the v0.2 open issue, for these emails).
- `…_booking.sql`: `book_lesson`, `coach_book`, `cancel_booking`, `excuse_booking`,
  `record_payment`, `add_free_lesson`; internal `place_bookings`, `lock_booking_dates`,
  `package_price_cents`.
- `…_groups_accounts.sql`: `create_group`, `update_group`, `set_group_active`,
  `approve_account`, `username_available` (the one function anon may call).
- `…_settings.sql`: `get_public_settings`, `set_open_hours`, `add_exception`,
  `remove_exception`, `update_settings`, `post_announcement`, `remove_announcement`; checks
  that `reminder_time` and `digest_time` are before 24:00.
- Tests: `tests/db/booking.test.ts` (booking, the coach's options, emails, three race
  tests, the clock), `changes.test.ts` (cancel, excuse, payments), `groups.test.ts`,
  `settings.test.ts`; grant lists in `rls.test.ts` and `availability.test.ts`.
- Test harness (`tests/db/helpers.ts`, `vite.config.ts`): `openSession()` for race tests;
  connections are read-only outside each test's `begin read write`, so a test that times out
  can't commit; the fingerprint covers every setting and the seeded accounts (new
  `SEED_FINGERPRINT`); test files run one at a time, 30 s per test.
- Docs: TECH_SPEC §3, §5–§8, §10, §12; PRD BR-31; DESIGN §4 and §6 (messages for the new
  codes, and a coach table); DEV_SETUP §4; prompts 05–12; the comment in
  `src/lib/business.ts`.
- Review: eight read-only reviewers (41 findings, merged to 31), each finding checked by
  three skeptics; 19 confirmed and fixed. Code: customer text could carry the `{{site_url}}`
  placeholder into the coach's emails (now neutralised, and only the templates' paths become
  links); reactivating a group could race `create_group`; '24:00' reminder times; a series
  confirmation that promised free cancellation of a first lesson already locked; messages
  of only newlines; broadcasts to unconfirmed addresses. Tests: a timed-out test could
  commit; files waited on each other's locks; outbox and approved-customer assumptions;
  fingerprint gaps; a race assertion that could never fail. Docs: everything listed above.
**Next**: `prompts/05-auth-and-accounts.md`.
**Decisions**
- Herman: the coach may book in the past (it counts as used) and beyond the booking window.
- Herman: the race tests never commit. The loser waits for the winner's lock and gives up
  after a 3 s lock timeout; the refusal it would get after a commit (`overlap_other`,
  `credit_exceeded`, `gap_after`/`gap_before` across midnight) is tested in one
  transaction. So prompt 04's "the other fails gap_after or gap_before" is proven in two
  parts.
- Locks: the group row first, then `pg_advisory_xact_lock(20260929, days since
  2000-01-01)` for every MYT date `[start − gap, end + gap]` touches, sorted; the booking
  functions are volatile, so they see everything committed while they waited.
- `slot_check` has no gap option: the gap is the last check, so the coach's callers accept a
  gap result when he skips the gap, and only the weeks that need it get `gap_override`.
  Outside open hours he may start at any whole minute. Lesson lengths bind him too.
- Errors: one week fails with `slot_check`'s reason and detail; several with
  `repeat_conflict` {dates, clashes}; `credit_exceeded` {needed, can_still_book}; all codes
  are in TECH_SPEC §5.2–§5.4 and DESIGN §6.
- Emails: `coach_book` sends nothing; late alerts only for customers' changes (a start
  within 24 h, inclusive); cancellation emails always; broadcasts to approved customers
  whose address is confirmed or was invited; links use `{{site_url}}`, which mail-queue
  must replace in all three fields (prompt 11); coach emails wait while `coach_email` is ''.
- `excuse_booking` only once a lesson has started; `set_group_active` won't deactivate a
  group with upcoming lessons; `update_group` moves upcoming lessons to a new location;
  `record_payment`: a null amount is the price pro rata, a null date is today (MYT), no
  future dates.
- Names that differ from TECH_SPEC: `update_settings(p_settings)` (was `p`),
  `post_announcement(…, p_pinned)` for the design's "Pin as a banner" checkbox.
  `get_public_settings` is for every signed-in account, not anon, so signed-out pages use
  `DEFAULT_BUSINESS_NAME`.
- Packages: `group_balance` counts packages by lessons used, `booking_ledger` by lesson
  order, so after booking Sofia on Tue 29 Sep the balance says Package 2 (none left) while
  Sunday's lesson becomes Package 3 lesson 1 (TECH_SPEC §10 reworded).
**Open issues**
- `lesson_expiry_months` is stored, but nothing applies it (BR-24 is off by default and no
  rule is written). Prompt 10 shows it disabled unless Herman defines how expiry works.
- Lesson lengths bind the coach too: with lessons set to 1 hour only, he can't add a 2-hour
  lesson. Ask Herman if he wants that.
- Nothing limits how often a customer books and cancels; a script could fill the outbox
  (Gmail sends 100 a day). Not in the spec; add a limit if it ever matters.
- Accounts waiting for approval can read `payment_instructions` through
  `get_public_settings`. Fine for bank details meant for customers; restrict if Herman
  prefers.
- Prompt 09 must still build `pending_accounts()` and an admin-accounts `delete_account`
  for the Waiting for approval tab (the prompt now says so).
- Customer codes without their own message use DESIGN §6's generic row (`reasons.ts`,
  prompt 06).
- The first full test run once reported "Failed to start forks worker" for
  `tests/unit/routes.test.tsx` (that file didn't run); the second run was clean. If it
  happens again, run again.
- Still open from v0.2/v0.3: sign up as `herman` first; Auth reports trigger errors only
  as "Database error saving new user" (prompt 05); `bookings.group_id` has no `on delete`;
  `database.types.ts` lists internal functions too.
**Manual steps waiting on Herman**
- Review, then merge and push:
  `git switch main && git merge --ff-only 04-booking-and-payments && git push`.
- Done: prompt 03 merged; new nameservers set for swimclass.online at the registrar
  (propagating on 29 Sep).
- Still open: browser click-through, Cloudflare setup once the nameservers are live,
  package prices, Google 2-Step Verification; optional CA certificate check (v0.2).

## v0.3 · 28 Sep 2026 · Prompt 03: Availability engine
**State**: The availability engine is live on `swimclass-dev`
(`supabase/migrations/20260928120000_availability.sql`, applied with `npx supabase db push`);
`src/lib/database.types.ts` regenerated. Typecheck, lint, format and build pass;
`npm run test` runs 180 tests (46 unit, 134 database) and they pass twice in a row, leaving
the seed unchanged. Free start times and reasons match TECH_SPEC §10 exactly. Work is
committed on branch `03-availability-engine` (not pushed).
**Done**
- Migration: `open_windows`, `slot_check`, `lesson_travel`, `myt_text` (internal, no
  grant); `week_slots`, `week_busy`, `coach_week` (granted to `authenticated`); an index on
  `availability_exceptions (ends_at)`.
- `tests/db/availability.test.ts` (44 tests): the §10 tables for 1 and 2 hours, every
  expected reason with its exact detail, check order, start step, booking window in four
  session time zones, the Wed 7 Oct open/closed exceptions, midnight, travel minutes
  (override pairs, neighbours on other days and weeks), `week_busy` privacy, `coach_week`
  details and notes, permissions and grants. `tests/db/rls.test.ts` grant list updated.
- Docs: TECH_SPEC §5.1 (behaviour, decisions, JSON shapes), §5.2 (lock every date within
  the travel gap; the coach needs `slot_check` options and `coach_slot_check`), §5.4 (travel
  gap in `get_public_settings`), §6; prompts 04 (now also builds the §5.4 functions and
  `coach_slot_check`, adds a midnight concurrency test), 06, 07, 08 and 10 adjusted.
- Two reviews: seven angles with three skeptics per finding, then a read-only review of
  the revised code with two. No wrong answers for real bookings. Fixed: a null week start
  read as "all time" (now `invalid_week`); `coach_week` recomputing balances for each day;
  filters that couldn't use indexes; test gaps (check order, step origin, travel across
  weeks, exact details, case-insensitive privacy search); prompt 08 calling a function
  with no grant; §5.4 functions no prompt built.
**Next**: `prompts/04-booking-and-payments.md`.
**Decisions**
- Booking window (Herman): customers can book through the Sunday of the week
  `booking_window_weeks` after the current MYT week (on Mon 28 Sep with 4 weeks: up to Sun
  1 Nov). `past` = the start time has passed.
- Open windows are cut at MYT midnight, so a customer's lesson never crosses midnight;
  closed exceptions win over open ones. Start times step from the start of the window
  they are in (an exception at 3:10 pm shifts that evening; prompt 08's dialogs offer
  times on the step).
- `week_slots` uses the caller as the viewer, so the coach sees `overlap_other` for every
  lesson (names are in `coach_week`).
- Errors: `not_approved` (week_slots, week_busy: accounts waiting for approval),
  `not_your_group` (a customer's missing or other group), `not_found` (coach, no such
  group), `invalid_week`, `invalid_length`, `not_coach` (coach_week).
- JSON times are MYT text (`2026-09-29T19:30:00+08:00`); the `week_slots.starts_at` column
  is a timestamptz (UTC text through the API).
- Travel is in minutes: the gap, shortened next to a closer neighbour, and 0 between an
  override lesson and the neighbour it was squeezed next to, in the customer view too (as
  the design). The UI draws travel only inside open time.
- `slot_check` keeps the TECH_SPEC signature and first-failure order; prompt 04 adds the
  coach's options (TECH_SPEC §5.2).
- Domain: swimclass.online (Herman, noted under v0.2).
**Open issues**
- Codes without a DESIGN §6 message yet: `not_your_group`, `not_found`, `not_coach`,
  `invalid_week`, `invalid_length`, `off_step` (and the v0.2 trigger codes). `week_slots`
  rows only carry codes that have one; give the rest a generic message in
  `src/lib/reasons.ts` (prompt 06).
- Not load-tested with years of data. Before the fixes, the review measured `coach_week`
  at about 0.4 s with three years of synthetic bookings.
- `src/lib/database.types.ts` lists internal functions too (generation ignores grants);
  the browser can't call them.
- `supabase/.temp/linked-project.json` (CLI cache, not in git) says `swimclass` until the
  next `npx supabase link`; `npx supabase projects list` shows `swimclass-dev`.
- During the first review, one agent's test run committed a broken copy of these functions
  to the dev database (many agents running the migration inside test transactions at
  once). Herman approved the cleanup, then the real migration was pushed. Review agents
  now get read-only checks only.
- Still open from v0.2: prompt 09 pending accounts and "Remove"; Auth reports trigger
  errors only as "Database error saving new user" (prompt 05); `bookings.group_id` has no
  `on delete`; HTML-escape names in emails (prompt 11); sign up as `herman` first.
**Manual steps waiting on Herman**
- Review, then merge and push:
  `git switch main && git merge --ff-only 03-availability-engine && git push`.
- Still open: browser click-through, Cloudflare account, package prices, Google 2-Step
  Verification; optional CA certificate check (v0.2).
- Done: the dev project is renamed `swimclass-dev`.

## v0.2 · 28 Sep 2026 · Prompt 02: Database schema, security and seed data
**State**: The data layer is live on `swimclass-dev`: 4 migrations and the seed applied
with `npx supabase db push --include-seed`; `src/lib/database.types.ts` generated. Typecheck,
lint and build pass; `npm run test` runs all 136 tests (46 unit, 90 database against
`swimclass-dev` via `DATABASE_URL`) and they pass, twice in a row, leaving the seed
unchanged. `group_balance` matches the TECH_SPEC §10 table for all 10 groups. Work is
committed on branch `02-database-schema` (not pushed).
**Done**
- Migrations in `supabase/migrations/`: `…_schema.sql` (enums, all §3 tables with checks,
  FKs, the listed indexes, `bookings_no_overlap`, the settings row), `…_triggers.sql`
  (profile on sign-up, group member checks, group never empty, account moves refused,
  `settings.updated_at`), `…_views.sql` (`app_now()`, `lessons_for()`,
  `package_settings()`, `group_details`, `booking_ledger`, `group_balance`),
  `…_rls.sql` (`is_coach()`, `is_approved()`, `my_account_id()`, default privileges
  revoked, RLS on every table, policies and grants per §6).
- `supabase/seed.sql` (§10 fixture, weekly open hours; refuses to run on production) and
  `supabase/snippets/shift-seed.sql` (moves the sample week to next week, dev only).
- `tests/db/helpers.ts` (pg client, transaction per test rolled back, impersonation,
  pinned clock, session time zone America/Los_Angeles, pinned Supabase CA, refuses a
  database that isn't the pristine seed), `balance`, `rls`, `constraints` and
  `shift-seed` tests. `vite.config.ts` passes `DATABASE_URL` to tests.
- `src/lib/database.types.ts` generated (`npm run db:types`).
- Docs: TECH_SPEC §3–§6, §10, §12, §13; DEV_SETUP §3–§4; CLAUDE.md layout; prompts 03,
  04, 05, 07, 08, 09 and 12 adjusted where this data layer changes what they must do.
- Two multi-agent reviews (spec, SQL, security, seed, tests, later prompts, completeness;
  each finding checked by three skeptics, with rolled-back dry runs on the dev project).
  Fixed: exception notes readable by any signed-in account; seed could reach production
  (now refuses where the `swimclass_production` role exists, and prompt 12 marks prod
  before its first push and relinks dev after); test TLS now verifies Supabase's CA; the
  pristine-seed check now catches edits; shift-seed test clock; a wrong trigger comment
  and a seed block that could never work; doc gaps listed under Open issues.
**Next**: `prompts/03-availability-engine.md`.
**Decisions**
- Domain: swimclass.online (bought), use it as the production address in prompt 12.
- `btree_gist` isn't needed: the exclusion constraint is range-only (plain gist).
- The schema migration inserts the settings row; `coach_email` defaults to `''` (the
  seed sets `herman@example.com`, prod updates it in prompt 12).
- `app_now()` ignores `app.now` when `session_user` is `authenticator` (every API
  request), a second lock besides PostgREST not exposing `set_config`.
- Bookings must be exactly 1 or 2 hours (`bookings_length`); `lesson_lengths` must be a
  non-empty subset of {60,120}. Lessons per booking come from `lessons_for()`.
- Customers can't read `settings`, so the views read package size and credit through
  `package_settings()`. Views are keyed by `group_id`. `unpaid_since` and
  `last_lesson_at` are timestamptz (the lesson's start); `unpaid_since` is null when the
  first unpaid lesson is in the opening balance. `can_still_book` can go negative.
- Trigger error codes: `invalid_username`, `student_other_account`, `group_full`,
  `group_empty`. Map them in `src/lib/reasons.ts` when prompts 04/05/09 surface them.
- Default privileges are revoked for `authenticated` too, not only `anon`/`public`: every
  new function needs an explicit `grant execute … to authenticated`, including the coach's
  (he signs in as `authenticated`). TECH_SPEC §6 and prompts 03/04 say so now; prompt 04
  checks herman can call his functions.
- RLS as the §6 matrix, with two narrowings recorded in §6: the coach updates only
  display_name/phone on profiles directly (role and approval through functions), and
  nobody reads `availability_exceptions.note` directly (it may name a customer); the
  coach gets notes through coach functions (coach_week in prompt 03).
- Seed: fixed ids (accounts `a0…`, students `b0…`, groups `c0…`, bookings `d0…`,
  payments `e0…`), password `swim-test-2026` for everyone (public, dev only), sample
  payment amounts, prices left unset. Production is marked with the role
  `swimclass_production` (prompt 12) and the seed refuses to run there.
- The database tests need the seed exactly as loaded (a fingerprint in
  `tests/db/helpers.ts`; update it when `seed.sql` changes); after shifting the sample week or
  adding data on dev, reload with `npx supabase db reset --linked` (DEV_SETUP §3).
**Open issues**
- Prompt 09 "Waiting for approval": the coach can't read other accounts' emails (they
  stay in `auth.users`) and "Remove" has no path. Suggest a coach-only security definer
  `pending_accounts()` returning profile fields plus `auth.users.email` (never a view over
  auth.users), and an `admin-accounts` `delete_account` using `auth.admin.deleteUser`.
- Supabase Auth reports any failure in the profile trigger (`invalid_username`, a taken
  username, name over 100 or phone over 30 characters) only as "Database error saving new
  user", so sign-up (prompt 05) and `admin-accounts` must check these before calling Auth.
  The other trigger codes reach the browser through RPCs (create_group).
- `book_lesson` must lock the group row before the date locks, or two bookings for one
  group on different dates can both pass the credit check (TECH_SPEC §5.2, prompt 04).
- After shift-seed the UI runs at the real time, so screens match the §10 balances only on
  the shifted Saturday 10:00–18:00 MYT (TECH_SPEC §10; prompts 07–09 updated).
- `bookings.group_id` has no `on delete` (as §3), so an account with any booking can't
  be deleted (affects prompt 12's "delete the test account afterwards").
- Prompt 11: HTML-escape display names in emails (they're free text).
- Prompts 05/12: the coach bootstrap promotes whoever registered `herman`; sign up as
  `herman` before opening sign-ups.
- The dev project is named `swimclass` in Supabase (`supabase/.temp/linked-project.json`),
  the name prompt 12 plans for production. Rename it to `swimclass-dev`
  (Project Settings → General) so the two can't be confused.
- Supabase advisors (`npx supabase db advisors --linked`): the WARNs about `is_coach`,
  `is_approved`, `my_account_id` and `package_settings` being callable are intended (RLS
  and the views need them; they return only the caller's own status or the package
  rules). RLS-without-policies on the three service-role tables is intended.
  Leaked-password protection is an Auth setting to consider in prompt 05.
**Manual steps waiting on Herman**
- Rename the dev project from `swimclass` to `swimclass-dev` (Project Settings → General).
- Optional: compare `tests/db/supabase-root-2021-ca.crt` with Dashboard → Project Settings →
  Database → SSL configuration → Download certificate (SHA-256 starts `80:70:25:AD`).
- Try a sample login later (prompt 05): `meiling` / `swim-test-2026`.
- Review, then merge and push:
  `git switch main && git merge --ff-only 02-database-schema && git push`.
- Still open from v0.1: browser click-through, Cloudflare account, package prices,
  Google 2-Step Verification.

## v0.1 · 28 Sep 2026 · Prompt 01: Project setup
**State**: Clickable skeleton, no features and no database yet. `npm install`, then
`npm run dev` → http://localhost:5173. Every route in TECH_SPEC §11 shows a placeholder
page; the customer tab bar and the coach sidebar work. Typecheck, lint, build and tests
(46 unit tests) pass. Work is committed on branch `01-project-setup` (not pushed).
**Done**
- Planning pack copied into the `swimclass` repo and committed (README step 2).
- Vite + React + TypeScript (strict) scaffold; exact-pinned dependencies (`.npmrc`
  `save-exact`), `engines` enforced (`engine-strict`). `package.json`, `tsconfig*.json`,
  `vite.config.ts` (fixed port 5173, Vitest config).
- Folder layout from CLAUDE.md: `src/app`, `src/features/{auth,customer,coach}/<screen>/`,
  `src/components`, `src/lib`, `supabase/{migrations,functions}`, `tests/{db,unit}`,
  `apps-script/`.
- `src/index.css`: DESIGN §2 tokens as CSS variables, Tailwind `@theme` mapping, Figtree
  only (`@fontsource/figtree` 400/500/600 in `src/main.tsx`), focus ring, reduced motion.
- Router (`src/app/routes.tsx`) with every §11 route, stub guards (`src/app/guards.tsx`),
  layouts (`src/app/layouts/`): customer tab bar, coach sidebar, sign-in pages. 404 page,
  error screen, scroll restoration.
- `src/lib/supabase.ts` (publishable key only; refuses anything else), `.env.example`,
  `.env*` ignored; placeholder `src/lib/database.types.ts`.
- `src/lib/time.ts`: MYT helpers and "7:30 pm" / "Sat 3 Oct" / range formatters;
  `tests/unit/time.test.ts`. `tests/unit/routes.test.tsx` renders every route and clicks
  the tab bar and sidebar.
- `npx supabase init` (`supabase/config.toml`). Docker isn't installed, so no
  `supabase start`; steps for `swimclass-dev` are in `docs/DEV_SETUP.md`.
- `wrangler.jsonc` exactly as TECH_SPEC §12 (`npx wrangler deploy --dry-run` passes).
  Not deployed.
- ESLint (type-aware), Prettier, `.gitattributes` (LF). CLAUDE.md "Commands" and README
  (Node version) updated.
- Independent review of the whole step (spec, design and accessibility, time helpers,
  security and config, architecture, completeness; every finding checked by two
  refuters). Fixed: coach pages that failed to download showed a blank page instead of
  the error screen (now tested); Node version wording; skip-link styling; error-screen
  copy; DEV_SETUP wording.
**Next**: `prompts/02-database-schema.md`, after Herman creates `swimclass-dev` and
links it (`docs/DEV_SETUP.md` §2).
**Decisions**
- Node: the current toolchain (React Router 8, Vitest 5, jsdom 30) needs Node 24.15+
  (or 22.22.2+ / 26+; not 25), not "20+". README and DEV_SETUP updated; `engines` in
  `package.json` enforces it.
- Versions: React 19.3, Vite 8.3, TypeScript 6.0, Tailwind 4.3, React Router 8.4,
  TanStack Query 5, supabase-js 2.117, Vitest 5, ESLint 10, Prettier 3. The Supabase CLI
  and Wrangler are pinned dev dependencies.
- No `eslint-plugin-jsx-a11y`: it doesn't support ESLint 10 yet. Accessibility is covered
  by role-based tests (tests find elements by role and accessible name).
- Tailwind's default palette is switched off: only DESIGN tokens exist as colours
  (`bg-accent`, `text-muted`, `border-line`, `bg-warn-tint`, …), plus `text-title`,
  `text-label`, `text-small`, `rounded-control`, `rounded-frame` and so on.
- The coach's pages are lazy-loaded (separate files), so customers never download them.
  Always use the function form `lazy: async () => ({ Component })`: the object form
  swallows a failed download and shows a blank page. The error screen offers "Reload the
  page". Routes are built by `createRoutes()` so each router gets its own route objects.
- Tests run with the device time zone set to America/Los_Angeles, so any accidental use
  of the device's zone fails. `time.ts` rejects date strings without a time and offset.
- Business name: `DEFAULT_BUSINESS_NAME` (`src/lib/business.ts`) until pages read
  `get_public_settings().business_name`.
- `npm run db:types` uses the linked project (no Docker); `db:types:local` for Docker.
**Open issues**
- Placeholder pages say "This screen is a placeholder"; each prompt replaces its own.
- `supabase/config.toml` auth settings are CLI defaults (site URL `127.0.0.1:3000`, email
  confirmation off). They only matter for local Docker Supabase; prompt 05 aligns them
  with TECH_SPEC §9.
- JS bundle is 110 kB gzipped before any feature code; keep an eye on it (PRD §8: first
  load under 3 s on 4G).
- Checked with jsdom tests, the built CSS and the dev server, not in a real browser (see
  manual steps).
- Prompt 02: Vitest only passes `VITE_` variables from `.env.local` to tests, so the
  database tests must load `DATABASE_URL` themselves (for example `loadEnv(mode,
  process.cwd(), 'DATABASE_')` in the `test.env` of `vite.config.ts`). Never prefix it
  with `VITE_`.
- `npm run db:types` writes with `>`, so if generation fails (not linked, project
  paused) `src/lib/database.types.ts` is overwritten with nothing or the error. Fix with
  `git restore src/lib/database.types.ts` and run it again after fixing the cause.
**Manual steps waiting on Herman**
- Click through once in a browser: `npm run dev`, open http://localhost:5173, try every
  tab and sidebar link, press Tab to see the focus ring, and check the text is Figtree.
- Review, then merge and push:
  `git switch main && git merge --ff-only 01-project-setup && git push`.
- Before prompt 02: create and link `swimclass-dev` (`docs/DEV_SETUP.md` §2), or install
  Docker Desktop.
- Still open from v0.0: Cloudflare account, package prices, Google 2-Step Verification.
- Optional: screenshots of each design screen into `design/screens/`.

## v0.0 · 27 Sep 2026 · Planning done, no code yet
**State**: Repo contains only the planning pack (CLAUDE.md, docs/, prompts/, design/).
**Next**: `prompts/01-project-setup.md`.
**Decisions so far**
- Static React app on Cloudflare; all rules in Supabase SQL functions; emails from Gmail
  through Apps Script polling the `mail-queue` Edge Function (TECH_SPEC §1).
- Packages belong to groups (1-to-1/2/3 from one account); coach creates groups.
- One unpaid package allowed; no lesson expiry; repeat weekly is all-or-nothing.
- Domain optional (swimclass.online considered); site works on the free Cloudflare address.
**Open issues**: none.
**Manual steps waiting on Herman**: create GitHub repo, Supabase account, Cloudflare
account; decide package prices; turn on Google 2-Step Verification (needed for the
Gmail App Password in prompt 11).

---
Template for new entries:

## vX.Y · <date> · <prompt number and title>
**State**: what works now, how to run it.
**Done**: bullet list with file paths.
**Next**: the next prompt, and anything half-finished.
**Decisions**: anything that changes or clarifies the docs (also update the doc).
**Open issues**: bugs, questions for Herman, shortcuts to revisit.
**Manual steps waiting on Herman**: accounts, keys, settings he must do himself.
