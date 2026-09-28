# Handoff

Update this file at the end of every Claude Code session. Newest entry on top.
Keep entries short; link to files instead of pasting code.

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
