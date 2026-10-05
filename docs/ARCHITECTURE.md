# Swim Class Booking: Architecture

Version 1.0 · 29 Sep 2026 · Where every file goes and the rules that keep the code tidy.
Claude Code checks this before creating a file. If something needs a folder that isn't
planned here, update this document in the same commit.

## 1. The idea

Clean architecture here means three things:

1. **The business rules live in one place: the database.** Booking, the travel gap,
   lesson counting, payments and permissions are Postgres functions, constraints and
   RLS policies. Nothing else re-implements them.
2. **Every part has one job,** and every kind of file has one obvious home.
3. **Dependencies point inward.** The website calls the database; the database never
   knows the website exists. Inside the website, higher layers use lower layers, never
   the other way round.

| Ring | What it holds | Where |
|---|---|---|
| Core: the business rules | tables and constraints, views, functions (RPC), RLS | `supabase/migrations/` |
| Adapters: talk to the core | Edge Functions; the website's data layer | `supabase/functions/`, `src/shared/api/`, the `api/` folders in `src/entities/` and `src/features/` |
| Delivery: what people touch | screens and components; the Gmail mailer | `src/`, `apps-script/` |

So every screen could be rebuilt without touching a rule, and a rule (the travel gap,
say) can change without touching a screen.

## 2. Repository layout

```
swimclass/
├── .github/workflows/   ci.yml (checks on every push) · backup.yml (weekly database backup)
├── apps-script/         Gmail mailer: Code.gs, README.md
├── design/              approved screens (reference only, never imported) · screens/ (PNGs)
├── docs/                PRD, TECH_SPEC, DESIGN, ARCHITECTURE, HANDOFF
├── prompts/             build steps 01–12
├── public/              served as-is: favicon, icons/, manifest.webmanifest, robots.txt
├── src/                 the website (§3)
├── supabase/            the backend (§4)
├── tests/db/            database tests (§6)
├── CLAUDE.md            Claude Code's brief
├── README.md            how to run, deploy and find things
└── config files only:   package.json, package-lock.json, .npmrc, tsconfig.json (with
                         tsconfig.app/.node/.test.json), vite.config.ts, eslint.config.js,
                         .prettierrc, .prettierignore, .editorconfig, .gitattributes, .nvmrc,
                         wrangler.jsonc, index.html, .env.example, .gitignore
```

Nothing else at the top level. Scratch files, exports and personal notes stay out of the repo.

## 3. The website (`src/`)

### 3.1 Five layers
The website uses Feature-Sliced Design, trimmed to five layers. Each layer may import
only from the layers to its right:

```
app  →  pages  →  features  →  entities  →  shared
```

| Layer | Its job | Example |
|---|---|---|
| `app/` | Starts the app: providers, router, route guards, layouts, global styles | `app/router/routes.tsx` |
| `pages/` | One folder per screen. Reads the URL, arranges entities and features. Pieces only that screen uses live in its own `ui/` folder | `pages/book/` |
| `features/` | Things a person *does*: a form or button plus the change it makes | `features/book-lesson/` |
| `entities/` | Business things: how to read them (query hooks) and show them (display components) | `entities/slot/` |
| `shared/` | Knows nothing about swimming: the Supabase client, generic UI, time helpers, config | `shared/ui/Button.tsx` |

Rules:
1. **Import downward only.** A feature may use entities and shared; an entity may use
   only shared; shared uses nothing above it.
2. **No sideways imports.** Slices in the same layer never import each other: a feature
   never imports another feature, an entity never imports another entity. Where two need
   to meet, the layer above combines them (usually the page).
3. **Use the front door.** Each slice (a folder in `pages/`, `features/` or `entities/`)
   has an `index.ts` listing what it offers. Other code imports `@/entities/slot`, never
   `@/entities/slot/ui/TimeChipGrid`. `app/` and `shared/` have no slices; import their
   files directly (`@/shared/ui/Button`, `@/shared/lib/time`).
