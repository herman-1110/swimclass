# Prompt 01: Project setup

## CONTEXT
New repository for Swim Class Booking. Only the planning pack exists (CLAUDE.md,
docs/, prompts/, design/). Read CLAUDE.md, TECH_SPEC §1, §2, §11, §12 (Cloudflare part)
and DESIGN §2 (tokens) before starting. No features in this step: just a clean,
working skeleton that later prompts build on.

## DIAGNOSE
1. Report versions of Node (need 20+), npm and git. Report whether Docker is available
   (`docker info`). Local Supabase needs Docker; without it we use a second free
   Supabase project (`swimclass-dev`).
2. List the repo contents and confirm nothing besides the planning pack exists.
3. Check `npx supabase --version` and `npx wrangler --version` work.
4. If anything is missing, stop and tell Herman exactly what to install.

## TASK
1. Scaffold Vite + React + TypeScript in the repo root without deleting the pack.
   `tsconfig` strict mode on.
2. Add dependencies: react-router, @tanstack/react-query, @supabase/supabase-js,
   date-fns, @date-fns/tz, @fontsource/figtree, tailwindcss v4 (+ its Vite plugin).
   Dev: vitest, @testing-library/react, jsdom, pg + @types/pg, eslint, prettier.
3. Create the folder layout from ARCHITECTURE §2 and §3 (`src/app`, `src/pages`,
   `src/shared`, `supabase/`, `tests/db`, `apps-script/`); unit tests sit next to their code.
4. `src/app/styles/index.css`: all DESIGN §2 tokens as CSS variables, Tailwind `@theme` mapping,
   Figtree as the only font, focus ring style, `prefers-reduced-motion` handling.
5. Router with placeholder pages for every route in TECH_SPEC §11, a customer layout
   (bottom tab bar: Book, Schedule, My classes, Account) and a coach layout (sidebar:
   Schedule, Students & payments, Settings, View as customer); each is a bottom tab bar
   below 1024 px and a sidebar from 1024 px (DESIGN §3). Guards can be stubs.
6. `src/shared/api/supabase.ts` reading `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` (through `src/shared/config/env.ts`);
   `.env.example` with both; `.env*` (except example) in `.gitignore`.
7. `src/shared/lib/time/time.ts`: MYT helpers (`TZDate` in `Asia/Kuala_Lumpur`),
   formatters for "7:30 pm", "Sat 3 Oct", and ranges ("9:00–10:00 am",
   "11:00 am–12:00 pm"). Unit tests for them in `src/shared/lib/time/time.test.ts`.
8. `npx supabase init`. If Docker is available, `npx supabase start`. If not, write the
   steps Herman must do to create `swimclass-dev` (region Singapore) and link it.
9. npm scripts: dev, build, preview, test (unit), test:db (database), lint, typecheck,
   db:types.
10. `wrangler.jsonc` exactly as TECH_SPEC §12. Don't deploy.
11. Update CLAUDE.md "Commands" if anything differs, and write HANDOFF v0.1.

## VALIDATION
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test` all pass.
- `npm run dev` shows every placeholder route; tab bar and sidebar links work;
  Figtree is loaded; focus ring visible when tabbing.
- Time helper tests cover: 19:30 → "7:30 pm"; a range crossing noon; a UTC instant
  that is a different calendar day in MYT.
- No secrets committed (`git grep -E "sb_secret_[A-Za-z0-9_-]{8,}"` finds nothing; the docs
  mention the `sb_secret_...` prefix only to warn about it).
- HANDOFF.md updated, including the manual steps Herman still has to do.
