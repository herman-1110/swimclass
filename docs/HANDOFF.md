# Handoff

Update this file at the end of every Claude Code session. Newest entry on top.
Keep entries short; link to files instead of pasting code.

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
