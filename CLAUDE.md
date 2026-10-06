# Swim Class Booking

A booking website for one swimming coach (Herman) and his customers in Malaysia.
Customers book lessons for the student groups the coach has set up. The coach runs
the schedule, packages and payments. Everything must run on free tiers.

## Read first
- `docs/PRD.md`: what we are building and the business rules (BR-x numbers)
- `docs/TECH_SPEC.md`: data model, database functions, security, emails, deployment
- `docs/DESIGN.md`: screens, design tokens, copy rules. Approved screens are in `design/`
- `docs/HANDOFF.md`: where the last session stopped. Read it at the start of every
  session and update it at the end.
- `docs/PRODUCTION.md`: the live site: setting it up, deploying, backups, keys, limits

Work through `prompts/` in order, one prompt per session unless told otherwise.
Each prompt has four parts: CONTEXT, DIAGNOSE, TASK, VALIDATION. Do DIAGNOSE before
changing anything and stop to report if a prerequisite is missing.

## Stack (do not change without asking)
- Frontend: React + Vite + TypeScript (strict) + Tailwind CSS v4 + React Router +
  TanStack Query. Built to static files. Animation: anime.js v4 (see Animation below).
- Hosting: Cloudflare Workers static assets (free). No server-side rendering,
  no Next.js, no Node server.
- Backend: Supabase free plan: Postgres, Auth, Row Level Security, database
  functions called over RPC, and three small Edge Functions (Deno).
- Email: sent from the coach's Gmail by a Google Apps Script that polls an outbox
  through the `mail-queue` Edge Function. Supabase Auth emails use Gmail SMTP.
- Tests: Vitest. Database tests connect with `pg`, run inside a transaction and
  roll back.

## Non-negotiable rules
1. Business rules live in the database. The browser only displays and asks.
   Booking, cancelling, lesson counts, payments and permissions are enforced by
   Postgres functions and RLS. Never trust anything the browser calculated.
2. Time: store `timestamptz`. All business logic and all display use
   `Asia/Kuala_Lumpur` (UTC+8, no daylight saving). Scheduled work thinks in MYT.
3. Travel gap: every lesson needs `settings.travel_gap_minutes` (default 60) free
   before and after it. Only the coach can override it, per booking.