4. **Inside a slice, use relative imports** (`./ui/TimeChipGrid`).
5. **Only `shared/api` touches Supabase.** It creates the one client; the `api/` folders
   of entities and features use it. Components never call Supabase directly.
6. **No business rules in the browser.** The browser shows what the database decided.
   It may preview (which times look free, how many weeks can repeat), but the database
   has the final say. Shared has one business-flavoured file on purpose:
   `shared/config/messages.ts` keeps all error wording in one place so it's easy to edit.

### 3.2 The full plan

```
src/
├── main.tsx                      starts the app
├── app/
│   ├── App.tsx                   providers + router
│   ├── providers/                QueryProvider.tsx · SessionProvider.tsx (a route's errors
│   │                             go to router/RouteError.tsx, its errorElement)
│   ├── router/                   routes.tsx (every route; the coach's pages lazy-loaded, §3.7)
│   │                             guards.tsx · safeFrom.ts · router.ts · RouteError.tsx ·
│   │                             RouteLoading.tsx · useRouteFocus.ts (a new page's h1 takes focus)
│   ├── layouts/                  RootLayout.tsx (every route: Outlet, scroll restoration, route
│   │                             focus, the demo tools) · AuthLayout.tsx (a card from 768 px) ·
│   │                             PendingLayout.tsx ·
│   │                             CustomerLayout.tsx · CoachLayout.tsx (bottom tab bar under
│   │                             1024 px, sidebar from 1024 px; DESIGN §5), built from
│   │                             TabBar.tsx · Sidebar.tsx · SkipLink.tsx · navigation.ts
│   │                             (NavItem, useIsCurrent) · useBusinessName.ts
│   ├── demo/                     demo mode's own tools (§3.6): the Demo button and its panel
│   │                             (sign in as anyone, sent emails, reset); demo builds only
│   └── styles/                   index.css (tokens, Tailwind theme, font, focus ring)
├── pages/                        one folder per route (§3.5)
│   ├── login/  signup/  forgot-password/  reset-password/  pending/
│   ├── book/  schedule/  my-classes/  account/
│   ├── coach-schedule/  coach-students/  coach-add-students/  coach-settings/
│   └── not-found/
├── features/
│   ├── add-booking/              coach: Add booking dialog → coach_book
│   ├── add-students/             coach: new group, new account if needed → create_group
│   ├── approve-account/          coach: approve a sign-up → approve_account
│   ├── book-lesson/              customer: summary, repeat weekly, Book → book_lesson
│   ├── cancel-lesson/            both: confirm dialog → cancel_booking
│   ├── change-password/          both
│   ├── edit-group/               coach: location, starting balances, active → update_group
│   ├── excuse-lesson/            coach → excuse_booking
│   ├── log-in/                   username + password → login Edge Function
│   ├── log-out/                  both
│   ├── post-announcement/        coach: message all customers → post_announcement
│   ├── record-payment/           coach: payment panel, free lesson → record_payment
│   ├── reset-password/           forgot and reset forms
│   ├── set-time-exception/       coach: Block time / Open extra time → add_exception
│   ├── sign-up/                  sign-up form with username check
│   ├── update-profile/           name and phone
│   └── update-settings/          coach: settings and weekly hours → update_settings, set_open_hours
├── entities/
│   ├── account/                  session, profile, role; accounts list (coach)
│   ├── announcement/             the pinned coach message · CoachBanner
│   ├── balance/                  packages: used, booked, left, paid · PackageSummary
│   ├── booking/                  lessons: upcoming, past, "lesson 2 of 4" · LessonRowLayout,
│   │                             PastLessonRow, HistoryLessonRow
│   ├── email-log/                what the mailer sent (coach)
│   ├── group/                    student groups: names, 1-to-1/2/3, location · GroupPicker
│   ├── open-hours/               weekly hours and one-off exceptions
│   ├── payment/                  payment history
│   ├── schedule/                 week views: customer (no names) and coach; the coach's day view (phones)
│   ├── settings/                 public settings; full settings (coach)
│   └── slot/                     start times for a week, and why a time isn't free · TimeChipGrid
└── shared/
    ├── api/                      supabase.ts (the only client) · queryClient.ts
    │                             rpc.ts (database and Edge Function calls, AppError)
    │                             auth.ts (signing in and out) · database.types.ts (generated)
    │                             backend.ts (Supabase or demo mode) · supabaseBackend.ts
    │                             demo/ (demo mode: the migrations and seed in PGlite, §3.6)
    ├── config/                   env.ts · routes.ts (every path) · messages.ts (error wording, DESIGN §6)
    │                             business.ts (the business name on signed-out pages)
    │                             demo.ts (demo mode's clock and sample password)
    ├── lib/                      time/ (Malaysia time) · format/ (RM, plurals) · hooks/ · cn.ts
    │                             motion/ (buttons lift under the mouse, with anime.js)
    └── ui/                       the kit (UI kit spec), one component per file:
                                  Button, ButtonLink, IconButton, BackLink (buttonClasses.ts);
                                  Field, FieldRow, FieldList, Fieldset, Legend, Select, Textarea,
                                  Checkbox, RadioGroup, OptionRow, Segmented, SegmentBar, Chip;
                                  Card, CardFooter, PageHeader, SectionTitle, SectionLabel,
                                  Figure, Tag, Pill, Banner, EmptyState, Skeleton, StickyBar;
                                  DayStrip, WeekNav, WeekGrid (weekGridLayout.ts), Table, Tabs;
                                  Dialog, SidePanel; icons/
```

