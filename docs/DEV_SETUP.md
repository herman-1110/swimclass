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
The skeleton runs without Supabase. Pages that talk to the database need step 2.

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

   Never copy the secret key (`sb_secret_...`) into this repo or any `VITE_` variable.
3. In the repo root, copy `.env.example` to `.env.local` and paste both values.
   `.env.local` is ignored by Git.
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

For the database tests in prompt 02 you will also need the database connection string:
dashboard → **Connect** → **Session pooler** (the direct connection needs IPv6, which many
home connections don't have). Keep it ready: prompt 02 sets up the database tests that
read it as `DATABASE_URL`. Only ever point tests at `swimclass-dev`, never at production.

The free plan pauses a project after a week without requests. If `swimclass-dev` is
paused, open it in the dashboard and choose **Restore**.

## Alternative: local Supabase with Docker
If you install Docker Desktop later, `npx supabase start` runs Supabase on your machine.
Use the URL and publishable key it prints in `.env.local`, `npx supabase db reset` to
apply migrations, and `npm run db:types:local` instead of `npm run db:types`.