4. Lessons are counted, never stored as a number. Used = booked lessons whose end
   time has passed (no-shows count, excused lessons don't). Balances come from
   payments minus lessons.
5. Packages belong to a group: 1 to 3 students from one account who always book
   together (1-to-1, 1-to-2, 1-to-3). A 2-hour lesson uses 2 lessons.
6. Privacy: customers never see other customers' names, emails or phone numbers.
   Their schedule shows other people's lessons only as "Booked".
7. Secrets never reach the browser. The browser uses the Supabase publishable key
   only. Secret keys live in Edge Function secrets and Apps Script properties.
8. Free tiers only. Do not add paid services, SSR or always-on servers. Ask first if
   something seems to need one.
9. Settings drive behaviour (gap, start step, cutoff, window, package size, prices,
   reminder time). Read them from the `settings` table; never hard-code them.

## Repo layout
`docs/ARCHITECTURE.md` says where every file goes and which layer may import which
(ESLint enforces it). Check it before creating a file. In short:
```
src/
  app/          providers, router and route guards, layouts (tab bar, sidebar), styles
  pages/        one folder per route (book/, coach-schedule/ …), each with an index.ts
  features/     things a person does: a form or button and the change it makes
  entities/     business things: query hooks and display components
  shared/       api/ (the one Supabase client, database.types.ts), config/ (env, routes,
                messages, business name), lib/ (Malaysia time helpers), ui/ (generic UI)
supabase/
  migrations/   SQL migrations. One change per file. Never edit a migration that has been applied.
  functions/    Edge Functions: login, admin-accounts, mail-queue
  seed.sql      sample data matching the design (week of Mon 28 Sep 2026). Dev only, never prod
  scripts/      SQL run by hand (shift-seed.sql; make-coach.sql from prompt 05)
  README.md     database map: where each table, view and function is defined now
tests/
  db/           database tests (pg + transaction rollback)
apps-script/    Code.gs for the Gmail mailer (pasted into Google Apps Script by hand)
design/         approved screens (HTML), phone and computer drawings. Reference only, never import.
docs/  prompts/
```
Unit tests sit next to the code they test (`time.ts` and `time.test.ts`).

## Commands
- `npm run dev`: Vite dev server on http://localhost:5173 (fixed port: auth redirects use it).
  Runs in demo mode (ARCHITECTURE §3.6): the migrations and seed in the browser, sign in as
  any seeded account with `swim-test-2026`; `VITE_DEMO=false` in `.env.local` uses Supabase
- `npm run build`: type-check and build to `dist/`
- `npm run preview`: serve the built `dist/` locally
- `npm run test`: unit tests once (Vitest); `npm run test:watch` re-runs them on save
- `npm run test:db`: database tests against `swimclass-dev` (needs `DATABASE_URL` in
  `.env.local`, DEV_SETUP §4); run it whenever a migration or the seed changes
- `npm run lint` / `npm run typecheck`
- `npm run format` / `npm run format:check`: Prettier
- `npm run db:types`: regenerate `src/shared/api/database.types.ts` from the linked Supabase project
  (`npm run db:types:local` when Supabase runs locally in Docker)
- `npx supabase db reset` (local) or `npx supabase db push` (linked project)
- `npx supabase functions deploy <name>`
- `npx wrangler deploy`: publish `dist/` to Cloudflare at swimclass.online (`--dry-run` checks
  without publishing). Build first: `.env.production.local` holds production's values

The Supabase CLI and Wrangler are pinned dev dependencies, so `npx` runs those versions.
Dev environment setup (no Docker: the `swimclass-dev` project): `docs/DEV_SETUP.md`.

Keep this list current when you add scripts.

## How to work
- Start each session with `docs/HANDOFF.md` and the prompt you are on.
- Make small commits with clear messages. Run typecheck, lint and tests before
  saying a step is done.
- If the docs are unclear or disagree with the code, stop and ask. Do not guess.
- Database functions: `security definer`, `set search_path = ''`, fully qualified
  names, explicit permission checks at the top, and `revoke execute ... from public`
  on anything that is not meant for every user. Update `supabase/README.md` (the
  database map) in the same commit as the migration.
- End each session by updating `docs/HANDOFF.md`: bump the version, record what is
  done, what is next, decisions made and open issues.

## UI rules
- Match `design/` and the tokens in `docs/DESIGN.md`. Minimal look: white background,
  Figtree, one accent (#0B5E7A), orange (#9A3412) only for things that need attention.
- Customer screens are mobile-first (390 px wide). Coach screens are desktop-first
  (1280 px and up). Every screen works at any width from 360 px to 1920 px, with the
  layouts in DESIGN §5.
- Real buttons, links and labels. 44 px minimum touch targets. Visible focus.
  Sentence case. Buttons say what they do ("Book 7:30 pm for Aiman & Sofia",
  "Save payment"). Error messages say what happened and what to do next.

## Animation: anime.js v4
- Installed via npm (`animejs`). Import as modules: `import { animate, stagger } from 'animejs'`
- Do NOT use the v3 style `anime({ targets: ... })`
- Before writing animation code, check the types in `node_modules/animejs`
- Docs: https://animejs.com/documentation
- anime.js ignores "reduce motion": the CSS rule in `src/app/styles/index.css` only reaches
  CSS animations and transitions. Check `prefersReducedMotion()` (`@/shared/lib/motion`)
  before every anime.js animation, and skip it when it is true.
- Load it lazily, inside the handler, so phones don't download it for nothing (the PRD's
  3 s first load). Import a small file that re-exports the functions you use by name
  (`shared/lib/motion/anime.ts`): `import('animejs')` itself pulls in the whole library
  (40 kB gzipped instead of about 13).
- Button hover motion is already done: Button, ButtonLink and IconButton set `data-motion`,
  and `App` installs one listener for the page (DESIGN §3, §5).