Folders appear when their first file is written; don't create empty ones.

### 3.3 Inside a slice
Every entity and feature uses the same segments; create only the ones it needs:

```
entities/slot/
├── index.ts            the front door: what other layers may use
├── api/                reading data: query hooks and their keys (useWeekSlots.ts, keys.ts)
├── model/              types and pure logic (types.ts, splitByPartOfDay.ts and its test)
└── ui/                 display components (TimeChipGrid.tsx)
```

A feature looks the same, with its change (mutation) in `api/`:

```
features/book-lesson/
├── index.ts                      export { BookingSummary } from './ui/BookingSummary';
├── api/useBookLesson.ts          calls book_lesson, then refreshes slot, balance, booking and schedule data
├── model/repeatWeeks.ts          how many weeks the balance allows, and the checkbox label
├── model/repeatWeeks.test.ts
└── ui/BookingSummary.tsx         summary, repeat weekly, Book button, success panel
                                  (sticky footer on phones, side card from 768 px)
```

Pages are simpler: `index.ts`, the page component (`BookPage.tsx`), `ui/` for pieces
only that page uses, and `model/` for logic only that page has (Book's address parameters
and opening day), with its tests.

### 3.4 Example: how the Book screen fits together

```
pages/book/BookPage.tsx       reads ?group, ?day, ?length, ?time from the URL and lays out the screen
├── entities/announcement     CoachBanner
├── entities/settings         usePublicSettings (lengths, travel gap, window, cutoff) · DocumentTitle
├── entities/group            useMyGroups · GroupPicker ("Who's this lesson for?")
├── entities/balance          useAccountBalances · PackageSummary (bar and counts)
├── entities/slot             useWeekSlots · TimeChipGrid (free and crossed-out times)
├── entities/schedule         useOwnLessonsOnDay ("Already booked this day")
├── shared/ui                 DayStrip · Segmented (1 hour / 2 hours)
└── features/book-lesson      BookingSummary → book_lesson → refresh the data above
```

Each piece does one thing, and the page is the only place they meet.

### 3.5 Routes
The page folder is the route with `/` turned into `-`:

| Route | Page folder | Who |
|---|---|---|
| `/login`, `/signup`, `/forgot-password` | `login/`, `signup/`, `forgot-password/` | signed out (anyone signed in is sent on) |
| `/reset-password` | `reset-password/` | anyone |
| `/pending` | `pending/` | signed in, not approved yet |
| `/book`, `/schedule`, `/my-classes`, `/account` | `book/`, `schedule/`, `my-classes/`, `account/` | customers (the coach can look) |
| `/coach/schedule`, `/coach/students`, `/coach/add-students`, `/coach/settings` | `coach-schedule/`, `coach-students/`, `coach-add-students/`, `coach-settings/` | coach |
| anything else | `not-found/` | anyone |

