# Swim Class Booking: Claude Code pack

Everything Claude Code needs to build the booking site, in build order.

## What's inside
| Path | What it is |
|---|---|
| `CLAUDE.md` | Project brief Claude Code loads at the start of every session |
| `docs/PRD.md` | What we're building and every business rule (BR-1 … BR-37) |
| `docs/TECH_SPEC.md` | Architecture, database, security, emails, tests, deployment |
| `docs/DESIGN.md` | Design tokens, components, every screen at every width, wording |
| `docs/ARCHITECTURE.md` | Where every file goes and which part may use which (ESLint checks it) |
| `docs/DEV_SETUP.md` | Setting up the dev environment (the `swimclass-dev` project, no Docker) |
| `docs/HANDOFF.md` | Session-to-session notes (Claude Code updates it) |
| `prompts/01…12` | One build phase each, in CONTEXT → DIAGNOSE → TASK → VALIDATION |
| `design/` | The approved screens as reference HTML, phone and computer (+ `screens/` for your screenshots) |
| `supabase/README.md` | Database map: where each table, view and function is defined now |

## How to start
1. Create an empty GitHub repo (private) and clone it.
2. Copy everything from this pack into the repo root and commit.
3. Optional but useful: open the design canvas and save a screenshot of each screen into
   `design/screens/` with the same names (`Main.png`, `AdminSchedule.png`, …).
4. Open Claude Code in the repo and say:
   "Read CLAUDE.md, then run prompts/01-project-setup.md."
5. After each prompt: review the changes, run the app, commit, then start the next
   prompt in a fresh session. Claude Code keeps `docs/HANDOFF.md` up to date.

## Things you set up yourself (all free)
| When | What |
|---|---|
| Before prompt 01 | Node 24.15+ (24 LTS recommended; 22.22.2+ or 26+ also work, 25 doesn't), Git, and ideally Docker Desktop (for local Supabase) |
| Before prompt 02 | Supabase account; if no Docker, a project `swimclass-dev` in Singapore |
| Before prompt 11 | Google 2-Step Verification on, then an App Password for Gmail |
| Prompt 12 | Supabase project `swimclass` (prod), Cloudflare account, Apps Script project, GitHub secret for backups |
| Any time | Your package prices and payment instructions (bank / DuitNow) for Settings |
| Optional | A domain such as swimclass.online (the site works without one) |

## Everyday commands
`npm run dev` (the site on http://localhost:5173), `npm run test` (unit tests),
`npm run test:db` (database tests on `swimclass-dev`), `npm run lint`,
`npm run typecheck`, `npm run build`. The full list is in `CLAUDE.md`. GitHub runs lint,
typecheck, unit tests and the build on every push (`.github/workflows/ci.yml`).

## Build order at a glance
01 Setup → 02 Database → 03 Availability engine → 04 Booking & payments →
05 Login & accounts → 06 Book screen → 07 Schedule & My classes → 08 Coach schedule →
09 Students & payments → 10 Settings → 11 Emails → 12 Deploy & go-live

The database work (02–04) comes first on purpose: the travel-gap rule and lesson
counting are the heart of the system, and they're fully tested before any screen uses them.
