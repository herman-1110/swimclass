# Development setup

How to get a working development environment. Docker isn't installed on Herman's
machine, so development uses a second free Supabase project, `swimclass-dev`, instead of
a local Supabase (TECH_SPEC §2). The production project `swimclass` is created later in
prompt 12. The free plan allows 2 projects, which is exactly dev + prod.

## 1. Tools
- Node 24.15 or newer 24.x (Node 24 LTS, recommended), 22.22.2 or newer 22.x, or 26+.
  Node 25 doesn't work. `npm install` refuses any version outside `engines` in
  `package.json`.
- Git.
- Everything else (Supabase CLI, Wrangler) is installed by `npm install` and run with `npx`.

```sh
npm install
npm run dev          # http://localhost:5173
```
`npm run dev` starts in **demo mode** (ARCHITECTURE §3.6): the website runs the repo's own
migrations and seed in the browser (PGlite), with the clock stopped at Sat 26 Sep 2026,
12:00 pm (the seed's sample week). No Supabase project is needed. Sign in as any seeded
account (§3) with the password `swim-test-2026`: `herman` is the coach, `meiling` a
customer. Changes stay in this browser until you reset the demo data. The first visit
takes a few seconds while the demo database loads. To use the Supabase project instead,
put `VITE_DEMO=false` in `.env.local` (this needs the `login` Edge Function from prompt 05).

## 2. Create the `swimclass-dev` Supabase project (before prompt 02)
1. Sign in at https://supabase.com/dashboard and choose **New project**.
   - Name: `swimclass-dev`
   - Database password: click **Generate a password** and save it in your password
     manager. You need it for step 4 and for the database tests.
   - Region: **Southeast Asia (Singapore)**
   - Plan: Free
2. When the project is ready, open **Project Settings → API Keys**. Copy:
   - the **Project URL** (`https://<project-ref>.supabase.co`), and
   - the **Publishable key** (starts with `sb_publishable_`).

   Never copy the secret key (`sb_secret_...`) into this repo or any `VITE_` variable;
   `npm run build` stops if a `VITE_` value is a secret key or a database address.
3. In the repo root, copy `.env.example` to `.env.local` and paste both values.
   `.env.local` is ignored by Git. A production build reads it too, so the production
   project's values go in `.env.production.local` (also ignored), which wins over it.
4. Link the CLI to the project (the project ref is the part before `.supabase.co`):
   ```sh
   npx supabase login
   npx supabase link --project-ref <project-ref>
   ```
   `login` opens the browser once. `link` asks for the database password from step 1.
5. Check the link works:
   ```sh
   npx supabase migration list
   ```
   It should connect and list no migrations yet.

The free plan pauses a project after a week without requests. If `swimclass-dev` is
paused, open it in the dashboard and choose **Restore**.

## 3. Load the database
The tables, views and security rules are migrations in `supabase/migrations/`; the sample
data is `supabase/seed.sql` (TECH_SPEC §10).

- **First time on `swimclass-dev`** (the project is empty): `npx supabase db push --include-seed`
- **After pulling new migrations**: `npx supabase db push`
- **Start again from scratch** (wipes `swimclass-dev`, then applies every migration and the
  seed): `npx supabase db reset --linked`. Do this before running the database tests if
  you have shifted the sample week or added data while trying the UI.

`--linked` means whichever project the CLI was last linked to. Before any reset, run
`npx supabase projects list` and check that the linked project (marked ●) is
`swimclass-dev`. Never push the seed to production: it refuses to run there once
production is marked (prompt 12).

Sample accounts (all with the password `swim-test-2026`; the repo is public, so this
password is too, which is fine only because this is sample data on the dev project):
`herman` (the coach), `meiling`, `farah`, `weijie`, `priya`, `zulaikha`, `junhao`, `grace`,
`ethan`, `kai`, `daniel`, `aina`, `nurul`. Their emails are `<username>@example.com`,
which no one receives.

The sample lessons sit around the week of Mon 28 Sep 2026. To try the UI with them as
next week, move them forward by whole weeks (running it again in the same week does
nothing):
```sh
npx supabase db query --linked -f supabase/scripts/shift-seed.sql
```
(or paste the file into Dashboard → SQL Editor and click Run).

## 4. Database tests
`npm run test:db` runs `tests/db/` against the dev database (`npm run test` runs only the
unit tests). It needs a `DATABASE_URL` in `.env.local`; without it the database tests are
skipped. Get the string from the dashboard → **Connect** → **Session
pooler** (the direct connection needs IPv6, which many home connections don't have) and
put your database password in place of `[YOUR-PASSWORD]`:
```sh
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```
If the password contains `@ : / ? #` or `%`, replace those characters with `%40 %3A %2F
%3F %23 %25`, or reset the password to one made of letters and digits
(Project Settings → Database). The name has no `VITE_` prefix, so it never reaches the
browser.

Test files run one at a time, as they share the dev database. A full run takes about
2 minutes, and a test that takes over 30 s fails as timed out.

Each test runs in a transaction that is rolled back, so the data stays as loaded. A test
run never changes the dev database, even if a test times out: outside each test's own
transaction the connection is read-only, so nothing can commit. The tests of two bookings
at the same moment open two extra connections, which never commit either. The email tests
read only the outbox rows they add, so emails queued while trying the UI need no reload.

The tests expect the seed exactly as loaded: if the sample week was shifted or you added or
changed data (lessons, students, groups, payments, open hours, blocked or extra time,
messages to customers, any setting, or the sample accounts' names, phones, roles and
approval), they stop with a message asking you to reload it
(`npx supabase db reset --linked`). So after trying the Settings screen, Block time, Open
extra time or Message all customers, reload before you run the tests. Extra sign-ups are
still fine.
Only ever point `DATABASE_URL` at `swimclass-dev`, never at production.

## 5. Edge Functions and Auth (from prompt 05)
Without Docker the functions can't run on this PC, so they run on `swimclass-dev`.
After the CLI is logged in and linked (§2, steps 4 and 5):

1. The website's address, which the functions allow (CORS) and put in their links:
   ```sh
   npx supabase secrets set SITE_URL=http://localhost:5173
   ```
2. Deploy both functions (Supabase bundles them, so no Docker is needed; `config.toml`
   turns the gateway's JWT check off for both, as they check the caller themselves):
   ```sh
   npx supabase functions deploy login --use-api
   npx supabase functions deploy admin-accounts --use-api
   ```
   Deploy again after changing anything in `supabase/functions/`.
3. In the dashboard, **Authentication**:
   - **Sign In / Providers → Email**: on, with **Confirm email** on.
   - **URL Configuration**: Site URL `http://localhost:5173`; Redirect URLs
     `http://localhost:5173/**` (sign-up confirmations open `/login`, password resets and
     invitations `/reset-password`).
   - Until Gmail SMTP is set up (prompt 11), Auth emails only the project's team members,
     so sign up and reset with your own address, or use the seeded accounts.
4. To use the dev project in the browser instead of demo mode, add `VITE_DEMO=false` to
   `.env.local` and restart `npm run dev`. Seeded accounts log in with `swim-test-2026`
   (on dev that password is public: change it before Gmail is connected to dev, TECH_SPEC §9).

To try the CAPTCHA on dev, use Cloudflare's test keys, which always pass:
`VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA` in `.env.local`, and in the dashboard,
**Authentication → Attack Protection → CAPTCHA**: Turnstile with the secret
`1x0000000000000000000000000000000AA`. Turn it off again afterwards, or every sign-in on dev
needs the widget.

## Alternative: local Supabase with Docker
If you install Docker Desktop later, `npx supabase start` runs Supabase on your machine.
Use the URL and publishable key it prints in `.env.local`, `npx supabase db reset` to
apply migrations, and `npm run db:types:local` instead of `npm run db:types`.