Paths are written once, in `shared/config/routes.ts`; everything else uses those constants.

### 3.6 Data, state and errors
- **One door**: `shared/api/rpc.ts` is how the website reaches data: `rpc(fn, args)` for
  database functions, `readRows(source, { eq, order, … })` for tables and views RLS lets
  the account read, `updateRows` / `insertRows` / `deleteRows` where RLS allows a direct
  change, and `callEdge(name, body)` for Edge Functions. `shared/api/auth.ts` signs in
  and out. All are typed from `database.types.ts`.
- **Demo mode**: behind that door sits Supabase, or in demo mode the repo's own
  migrations and seed running in the browser with PGlite (`shared/api/demo/`), the
  clock stopped at the seed's `FIXTURE_NOW`. Every call runs as the signed-in account
  with RLS, and answers with the same JSON the Supabase API returns, so the screens use
  the real business rules without a server. On for `npm run dev` and the tests, off for
  production builds (which leave it out); `VITE_DEMO=true` or `false` in `.env.local`
  overrides. Demo mode is never a place for business rules of its own.
- **Reading data**: TanStack Query hooks in entity `api/` folders. Each entity exports
  its query keys (`slotKeys`, `balanceKeys` …) so a feature can refresh them.
- **Changing data**: mutation hooks in feature `api/` folders, each listing the entity
  keys it refreshes afterwards.
