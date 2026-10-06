# Swim Class Booking

A booking website for one swimming coach and his customers in Malaysia, live at
**https://swimclass.online**. Customers book lessons for the student groups the coach has set
up, see the coach's timetable (other people's lessons only as "Booked"), and follow their
packages. The coach runs the schedule, students, packages, payments and settings. Everything
runs on free tiers.

## How it works
- **Website**: React, Vite and TypeScript, built to static files and served by Cloudflare
  (Workers static assets). It works on phones (customers) and computers (the coach), and can
  be added to a phone's home screen.
- **Backend**: Supabase in Singapore: Postgres with Row Level Security, Auth, and three Edge
  Functions (`login`, `admin-accounts`, `mail-queue`). Every business rule (the travel gap,
  booking windows, lesson counts, payments, permissions) is enforced in the database; the
  browser only displays and asks.
- **Email**: sent from the coach's Gmail by a Google Apps Script that polls `mail-queue` every
  5 minutes. Auth's emails (confirm, invite, reset) go through Gmail SMTP.
- **Backups**: a weekly GitHub Actions job dumps the database and keeps it encrypted for 90 days.

## Run it on your computer
Node 24 (22.22.2+ or 26+ also work). Then:
```sh
npm ci
npm run dev
```
http://localhost:5173 runs in **demo mode**: the real migrations and sample data run inside the
browser, so nothing touches Supabase. Sign in as any sample account (`meiling`, `herman`, …)
with the password `swim-test-2026`. The Demo button opens a panel to switch accounts or reset
the data.

Checks: `npm run lint`, `npm run typecheck`, `npm run test` (unit tests, demo mode),
`npm run test:db` (database tests on the `swimclass-dev` project; `docs/DEV_SETUP.md` §4) and
`npm run build`. GitHub runs lint, typecheck, unit tests and the build on every push. The full
list of commands is in `CLAUDE.md`.

## Docs
| File | What it covers |
|---|---|
| `docs/PRD.md` | What the site does and every business rule (BR-1 … BR-37) |
| `docs/TECH_SPEC.md` | Data model, database functions, security, emails, deployment, limits |
| `docs/DESIGN.md` | Look, components, every screen at every width, wording |
| `docs/ARCHITECTURE.md` | Where every file goes and which part may use which (ESLint checks it) |
| `docs/DEV_SETUP.md` | The development setup (`swimclass-dev`, no Docker) |
| `docs/PRODUCTION.md` | The live site: setting it up, deploying a change, backups, keys, limits |
| `docs/HANDOFF.md` | Session-by-session log of what was built and decided |
| `supabase/README.md` | Database map: where each table, view and function is defined |
| `apps-script/README.md` | Setting up the Gmail mailer |
| `design/` | The approved screens (HTML drawings and `screens/` PNGs), reference only |

## Folders
```
src/            the website: app/, pages/, features/, entities/, shared/ (docs/ARCHITECTURE.md)
public/         served as-is: favicon, icons, web manifest, robots.txt
supabase/       migrations, Edge Functions, Auth email templates, dev seed, scripts
tests/db/       database tests (run against swimclass-dev, rolled back)
apps-script/    the Gmail mailer (pasted into Google Apps Script)
.github/        CI on every push; the weekly backup
docs/ design/   documentation and the approved drawings
prompts/        the twelve build steps the site was made with
```

## Deploying a change
`docs/PRODUCTION.md` §3: test it locally, push, then `npm run build` and `npx wrangler deploy`
(and, for database or function changes, the Supabase commands listed there).

## Built with Claude Code
`CLAUDE.md` is the brief Claude Code reads first; `docs/HANDOFF.md` says where the last session
stopped.
