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

Work through `prompts/` in order, one prompt per session unless told otherwise.
Each prompt has four parts: CONTEXT, DIAGNOSE, TASK, VALIDATION. Do DIAGNOSE before
changing anything and stop to report if a prerequisite is missing.

## Stack (do not change without asking)
- Frontend: React + Vite + TypeScript (strict) + Tailwind CSS v4 + React Router +
  TanStack Query. Built to static files.
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
```
src/
  app/          router, layouts, route guards
  features/
    auth/       login, sign-up, forgot and reset password, waiting-for-approval
    customer/   book, schedule, my-classes, account
    coach/      schedule, students, add-students, settings
  components/   shared UI (Button, Field, Segmented, TimeChip, Tag, Table, ProgressBar, Dialog)
  lib/          supabase client, MYT time helpers, formatting, reason messages, database.types.ts
supabase/
  migrations/   SQL migrations. One change per file. Never edit a migration that has been applied.
  functions/    Edge Functions: login, admin-accounts, mail-queue
  seed.sql      sample data matching the design (week of Mon 28 Sep 2026)
tests/
  db/           database tests (pg + transaction rollback)
  unit/         pure TypeScript tests
apps-script/    Code.gs for the Gmail mailer (pasted into Google Apps Script by hand)
design/         approved screen references (HTML). Reference only, never import.
docs/  prompts/
```

## Commands
- `npm run dev`: Vite dev server
- `npm run build`: type-check and build to `dist/`
- `npm run test`: Vitest (unit and database tests)
- `npm run lint` / `npm run typecheck`
- `npm run db:types`: regenerate `src/lib/database.types.ts`
- `npx supabase db reset` (local) or `npx supabase db push` (linked project)
- `npx supabase functions deploy <name>`
- `npx wrangler deploy`: publish `dist/` to Cloudflare

Keep this list current when you add scripts.

## How to work
- Start each session with `docs/HANDOFF.md` and the prompt you are on.
- Make small commits with clear messages. Run typecheck, lint and tests before
  saying a step is done.
- If the docs are unclear or disagree with the code, stop and ask. Do not guess.
- Database functions: `security definer`, `set search_path = ''`, fully qualified
  names, explicit permission checks at the top, and `revoke execute ... from public`
  on anything that is not meant for every user.
- End each session by updating `docs/HANDOFF.md`: bump the version, record what is
  done, what is next, decisions made and open issues.

## UI rules
- Match `design/` and the tokens in `docs/DESIGN.md`. Minimal look: white background,
  Figtree, one accent (#0B5E7A), orange (#9A3412) only for things that need attention.
- Customer screens are mobile-first (390 px wide). Coach screens are desktop-first
  (1280 px and up) but must still work on a tablet.
- Real buttons, links and labels. 44 px minimum touch targets. Visible focus.
  Sentence case. Buttons say what they do ("Book 7:30 pm for Aiman & Sofia",
  "Save payment"). Error messages say what happened and what to do next.