- **Screen state**: component state. Anything worth keeping on refresh or sharing as a
  link goes in the URL (the Book screen's group, day, length and time).
- **No global store** (no Redux or Zustand): server data sits in the query cache, the
  session in `SessionProvider`.
- **Errors**: `shared/api/rpc.ts` turns every failure into `AppError { code, detail }`;
  `shared/config/messages.ts` turns a code into words. Screens never show raw errors.
- **Time**: always through `shared/lib/time` (Malaysia time). Never the device's time
  zone for business dates.
- **Types**: `shared/api/database.types.ts` is generated by `npm run db:types` and never
  edited by hand. Entities export friendlier types built from it (`Slot`, `GroupBalance`).

### 3.7 Components
- One component per file, named after it. Named exports only.
- The sign-in and customer pages are in the main bundle, so a phone on 4G doesn't wait
  for a second download. The coach's pages are lazy-loaded with the function form of
  React Router's `lazy`:
  `lazy: async () => ({ Component: (await import('@/pages/coach-settings')).CoachSettingsPage })`.
  Never the object form (`lazy: { Component }`): React Router 8 swallows its failed
  download (an old file after a new release) and shows a blank page instead of the
  error screen.
- Props typed beside the component: `type ButtonProps = { … }`.
- Styling with Tailwind classes and the DESIGN §2 tokens. Inline `style` only for
  computed positions, such as blocks on the week grid.
- **Responsive**: write the phone layout first, then add the wider layouts with `md:`,
  `lg:` and `xl:` (DESIGN §5). Change layout with CSS, not JavaScript screen checks.
  Where a phone shows a different piece (the coach's day view instead of the week grid,
  cards instead of the students table), render both and hide one (`md:hidden`,
  `hidden md:block`); they read the same query, so nothing is fetched twice.
  `shared/lib/hooks/useMediaQuery.ts` is only for behaviour CSS can't change, such as
  whether `SidePanel` is a modal (below 1280 px) or a plain column.
- Aim for under about 150 lines per component and 120 per page; when one grows, split it
  into more files in the same `ui/` folder.

## 4. The backend (`supabase/`)

### 4.1 Folders

```
supabase/
├── config.toml                Supabase CLI settings
├── migrations/                every database change, in order (§4.3)
├── functions/                 Edge Functions (Deno)
│   ├── _shared/               http.ts (CORS for the site, JSON replies, refusals) ·
│   │                          clients.ts (secret-key, publishable-key and caller clients)
│   ├── admin-accounts/index.ts
│   ├── login/index.ts
│   └── mail-queue/index.ts
├── scripts/                   SQL run by hand: shift-seed.sql · make-coach.sql (prompt 05)
├── seed.sql                   sample data, dev project only
└── README.md                  database map (below)
```

The database map in `supabase/README.md` lists the migrations, tables, views, API
functions and internal functions, each with the migration that defines it now and one
line on what it's for.

### 4.2 One schema: grants decide what the API may call
Supabase's Data API exposes the `public` schema, and everything is in it: the tables,
the views and every function. What a caller may run is decided by grants
(`20260928100300_rls` removes the default rights, so a new function can't be called
until a migration grants it):

- **API functions** are granted to `authenticated` (`username_available` also to
  `anon`) and check the caller inside. That is the whole API, in the table below.
- **Internal functions** have no grant, so only other functions can run them: the
  availability engine (`open_windows`, `slot_check`), the email builders and
  `queue_email`, the booking steps (`place_bookings`, `lock_booking_dates`) and the
  trigger functions.
- **Helpers that RLS policies and the views run** with the caller's rights are granted
  to `authenticated`: `is_coach`, `is_approved`, `my_account_id`, `app_now`,
  `lessons_for`, `package_settings`. They only answer about the caller or read settings.
- `tests/db/rls.test.ts` lists every function `anon` and `authenticated` may run, so a
  grant that isn't in its list fails the tests. Add each new API function there.

Moving the internal functions into a `private` schema that the API never exposes is a
possible later step; for now the missing grants do that job.

| Called by | API functions |
|---|---|
| anyone, signed out | `username_available` |
| every signed-in account | `get_public_settings` |
| approved customers (their own groups) and the coach | `week_slots`, `week_busy`, `cancel_booking` |
| approved customers | `book_lesson` |
| the coach only (checked inside) | `coach_week`, `coach_slot_check`, `coach_book`, `excuse_booking`, `record_payment`, `add_free_lesson`, `create_group`, `update_group`, `set_group_active`, `approve_account`, `set_open_hours`, `add_exception`, `remove_exception`, `update_settings`, `post_announcement`, `remove_announcement`, `pending_accounts`; later `email_log` (prompt 11) |
| the service role (Edge Functions) | `check_login_attempt`, `record_login_success` (login); `claim_outbox`, `ack_outbox` (mail-queue, prompt 11) |

### 4.3 Migrations
- Every change is a new file in `supabase/migrations/`. Never edit a migration that has
  been applied; fix forward with a new one.
- The file name is `<timestamp>_<verb>_<topic>.sql`, and the timestamp must sort after
  every migration already applied. `npx supabase migration new <name>` uses the current
  UTC time, but the prompt 04 files have hand-picked times on 29 Sep 2026 (up to
  `20260929110200`), so a file made with it that day needs a later time by hand.
- Names say what changed: `add_…`, `update_…`, `fix_…`. One topic per file. (The files
  from prompts 02 to 04 are named after their topic only.)
- In the same commit, update `supabase/README.md` so the current definition of any
  function can be found without reading every migration.

The files so far:

| Migration | Prompt | Contents |
|---|---|---|
| `20260928100000_schema` | 02 | enums, tables, constraints, indexes, the settings row, weekly hours |
| `20260928100100_triggers` | 02 | profile on sign-up, group member checks, `settings.updated_at` |
| `20260928100200_views` | 02 | `app_now`, `lessons_for`, `package_settings`; `group_details`, `booking_ledger`, `group_balance` |
| `20260928100300_rls` | 02 | RLS, policies, grants; `is_coach`, `is_approved`, `my_account_id` |
| `20260928120000_availability` | 03 | `open_windows`, `slot_check`, `lesson_travel`; `week_slots`, `week_busy`, `coach_week` |
| `20260929100000_coach_slot_check` | 04 | `slot_check` with the coach's options; `coach_slot_check` |
| `20260929100100_emails` | 04 | time text, `email_text`, `email_html`, `account_email`, `queue_email`; the booked, cancelled, late alert and broadcast emails and who gets them |
| `20260929100200_booking` | 04 | `book_lesson`, `coach_book`, `cancel_booking`, `excuse_booking`, `record_payment`, `add_free_lesson` |
| `20260929100300_groups_accounts` | 04 | `create_group`, `update_group`, `set_group_active`, `approve_account`, `username_available` |
| `20260929100400_settings` | 04 | `get_public_settings`, open hours, exceptions, `update_settings`, announcements |
| `20260929110000_update_email_links` | 04 | confirmation links to `/my-classes` |
| `20260929110100_fix_email_link_pattern` | 04 | links in `email_html` may contain `-` |
| `20260929110200_fix_email_text` | 04 | `email_text` also breaks up `{{` inside `{{{` |
| `20261004100000_hardening` | audit | customer change limit, coach writes only through functions, table caps |
| `20261004120000_add_login_limiter` | 05 | `login_attempts.ip`, `check_login_attempt`, `record_login_success` |
| `20261005100000_pending_accounts` | 09 | `pending_accounts` |

Still to come: the mail queue: reminders, digest, `claim_outbox`, `ack_outbox`,
`email_log` (prompt 11).

### 4.4 SQL style
- snake_case everywhere; tables plural (`bookings`); functions start with a verb
  (`book_lesson`); parameters `p_…`; local variables `v_…`; constraints and indexes
  start with their table name (`bookings_no_overlap`, `bookings_starts_at_idx`).
- API functions are `security definer` with `set search_path = ''` and fully qualified
  names (`public.bookings`, `public.app_now()`).
- Inside a function, in this order: check the caller, validate the input, do the work,
  queue emails.
- Errors are codes, never sentences: `raise exception using errcode = 'P0001', message =
  'credit_exceeded', detail = <jsonb>::text` (the detail only when the message needs
  one). The wording lives in `src/shared/config/messages.ts`.
- Every function starts with a header comment, and its first line also goes into
  `comment on function` so the Supabase dashboard shows it. The functions from prompts
  02 to 04 have the header comment only; add `comment on function` to every function
  created or replaced from now on:

```sql
-- book_lesson: book one lesson, or the same time for several weeks, for a group.
-- Who: approved customers, for their own groups.
-- Rules: BR-8 to BR-14, BR-21.
-- Errors: not_approved, not_your_group, repeat_conflict, credit_exceeded, any slot_check reason.
create or replace function public.book_lesson(...)
```

### 4.5 Edge Functions
- One kebab-case folder per function with an `index.ts`. Shared code goes in `_shared/`
  (folders starting with `_` aren't deployed as functions).
- They are thin doorways: check who's calling, call Auth or one database function, reply.
  No business rules in them.

### 4.6 Environments
The Supabase CLI stays linked to the **dev** project for good. Production is only touched
in prompt 12, with the connection string or project id written into each command
(`--db-url`, `--project-ref`). Never run `db reset` against production, and never link
the CLI to it.

## 5. Other folders
- `apps-script/`: `Code.gs` (pasted into Google Apps Script by hand) and `README.md` with
  the setup steps. Same rule as Edge Functions: it only fetches, sends and acknowledges.
- `tests/db/`: one file per area (`admin`, `availability`, `balance`, `booking`,
  `changes`, `constraints`, `groups`, `rls`, `shift-seed`; `emails` comes in prompt 11),
  plus `helpers.ts` (connect, act as a user, pin the clock, roll back), `fixture.ts`
  (the clock and the fixed ids `seed.sql` uses, so tests don't repeat magic values) and
  `supabase-root-2021-ca.crt` (checks the database's TLS certificate).
- `design/`, `docs/`, `prompts/`: planning material. Code never imports from them.
- `public/`: only files served exactly as they are.
- `.github/workflows/`: `ci.yml` and `backup.yml`.

## 6. Tests
- **Unit tests sit next to the code**: `formatTime.ts` and `formatTime.test.ts` in the
  same folder; component tests likewise (`TimeChipGrid.test.tsx`).
- **Database tests** live in `tests/db/` and run against the dev project inside a
  transaction that is rolled back, so they leave nothing behind.
- Two Vitest projects: `unit` (`src/**`, jsdom), run by `npm run test`; and `db`
  (`tests/db/**`, Node), run by `npm run test:db`, which needs `DATABASE_URL`. The `db`
  files run one at a time, since they share the dev database, with 30 s per test.
- Unit tests run in demo mode, so page and component tests call the real database
  functions (PGlite, §3.6) signed in as seeded accounts, with no network and no mocks of
  the data layer.
- Test names read as sentences: `it('refuses a second unpaid package')`.

## 7. Naming

| Thing | Style | Example |
|---|---|---|
| Folders | kebab-case | `my-classes/`, `book-lesson/` |
| Components | PascalCase, one per file | `TimeChipGrid.tsx` |
| Pages | `<Name>Page` | `BookPage.tsx`, `CoachSchedulePage.tsx` |
| Hooks | `use` + camelCase | `useWeekSlots.ts` |
| Other TypeScript files | camelCase | `formatTime.ts`, `repeatWeeks.ts` |
| Tests | same name + `.test` | `repeatWeeks.test.ts` |
| Types | PascalCase, no `I` prefix | `Slot`, `GroupBalance` |
| Constants | UPPER_SNAKE, only for fixed values | `MYT_TIME_ZONE` |
| Query keys | `<entity>Keys` | `slotKeys.week(…)` |
| Database | snake_case; tables plural; functions verb first | `bookings`, `book_lesson` |
| Migrations | `<timestamp>_<verb>_<topic>.sql` | `…_add_booking.sql` |
| Edge Functions | kebab-case folder | `mail-queue/` |
| Environment variables | UPPER_SNAKE; `VITE_` only if the browser may see it | `VITE_SUPABASE_URL` |
| Commits | `type(scope): summary` | `feat(book): repeat weekly` · `fix(db): gap before 2-hour lessons` |

Use the PRD's words everywhere (group, package, lesson, travel gap, open hours) so the
code, the database and the screens say the same thing. One exception: the database says
`booking` where the screens say "lesson".

## 8. How the rules are enforced
- **ESLint** (flat config) fails when:
  - a layer imports from a layer above it, or a slice imports another slice in its layer;
  - code imports a slice's inner files instead of its `index.ts`;
  - anything outside `src/shared/api/` imports `@supabase/supabase-js`, and anything
    outside `src/shared/api/demo/` imports `@electric-sql/pglite`;
  - imports aren't sorted.

  ESLint's built-in `no-restricted-imports`, with one config block per layer folder, is
  enough. A later block replaces an earlier block's options for the same files, so each
  layer gets one combined rule. Never switch these rules off; move the code instead.
- **TypeScript strict**, and one path alias: `@/` means `src/`.
- **CI** (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests and the build on
  every push, so a broken rule shows up on GitHub straight away.
- **Before a prompt is done**: new files are where this document says, lint passes, and
  `supabase/README.md` is up to date.

## 9. Where does it go?

| I'm adding… | It goes in |
|---|---|
| a new screen | `src/pages/<route>/`, plus its path in `shared/config/routes.ts` and its route in `app/router/routes.tsx` |
| a button or form that changes data | `src/features/<verb-noun>/` |
| a way to read or show a business thing | `src/entities/<thing>/` |
| a generic piece of UI with no business words | `src/shared/ui/` |
| a piece only one screen uses | that page's `ui/` folder |
| a business rule or permission | the database: a new migration, never the website |
| a date or time helper | `src/shared/lib/time/` |
| error wording | `src/shared/config/messages.ts` |
| a server step that needs a secret | `supabase/functions/<name>/` |
| a database test | `tests/db/<area>.test.ts` |
| a unit test | next to the file, `<file>.test.ts` |
| SQL someone runs once by hand | `supabase/scripts/` |
| a decision or change of plan | `docs/HANDOFF.md`, and the doc it changes |
