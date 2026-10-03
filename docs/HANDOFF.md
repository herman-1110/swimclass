# Handoff

Update this file at the end of every Claude Code session. Newest entry on top.
Keep entries short; link to files instead of pasting code.

## v0.12 · 4 Oct 2026 · Merged and pushed; security audit
**State**: `main` = `frontend-first` = `origin/main` at 6d4abdb. Herman ran the push himself
(Claude Code's safety check blocks pushing from the session). GitHub CI passed on 6d4abdb.
This entry is not pushed.
**Done**
- Herman's pasted security checklist: a read-only audit of the database and of secrets,
  frontend, config and git history. No secret key, token or password has ever been
  committed, and none is in the production bundle; `npm audit` is clean. The findings are
  in `frontend-plan/review/security/audit-2026-10-04.md`, kept outside the repo because the
  repo is public and they aren't fixed yet.
**Next**
1. Herman decides the audit's open questions, then fix in batches: repo-only (headers, build
   guard, CI, maxLength, prompt and spec fixes), one migration (caps, grants, change limit),
   and the login limiter with the wiring (prompt 05).
2. Then v0.8 Next 2 and 3: remove the worktrees and branches (all 20 `fe/*` branches are in
   `main` and the seven worktrees are clean), and the wiring.
**Manual steps waiting on Herman**
- As in v0.11.

## v0.11 · 3 Oct 2026 · Triage 7–17, the copy list and Q4, decided for Herman
**State**: `frontend-first` (not pushed; 129 commits ahead of `origin/main`, with this
entry). At 7402d81: typecheck, lint, format, 1,822 unit tests (243 files) and the build pass.
The main chunk is 112.1 kB gzipped. `test:db` wasn't run (nothing under `supabase/`
changed). Herman's `npm run dev` runs on this checkout. Node 24.19 is now the system Node
(`D:\DOWNLOAD\node.exe`).
**Done** (Herman: "for the rest … help me think and reason it then do it". Each choice
and its reason is below; "triage" is `frontend-plan/review/final/triage.json`
`owner_questions`, numbered in order.)
- 7, 8d41480: Log in and Sign up say "Your coach may need to approve your account before
  you can book.", and the sign-up result "Check your email to confirm, then log in. Your
  coach may need to approve your account first." Signed-out pages can't read
  `require_approval`; neutral words cost nothing, while exposing the setting needs a
  database change. `/pending` is unchanged (it only shows when approval applies).
- 8, the copy list: approved as built, apart from the changes in this entry. 9e3f0ce adds
  the messages to DESIGN §6. edd45b9: excusing says "Lesson excused. It no longer counts."
  from both places (§0 item 5). 4ae7e56: the Forgot page's heading is "Forgot your username
  or password?", like the link that opens it, which reverses the build's choice (copy-8;
  conventions §12.3 in the plan updated). §0 items 6 and 7 were already fixed in the final
  review. Reset password's "Continue" stays: where it goes depends on the account.
- 9, e506b02: one wording per rule. Add students uses Sign up's "small letters" (plainer)
  and "Enter an email address like name@example.com.". Settings' own checks say what to
  type under the box ("Enter the amount in RM, like 240 or 240.50.", "Enter a whole
  number.", "Enter a time like 8:00 pm."), and near Save with the box's label first
  ("Booking window: enter a whole number."). The database's `invalid_setting` keeps
  DESIGN §6's words.
- 10, 9d9a0c7: customers' one-month weeks read "21–27 Sep", the coach's pattern without the
  year. Weeks across months stay "28 Sep – 4 Oct".
- 11, 40a24a0: through View as customer, Book and My classes tell the coach "Customers see
  their lessons here. Your coach account has no lessons of its own.", and Account leaves out
  "message your coach". "Message your coach" made no sense to him.
- 12, d8024a9: My classes' panel heading is "Past and cancelled lessons" (it lists lessons
  cancelled before they happened). The drawn button "Past lessons and receipts" stays.
- 13, 89c02e7: a full-screen dialog's sticky buttons have `max(16px, safe area)` under them
  on phones, as the tab bar and the coach-schedule spec do (was 32 px).
- 14, 22068df: every coach page has 32 px sides from 768 px, so the title stays put between
  tabs. Schedule and Students need the room; Add students and Settings are narrow anyway.
  DESIGN §2 says so.
- 15, 494e4b3: the chosen segment has an `--accent` border and the current sidebar link a
  3 px `--accent` bar on its left; the drawn markers were about 1.1:1 (DESIGN §3).
- 16, 444f1da: kept as built. At 360 px, seven 44 px day links would leave the time column
  12 px. DESIGN §5 records the exception (41 × 44 px, above WCAG AA's 24 px).
- 17, dba3347: PRD §8's budget is Chrome's "Fast 4G" with a 4× slower CPU (a mid-range
  phone on normal Malaysian 4G), largest paint under 3 s with an empty cache. Measured on a
  production build with `frontend-plan/tools/perf.mjs` (median of 5): Log in 0.99 s; on
  "Slow 4G" 2.85 s. No more bundle cuts are needed now.
- Q4: with no price set, "Pay RM [price]" reads "Pay for it" (as built; DESIGN §6).
- v0.8's fixers' word questions are settled: `email_taken` as built, "Unpaid" (v0.10), the
  Book summary's notes as built, and one read-error banner (fixed in the final review).
- Checked in Chrome on the demo database (`frontend-plan/review/answers-7-17/check.mjs`, shots
  beside it): the approval note, the Forgot heading and tab title, "21–27 Sep" on Book and
  Schedule, the accent border on "1 hour", "Past and cancelled lessons", 16 px under the
  cancel dialog's buttons at 390 px, the 3 px bar on the current sidebar link, the coach's
  empty state and Account, the h1 at x 252 on all four coach pages at 1280 px, and
  Settings' "Booking window: enter a whole number." with "Enter a whole number." under the
  box. No page errors.
**Next**
1. Herman says whether to merge `frontend-first` into `main` and push.
2. Then v0.8 Next 2 and 3: remove the worktrees and branches, and do the wiring (prompts
   05–11). Measure the signed-in pages' first load once they talk to Supabase (PRD §8).
**Decisions**
- All of the above were Herman's to make; he delegated them, so they can be revisited by
  number.
**Open issues**
- The v0.7/v0.8 leftovers not asked here still stand: Block time over a long range
  (coach-schedule Q8), and v0.8's optional small leftovers.
**Manual steps waiting on Herman**
- Node 24: done. Still open: delete `D:\d`; set Auth's minimum password length to 8 in the
  Supabase dashboard; the OK to merge into `main` and push; v0.6's Supabase CLI link, `db
  reset --linked` and `test:db`, Cloudflare, package prices, Google 2-Step Verification
  and the CA certificate check.

## v0.10 · 3 Oct 2026 · Owner answers to triage questions 1–6
**State**: `frontend-first` (not pushed; 113 commits ahead of `origin/main`, with this
entry). At eae90e1: typecheck, lint, format, 1,817 unit tests (243 files) and the build
pass. The main chunk is 112.0 kB gzipped (+0.1). `test:db` wasn't run (nothing under
`supabase/` changed). Herman's `npm run dev` runs on this checkout.
**Done** (Herman's answers; "triage" is `frontend-plan/review/final/triage.json`
`owner_questions`)
- Add students, the v0.9 question: keep today's email invite (BR-3). Nothing to build, and
  the v0.9 open issue is closed.
- Triage 1 and 2, in 2ef1e9e and 23b1ce1: Unpaid is the group's status (PRD BR-22, DESIGN
  §3, §4).
  - `entities/balance` `owesPayment`: the view's unpaid, or an active group whose current
    package no payment covers yet (a new group that hasn't paid, or a package used up with
    nothing booked). A paused group that used up what it paid owes nothing.
  - Students & payments (pill, tabs, figures, Record payment), Needs attention and My
    classes' pill all use it.
  - Book's card says Paid or Unpaid for the package it names. In Sofia's case Package 2
    stays Paid and the note asks for Package 3.
  - Lessons carry no Unpaid anywhere: the day view's flag, the grid's spoken "unpaid", the
    lesson details' pill, and Today's drawn "Unpaid, collect today" and "first lesson of
    Package 6" are gone.
- Triage 3, d07d288: Book says why a blocked day has no times, from week_busy's `closed`
  (no new request). A fully blocked day reads "Your coach isn’t available on this day. Try
  another day." in place of fully booked; part of a day reads "Your coach isn’t available
  7:00 am–12:00 pm." (DESIGN §6).
- Triage 4, eae90e1: Schedule keeps "Tap a day to book it". Needs attention lists each
  approved customer with no group ("No group yet · can’t book") with "Add students", which
  opens on that account. Booking without a group is impossible in the database, so this
  comes before any attempt. An email when they try would need a database function and the
  outbox (wiring).
- Triage 5, f913826: the phone day view shows placeholders while the next week loads. The
  grid keeps the last week, dimmed (coach-schedule §6.1 changed for phones).
- Triage 6, e57a36e (Herman left it to us): from 1280 px the payment column opens on a group
  just added, so only that row is highlighted.
- Checked in Chrome on the demo database: the blocked days on Book at 390 and 1280; a new
  sign-up, once approved, appears in Needs attention, and "Add students" opens on it. Shots
  are in `frontend-plan/review/answers-1-6/`.
**Next**
1. Herman answers triage 7–17 and the copy list (`review/final/copy/proposed-copy.md`), then
   says whether to merge `frontend-first` into `main` and push.
2. Then v0.8 Next 2 and 3: clean up the worktrees and branches, and do the wiring
   (prompts 05–11).
**Decisions**
- Unpaid lives on groups only. `coach_week` still returns each lesson's `unpaid`, but the
  UI no longer reads it. The coach digest email (BR-33) lists unpaid groups, which fits.
**Open issues**
- Triage 7–17, the copy list and the fixers' word questions (v0.8) are still open. The word
  for a package that isn't paid is now "Unpaid".
- Q4 ("Pay RM [price]") is still open.
**Manual steps waiting on Herman**
- As in v0.9.

## v0.9 · 2 Oct 2026 · Owner answers; anime.js and button hover motion
**State**: `frontend-first` (not pushed; 106 commits ahead of `origin/main`, with this
entry). At dbf225f: typecheck, lint, format and the build pass. The full unit run passed
(1,807 tests, 241 files) just before the last change, which only touches
`shared/lib/motion`; its tests and Button's then passed again (26). `test:db` wasn't run
(nothing under `supabase/` changed). Herman's `npm run dev` runs on this checkout.
**Done**
- 91f58ae: Herman added anime.js 4.5.0 and the CLAUDE.md Animation section. The section
  is now its own heading, says anime.js ignores reduce motion, and the Stack list names it.
- Herman answered the seven owner questions from v0.6:
  1. Business name: "Swim Class" (already the settings default and code). DESIGN §3 says
     the drawings' "Swim Class Booking" is the old name.
  2. Minimum password length 8 (already in messages.ts and the demo).
  3. Phone not required at sign-up (already optional). PRD BR-1 now says so.
  4. "Pay RM [price]" with no price set: still to be decided. The book spec's C10 wording
     stays.
  5. Add students starts as 1-to-1 with no account chosen (already built). His follow-on
     wish is not decided yet (Open issues).
  6. Log out ends the session on this device only: `supabaseBackend` now calls
     `signOut({ scope: 'local' })`, as the demo does (auth C33).
  7. "Coach view only me can see, my username, my password": kept as built. Only the
     coach account sees the coach pages, "Back to coach view" and the coach's Log out.
- dbf225f: hover is easy to see, and buttons move under the mouse (DESIGN §2, §3, §5).
  - CSS: primaries darken and glow (`--shadow-lift`, `--shadow-press` while held). Quiet
    and icon buttons get a hairline outline and a soft shadow (`--shadow-soft`). Links and
    text buttons underline. Tailwind's `hover:` needs a mouse, so taps leave nothing on.
  - Motion: `shared/lib/motion` (installed once by `App`) moves `data-motion` elements
    with anime.js. Primaries lift 2 px, quiet and icon buttons 1 px, and both press to 97%
    while held. Mouse only. Nothing moves under reduce motion, or on a disabled,
    aria-disabled or busy button.
  - Checked in Chrome on the coach pages: the lift and press happen, no inline style is
    left afterwards, and under reduce motion the colour and shadow change but nothing
    moves. Shots are in `frontend-plan/review/hover/`.
  - Bundle: anime.js loads on the first mouse hover, never preloaded, as a 12.8 kB gzipped
    chunk (`motion/anime.ts` names the three functions; `import('animejs')` was 40 kB).
    The main chunk is unchanged at 111.9 kB.
**Next**
1. Herman answers the Add students question below, the 17 questions in
   `frontend-plan/review/final/triage.json` and the copy list, then says whether to merge
   `frontend-first` into `main` and push.
2. Then v0.8 Next 2 and 3: clean up the worktrees and branches, and do the wiring
   (prompts 05–11).
**Decisions**
- Hover motion only on the button-shaped looks (primary, quiet, IconButton). Chips, option
  rows, tabs and segmented controls keep their hover as before.
- anime.js is always loaded lazily, through a file of named re-exports (CLAUDE.md
  Animation).
**Open issues**
- Add students (Q5): Herman wrote "after they create their account with the same
  username I created it will automatically bind them to it". Today (BR-3) the coach types
  the customer's email and Supabase emails them a link to set a password. The account is
  approved and already holds the students; there is no second sign-up, and signing up with
  that username says "That username is taken". Claiming a username by signing up would let
  anyone who guesses it take the account and see the students. Before prompt 05 builds
  `admin-accounts`: keep the email invite, or claim by username plus a check (the same
  email the coach typed, or the coach approves the claim)?
- Q4 ("Pay RM [price]") is still open.
- v0.8's other open issues still apply.
**Manual steps waiting on Herman**
- v0.8's `npm ci` isn't needed: `node_modules` already has wrangler 4.146.0 and anime.js.
- The rest are as in v0.8: Node 24, delete `D:\d`, the Supabase minimum password length
  (8), the owner questions, and the OK to merge into `main` and push.

## v0.8 · 2 Oct 2026 · Frontend first: final review fixed and merged
**State**: `frontend-first` (not pushed; 102 commits ahead of `origin/main`) has all 56
final-review fixes. At 39dacb7, typecheck, lint, format, 1,794 unit tests (240 files) and
the build pass. `dist/` has no demo code (no demo clock, demo notes or PGlite).
`npm run test:db` wasn't run because nothing under `supabase/` changed since v0.6.
Herman's `npm run dev` runs on this checkout. See "Manual steps" for the `npm ci` it now
needs.
**Done**
- The final review's fix stage finished (`frontend-plan/final-review.js`, run
  wf_9d9bf734-7ac). 56 of 56 findings were fixed and none rejected: foundation 37,
  customer 10, coach 9. Each fix is listed in
  `frontend-plan/review/final/fix-<group>/outcomes.jsonl`.
- The three `fe/final-*` branches were merged on `fe/final-merge` (worktree
  `w3-coach-students`), then `frontend-first` was fast-forwarded. One conflict, in
  `BookPage.test.tsx`: it keeps customer's wait for every read and foundation's shared
  `holdDemoDatabase`.
- The merged app was checked on its own dev server. Scripts and shots are in
  `frontend-plan/review/final/merge/`.
  - 10 routes at 360, 390, 768, 1024 and 1280 px: no sideways scroll, and no word broken
    mid-word in buttons, links or headings.
  - Book with three 100-character one-word names: 0 px sideways at 390 and 1280. Each
    branch on its own had left part of this overflow.
  - "Try again" in the Excuse picker keeps focus while the read runs again, then focus
    moves to the help line.
  - My classes after a refused cancel: focus moves to the Upcoming heading.
  - The Book summary's new paid notes, and My classes after booking.
  - Failed reads on Book, My classes, Schedule and coach Students, at 390 and 1280: they
    all show the same "Something went wrong" banner with "Try again", sections already
    loaded stay, and nothing scrolls sideways.
- Highlights of the fixes:
  - Guards keep the page when a background profile read fails.
  - Focused controls stay clear of the tab bar and of dialogs' sticky buttons.
  - Book's "Paid" is judged from paid lessons (`entities/balance`
    `isNextLessonPaid`/`isPackagePaid`).
  - Long one-word names wrap everywhere.
  - Route focus moves to the new page's h1 (`useRouteFocus`), and `useFocusFallback`
    catches focus when its control disappears.
  - One `parseDateKey`; dead code and unused exports are gone.
  - `authError` maps `AuthSessionMissingError` to `not_signed_in` (auth C29, done).
  - Production builds drop the demo clock and demo notes. The Supabase backend chunk is
    preloaded, and app modules are marked side-effect free.
  - wrangler 4.146.0, so `npm audit` is clean.
- Bundle: the main chunk is 111 kB gzipped (was 99.7). The side-effects change moved code
  out of the shared Fieldset chunk into it. Static first-load JS is about 160 kB gzipped
  (was about 163), plus the 56 kB Supabase backend chunk, which now preloads in parallel
  instead of loading after. Coach pages are 8–15 kB each.
- Docs: ARCHITECTURE §3.2 matches `src` again (code-4).
**Next**
1. Herman answers the owner questions and approves the proposed copy (Open issues). Then
   merge `frontend-first` into `main`, push and check CI.
2. After that merge, remove the worktrees `D:\DOWNLOAD\Swimming\worktrees\w3-*` and the
   branches `fe/w3-*`, `fe/final-*` and `fe/final-merge` (`frontend-plan/README.md` has
   the commands).
3. The wiring (prompts 05–11), as in v0.7 Next 4. Signed-in production routes haven't been
   smoke-tested against Supabase yet.
**Decisions**
- Fixes that wanted a word Herman hasn't approved use the proposed copy, or no word. Book
  and Students show no pill for a package that isn't fully paid; the "New bookings start
  Package n" note still shows.
- The Demo button comes first in the Tab order (auth §7.1). It is `absolute`, so it scrolls
  away with the page.
**Open issues**
- Owner questions:
  - The 17 in `frontend-plan/review/final/triage.json` (`owner_questions`).
  - The copy list in `review/final/copy/proposed-copy.md`.
  - From the fixers:
    - The `email_taken` wording.
    - A word for a package that isn't fully paid.
    - The Book summary's "Package N isn't paid yet" and ", not paid yet".
    - The Banner style for read errors on customer screens (visual-10).
    - Which network the PRD's 3 s first-load budget assumes.
- Small leftovers, all optional:
  - Book's StartTimesSection builds `?week=` by hand (code-14).
  - The Lesson lengths and Package prices groups still repeat FieldRow's help text while
    a note shows (copy-6).
  - At large text, OpenHoursSection's Edit is reached by scrolling inside the table frame
    (accessibility-11).
  - A 12-lesson day still grows about 300 px when the coach's day view loads (states-10).
  - The QueryClient test wrapper isn't shared yet (code-2).
  - In demo mode only, the Demo button covers the end of a very long "Hi, …" line at
    390 px.
- wrangler 4.146.0 pulls in miniflare `5.20261001.0-alpha` (npm's choice).
- The merge commit 7f5a073 ("Merge final review: customer fixes") has git's
  `# Conflicts:` list after its Co-Authored-By line. It's cosmetic, but it can only be
  fixed before the push to `main`, by rebuilding 7f5a073 and 39dacb7 with the same trees.
  Herman decides whether that's worth a history rewrite.
- v0.7's open issues still apply, except the `AuthSessionMissingError` mapping, which is
  done.
**Manual steps waiting on Herman**
- wrangler changed in `package-lock.json`, so stop `npm run dev`, run `npm ci` with
  Node 24, then start `npm run dev` again. Until then, only `npx wrangler` uses the old
  version; the dev server and the app are unaffected.
- The rest are as in v0.7: Node 24, delete `D:\d`, the Supabase minimum password length,
  the owner questions, and the OK to merge into `main` and push.

## v0.7 · 2 Oct 2026 · Frontend first: every screen built in demo mode; final review half fixed
**State**: `frontend-first` (not pushed; about 60 commits ahead of `origin/main`) has every
route as a real page, built from the drawings and working in demo mode. At 29ca1a1:
typecheck, lint, format, 1,734 unit tests (234 files) and the build pass. The main chunk
is 99.7 kB gzipped and each coach page is its own chunk of 8–13 kB. `dist/` has no demo
code. `npm run test:db` wasn't run: no migration changed. The final whole-app review
stopped at the usage limit partway through its fixes (below). Herman's `npm run dev`
runs on this checkout.
**Done**
- The build ran from `D:\DOWNLOAD\Swimming\frontend-plan\`. Its README has the details and
  each script. The tools moved out of the temporary folder: the portable Node 24 is in
  `frontend-plan\node24`, and `tools/app.mjs` drives the running app from a script.
- Each wave: builders in worktrees, then 2–3 read-only reviewers per branch, then a
  fixer.
  - Wave 1: the UI kit (`src/shared/ui`), `messages.ts`, `shared/lib/format`, and the app
    shell with the Demo panel, the new guards and `features/log-out`. 31 findings,
    30 fixed.
  - Wave 2: every entity, plus `cancel-lesson`, `excuse-lesson` and `approve-account`.
    14 findings, all fixed.
  - Wave 3: every screen and its features. 81 findings, all fixed.
- e375c77 keeps one copy of the shared helpers (`addDays`, `weekDays`, `formatDayMonth`,
  `useDebouncedValue`; `accountLabel` in entities/group). 29ca1a1 removes
  `PlaceholderPage`.
- Docs changed by the builders: ARCHITECTURE §3.2–§3.5; DESIGN §2 (the `--seg-free-table`
  token). The demo's minimum password length is now 8, as in messages.ts.
- Final review (`frontend-plan/final-review.js`):
  - Seven reviewers, one per dimension (customer journeys, coach journeys, visual,
    accessibility, code, states, copy), all finished with 78 findings
    (`frontend-plan/review/final/<dimension>/`).
  - Triage kept 56 (`review/final/triage.json`): foundation 37 (5 high), customer 10 and
    coach 9. The highs include the known guard and tab-bar problems, and Book showing a
    never-paid new group as "Paid".
  - Fix branches, not merged yet:
    - `fe/final-customer` (worktree `w3-book`): 10/10 outcomes recorded, final checks not
      confirmed.
    - `fe/final-coach` (worktree `w3-customer`): 9/9 outcomes recorded, final checks not
      confirmed.
    - `fe/final-foundation` (worktree `w3-auth`): 9/37 outcomes recorded, 22 files of
      uncommitted work in progress.
  - Each fixer logs `review/final/fix-<group>/outcomes.jsonl`.
**Next** (a new session picks up the final review here):
1. Re-run `frontend-plan/final-review.js` with args
   `{ "finders": [], "triage": false, "fix": ["foundation", "customer", "coach"] }`. Each
   fixer skips the findings already in its outcomes.jsonl and carries on with its branch,
   including foundation's uncommitted changes. Customer and coach only need their final
   checks.
2. Merge `fe/final-*` on a scratch branch in a worktree first (Herman's dev server runs on
   this checkout). Run every check, then fast-forward `frontend-first`.
3. Herman answers the owner questions and approves the proposed copy. Then merge into
   `main`, push and check CI.
4. The wiring (prompts 05–11): auth and the Edge Functions (`login`, `admin-accounts` with
   `create_account` and `delete_account`), `pending_accounts()`, `email_log()`. Then
   `VITE_DEMO=false` against `swimclass-dev`.
**Decisions**
- Each spec's open questions got its recommended default (spec §10; the builders' reports
  in `frontend-plan/review/w3-*/builder-report.json`).
- Log out opens Log in first and ends the session there, so a page's leave guard can stop
  it. The coach has Log out in his sidebar and "Back to coach view" on customer pages.
  Not found sits inside AuthLayout.
- Entity types keep snake_case; one query per scope, with narrower hooks using `select`.
  `usePublicSettings` keeps data fresh for 5 min. History and payments read the latest
  200 rows (`hasMore`).
- The email log and Remove sign-up are switched off (`EMAIL_LOG_AVAILABLE`,
  `REMOVE_SIGN_UP_AVAILABLE`) until `email_log()` and `delete_account` exist. Add students'
  new account goes through `admin-accounts` `create_account`, which the demo emulates.
**Open issues**
- The 56 final-review findings that aren't fixed or merged yet (above).
- Owner questions: 17 in `review/final/triage.json` (`owner_questions`), and every
  proposed string, by screen, in `review/final/copy/proposed-copy.md`. The business name
  ("Swim Class" or "Swim Class Booking") is still open.
- The real `admin-accounts` must answer `{ account_id }` and the codes Add students places
  (`invalid_username`, `username_taken`, `invalid_display_name`, `invalid_phone`,
  `invalid_email`, `email_taken`, `not_coach`). `supabaseBackend` should map
  `AuthSessionMissingError` to `not_signed_in` (auth C29). Both are prompt 05.
- Block time over a long date range makes one `add_exception` call per day, outside a
  transaction (coach-schedule Q8): Herman to choose a cap, or a range function.
- Demo differences from v0.6 still apply (rows get the real `created_at`, so "signed up" and
  "posted" dates can read later than the demo clock).
**Manual steps waiting on Herman**
- Node 24:
  - Install it, then make it win: remove `D:\DOWNLOAD\` from the system PATH, or rename
    `D:\DOWNLOAD\node.exe`, which is v20.
  - Or use the portable copy: in PowerShell,
    `$env:Path = "D:\DOWNLOAD\Swimming\frontend-plan\node24\node-v24.21.0-win-x64;$env:Path"`,
    then `npm run dev`.
- Delete `D:\d`: 21 duplicate screenshots a reviewer saved to the wrong path. The tools
  can't remove top-level folders.
- Supabase dashboard: set Auth's minimum password length to 8.
- Answer the owner questions and the copy list, then say whether to push `frontend-first`
  to `main`.
- Still open from v0.6: `npx supabase login` and `link`; `db reset --linked` plus
  `test:db`; Cloudflare; package prices; Google 2-Step Verification; the CA certificate
  check.

## v0.6 · 30 Sep 2026 · Frontend first: demo mode, the data door, the session (paused)
**State**: Merged into `main` and pushed on 30 Sep: a fast-forward from `frontend-first`
(8 commits, with this entry), and GitHub CI passed. Herman asked
to build the whole frontend from the designs first and wire it up later. The groundwork is
in: demo mode, the data door, the session and guards, icons and base styles. Every page is
still a placeholder. The parallel build (waves 1–3) stopped at the usage limit before any
builder wrote a file; its worktrees are ready. v0.5's merge and push is done: `main`
matches GitHub and its first CI run passed.
**Done**
- This machine is a fresh clone. Its Node 20.14 (installed into `D:\DOWNLOAD`) is too old:
  `npm install` stops with EBADENGINE. The session used a portable Node 24.21.0, and
  `node_modules` is installed with it.
- `.env.local` checked without printing secrets: URL, publishable key and `DATABASE_URL`
  for `swimclass-dev` (project `uhrgtttvzqjrdtdzyzkr`). The Auth API accepts the key. A
  read-only connection saw 13/13 migrations, the seed fingerprint of `tests/db/helpers.ts`
  and no production marker.
- Demo mode (ARCHITECTURE §3.6): `src/shared/api/demo/` runs `supabase/migrations` and
  `seed.sql` in the browser with PGlite 0.5.8 (new devDependency) behind a small Supabase
  shim (`demo/shim.sql`: API roles, `auth.users`, `auth.uid()`, md5 passwords), with the
  clock at `DEMO_NOW` (`src/shared/config/demo.ts`, = FIXTURE_NOW).
  - Every call runs as the signed-in account with RLS and answers with PostgREST's JSON.
  - It keeps its data in IndexedDB. `resetDemoData`, `demoAccounts` and `demoMailbox`
    (the outbox) are ready for the planned demo panel.
  - On for dev and tests, off for production builds (`VITE_DEMO` in `vite.config.ts`).
- The data door: `src/shared/api/rpc.ts` (`rpc`, `readRows`, `insertRows`, `updateRows`,
  `deleteRows`, `callEdge`, `AppError`, `toAppError`) and `auth.ts`. `backend.ts` picks
  Supabase (`supabaseBackend.ts`) or the demo. `queryClient` retries only network failures.
- The session: `entities/account` (`useSession`, `useUserId`, `useMyProfile`, `accountKeys`)
  and `app/providers/SessionProvider.tsx`, which clears the query cache when the account
  changes. The guards in `app/router/guards.tsx` are real now: signed in → approved →
  coach, and `/` by role.
- Groundwork for the screens:
  - `src/shared/ui/icons/` (the 10 drawn glyphs and a Close cross) and
    `src/shared/lib/cn.ts`;
  - base styles: line height `normal` as drawn, pointer cursor, `--muted` placeholders;
  - an `index.ts` with `<entity>Keys` for every entity.
- Docs: ARCHITECTURE §3.2, §3.6, §6, §8; DEV_SETUP §1; CLAUDE.md Commands.
- The plan, outside the repo in `D:\DOWNLOAD\Swimming\frontend-plan\` (its README says what
  each file is):
  - 11 implementation specs: every screen group, the UI kit, the data contracts and the
    conventions;
  - the drawings rendered at six widths;
  - the builder brief, the wave scripts and the tools.
**VALIDATION**
- typecheck, lint, format and build pass. `npm run test`: 70 unit tests pass (51 before;
  the rest cover demo mode, the guards, icons and `cn`). The production `dist/` has no demo
  code.
- Demo mode in Chrome (Vite dev server): the first load takes about 5 s, later ones about
  1.3 s, and changes survive a reload. What it shows matches `Main.dc.html`:
  - Tue 29 Sep's chips for Aiman & Sofia;
  - Mei Ling's Package 4.

  Booking really books, and a clash comes back as `overlap_mine` with its detail.
- `tests/db` through a PGlite socket bridge: 152 of 229 pass. The rest fail in the
  bridge, which mishandles errors inside a transaction and gives the race tests only one
  connection. Demo mode calls PGlite directly, so this isn't a demo-mode fault.
- `npm run test:db` was not run against `swimclass-dev` this session.
**Next**: carry on with the build plan (`frontend-plan/README.md`):
1. Wave 1, 4 builders (`frontend-plan/wave1.js`): the UI kit's controls and composite
   pieces, messages and format, and the app shell with the demo panel. The worktrees
   `D:\DOWNLOAD\Swimming\worktrees\w1-*` (branches `fe/w1-*`, at 82095bc) are ready.
   Merge each into `frontend-first`.
2. Wave 2, 4 builders (`frontend-plan/wave2.js`): every entity, and the features
   cancel-lesson, excuse-lesson and approve-account.
3. Wave 3, 6 builders (script to write): one per screen group, each checked against the
   drawings at six widths:
   - sign-in pages and Account;
   - Book;
   - Schedule and My classes;
   - coach Schedule;
   - Students & payments and Add students;
   - Settings.
4. Review and fix, then this file. After that comes the wiring: prompt 05's Edge
   Functions, then `VITE_DEMO=false` against `swimclass-dev`.
**Decisions**
- Herman (30 Sep): frontend first. Every screen is built from the designs before prompts
  05–11 wire them up. The screens call the real database functions through demo mode,
  so the wiring left is mainly auth, the Edge Functions and turning demo mode off.
- Demo mode runs the real migrations in PGlite instead of mock data, so no business rule
  is copied into the browser (CLAUDE.md rule 1). PGlite is dev-only; production builds
  leave it out. **Herman to confirm**, since CLAUDE.md asks before changing the stack.
- Body text uses line height `normal` (Figtree 1.2), as the drawings do. Elements that
  need more set their own.
- For the build, given to the builders but not built yet:
  - entity types keep the database's snake_case names;
  - one query per function or view per scope, with narrower hooks selecting from it;
  - typographic apostrophes (’) in copy;
  - "Signed in as <display name>" for the coach too;
  - the business name comes from settings on signed-in pages;
  - money reads "RM 240" or "RM 240.50";
  - the coach layout's `<main>` loses its padding and each coach page pads itself as
    drawn, because the side columns must reach the page edge (this replaces v0.5's
    "coach page padding is unchanged");
  - open questions get the specs' recommended defaults.
**Open issues**
- The specs hold about 100 questions for Herman (§10 of each file in
  `frontend-plan/specs/`). The ones that matter most:
  - Business name: "Swim Class" (settings and code) or "Swim Class Booking" (the drawings)?
  - Minimum password length (8 proposed).
  - Is a phone number required at sign-up?
  - What does "Pay RM [price]" show when no price is set?
  - Add students' defaults (1-to-1 with no account chosen is proposed).
  - Does log out end the session on this device only, or on every device?
  - Should the coach get a "Back to coach view" link and a Log out?
- `pending_accounts()` and `email_log()` are planned but not in the migrations. Until then,
  Waiting for approval can't show emails and the email log can't load (prompts 09, 11).
- Demo mode differs from Supabase in these ways:
  - rows it creates get the real `created_at`, while `app_now()` stays on 26 Sep;
  - sign-up confirms the email at once;
  - forgot password sends nothing;
  - the log-in pause is counted in memory;
  - there is no 1000-row cap.
- `supabaseBackend.ts` stays untested until prompt 05. TECH_SPEC §7 should settle the
  `login` reply (the tokens) and its error body (`{ "error": "<code>" }`).
- v0.5's CI issue is settled: nothing imports the Supabase client up front, and the unit
  tests run in demo mode.
**Manual steps waiting on Herman**
- Install Node 24 LTS (nodejs.org, the .msi). It should replace the Node 20.14 in
  `D:\DOWNLOAD`; check `node --version` in a new terminal. Then `npm run dev` runs in demo
  mode: sign in as `herman` or `meiling` with `swim-test-2026`.
- Link the Supabase CLI on this machine: `npx supabase login`, then
  `npx supabase link --project-ref uhrgtttvzqjrdtdzyzkr`.
- Say whether frontend first, with demo mode and the PGlite dev dependency, is OK. (The
  branch is already merged into `main`, at Herman's request.)
- Still open from v0.5:
  - `npx supabase db reset --linked`, then `npm run test:db`;
  - the browser click-through;
  - Cloudflare;
  - package prices;
  - Google 2-Step Verification;
  - the optional CA certificate check.

## v0.5 · 29 Sep 2026 · Restructure to ARCHITECTURE v1.0 and DESIGN v1.2
**State**: Branch `architecture`, on top of `04-booking-and-payments` (not pushed). The code
sits where `docs/ARCHITECTURE.md` says, with its lint rules, CI and DESIGN v1.2's
responsive layouts, and no behaviour change beyond those. The docs match the code. Three
small email migrations are pushed to `swimclass-dev` (13 in all; `npx supabase migration
list --linked` shows the dev database in step with the repo). Prompts 01–04's VALIDATION
passes (below).
**Done**
- Moves (renames only): `src/lib/*` → `src/shared/{api,config,lib/time}`; each page →
  `src/pages/<route>/` with an `index.ts`; `src/app/{router,layouts,providers,styles}`;
  `PlaceholderPage` → `src/shared/ui/`; unit tests next to their code;
  `tests/db/settings.test.ts` → `admin.test.ts`; `supabase/snippets/` → `supabase/scripts/`.
- The `@/` alias; `ROUTES` in `src/shared/config/routes.ts` with ARCHITECTURE §3.5's paths;
  `src/shared/config/env.ts`; `app/providers/QueryProvider.tsx`; `npm run db:types` writes
  `src/shared/api/database.types.ts`.
- `eslint.config.js`: ARCHITECTURE §3.1's layer rules (downward imports only, no sideways
  imports, front doors, only `shared/api` imports Supabase, no relative paths into another
  layer) and sorted imports. Each rule was proven with throwaway files.
- CI: `.github/workflows/ci.yml` runs lint, typecheck, unit tests and the build on every
  push; `.nvmrc`, `.editorconfig`. Two Vitest projects: `npm run test` (unit) and
  `npm run test:db` (database, one file at a time). `tests/db/fixture.ts` holds the seed's
  clock and ids.
- Layouts (DESIGN §3, §5): customer and coach pages have a bottom tab bar below 1024 px and
  a 220 px sidebar from 1024 px (`src/app/layouts/`: `TabBar`, `Sidebar`, `SkipLink`,
  `navigation.ts`). The coach's tab bar says "Students" and ends with "Customer view".
  Customer page padding is 20/32/48 px, and the customer layout has a skip link too.
  Sign-in pages are a centred 420 px card on `--subtle` from 768 px.
- `design/`: synced from the canvas (version 1790670143-1c97): 8 drawings updated, the 8
  `…Desktop`/`…Phone` drawings added. DESIGN v1.2 already describes their content.
- Migrations: `…110000_update_email_links` (the confirmation links to `/my-classes`),
  `…110100_fix_email_link_pattern` (links may contain `-`: a test caught `/my-classes` cut
  at the hyphen), `…110200_fix_email_text` (security: `{{{site_url}}@evil.example` in a
  name or reason survived the old single pass and became a link in the coach's email). The
  times are hand-picked: the CLI's UTC time today sorts before prompt 04's files.
- Docs: `supabase/README.md` (new database map); ARCHITECTURE §2, §3.2, §3.7, §4, §5;
  CLAUDE.md; TECH_SPEC §3, §5, §6, §7, §8, §10, §11; PRD BR-31; DESIGN §4; DEV_SETUP; README;
  prompts 01–12 (paths, routes, commands, drawings). All 25 findings of prompt 04's doc
  checks are fixed (two by the migrations above).
**VALIDATION (prompts 01–04)**
- typecheck, lint, format and build pass. `npm run test`: 51 unit tests pass.
  `npm run test:db`: 229 pass, twice (94 s, 90 s); the second run's seed check proves the
  first left nothing behind. `npx wrangler deploy --dry-run`: 21 files, fine.
- A fresh checkout with no `.env.local` (a git worktree) passes CI's steps: `npm ci`, lint,
  typecheck, test, build.
- No secret key in the repo, its history or `dist/` (`git grep -E
  "sb_secret_[A-Za-z0-9_-]{8,}"`; the plain `sb_secret` finds only the four doc lines that
  warn about the prefix, so prompt 01's check now uses the pattern).
- In Chrome on `npm run dev`: every route shows its page; Figtree 400 and 600 load; Tab
  shows the 2 px accent ring; the skip link appears and moves focus to the page; the tab
  bar (390 px), the sidebar and View as customer (1280 px) work. At 360, 390, 768, 1024,
  1280 and 1440 px on all 14 routes: no sideways scrolling, one navigation visible, every
  visible link at least 44 px.
- Not done by Claude: prompt 02's "migrations apply from scratch" needs
  `npx supabase db reset --linked` (manual step below).
**Next**: after merging, `prompts/05-auth-and-accounts.md`.
**Decisions**
- Herman: ARCHITECTURE's routes (`/forgot-password`, `/reset-password`, `/my-classes`,
  `/coach/add-students`); TECH_SPEC §11 and the prompts follow them.
- Herman: ARCHITECTURE §4 now describes the database as built: everything in `public`,
  grants decide what the API may call, no `private` schema for now; `comment on function`
  for new functions only.
- Docs corrected to match the code, not the other way round: the sign-in and customer
  pages stay in the main bundle, and only the coach's pages are lazy-loaded (prompt 01's
  choice, for phones on 4G), with the function form of `lazy`.
- The tab bar and the sidebar carry the same name ("Main", "Coach"), as in the drawings;
  CSS shows one. Tests tell them apart by the sidebar's `aside`.
- Coach page padding is unchanged: the drawings vary it per page.
- Daily emails (a doc-check finding): reminders at `reminder_time`, the digest at
  `digest_time` (PRD BR-33), each recorded in `daily_jobs` for tomorrow's date;
  `queue_daily_emails` decides what is due and `mail-queue` only calls it (TECH_SPEC §5.5,
  §7). The Email log reads through a coach-only `email_log()`; the sender name is the Apps
  Script's `SENDER_NAME` (prompt 11).
- Doc version numbers stay as Herman set them; this entry lists the changes.
**Open issues**
- The customer sidebar has no "Signed in as …" yet: it needs the session (prompt 05 says so).
- CI sets no `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY`, and
  `src/shared/api/supabase.ts` throws on import without them. CI passes now only because
  nothing imports the client yet. When prompt 05 wires it into a page (so the unit tests
  load it), give `ci.yml` placeholder values or mock the client in the tests.
- In the drawings, the coach schedule's 320 px column and Record payment's 340 px panel run
  to the page edge, but `CoachLayout`'s `<main>` pads its content (prompt 08 notes it).
- Maximum widths (Book, Schedule, My classes 1100 px; Settings 760 px; Add students' form
  600 px) belong to each page; none are built yet.
- `get_public_settings` prices and `payment_instructions` may be null, though the generated
  types say `number` and `string`. Prompt 07's "Pay RM [price]" needs Herman to say what
  shows when no price is set.
- `npm audit`: 3 moderate findings in `wrangler` → `miniflare` → `undici` (dev tools only,
  there before this work). Prompt 12's security check will want them gone: update wrangler
  when a fix ships.
- `design/screens/` is still empty.
- Still open from v0.4: lesson expiry applies nothing; lesson lengths bind the coach; no
  limit on booking and cancelling churn; waiting accounts can read payment instructions;
  prompt 09 builds `pending_accounts` and `delete_account`; sign up as `herman` first;
  "Database error saving new user"; `bookings.group_id` has no `on delete`;
  `database.types.ts` lists internal functions. The "Failed to start forks worker" run
  didn't happen again.
**Manual steps waiting on Herman**
- Review, then merge and push both branches (`architecture` sits on top of 04):
  `git switch main && git merge --ff-only 04-booking-and-payments && git merge --ff-only architecture && git push`.
  Then check the first CI run under the repo's Actions tab.
- To prove every migration applies from scratch (prompt 02): `npx supabase db reset --linked`
  (check `npx supabase projects list` shows `swimclass-dev` linked), then `npm run test:db`.
- Your `npm run dev` restarted once around 6 pm: I started a second dev server for checks,
  it clashed on the port and broke yours (a blank page), and touching `vite.config.ts`
  (no change) made yours rebuild. If a tab looks stale, reload it.
- Optional: a PNG of each of the 16 drawings in `design/screens/`.
- Still open: browser click-through, Cloudflare once the nameservers are live, package
  prices, Google 2-Step Verification; optional CA certificate check (v0.2).

## v0.4 · 29 Sep 2026 · Prompt 04: Booking, cancelling, packages and payments
**State**: Everything that changes data is live on `swimclass-dev`: five migrations
(`supabase/migrations/20260929100000_coach_slot_check.sql` to `…100400_settings.sql`,
applied with `npx supabase db push`); `src/lib/database.types.ts` regenerated. Typecheck,
lint, format and build pass; `npm run test` runs 275 tests (46 unit, 229 database) and they
pass twice in a row, leaving the seed unchanged. Work is committed on branch
`04-booking-and-payments` (not pushed).
**Done**
- `…_coach_slot_check.sql`: `slot_check` recreated with the coach's options
  (`p_ignore_open_hours`, `p_allow_past`, `p_ignore_window`; defaults are the customer
  rules) and `coach_slot_check` for the Add booking dialog.
- `…_emails.sql`: MYT text helpers (`myt_when_text` "Sat 3 Oct, 9:00–10:00 am" and its
  parts), `email_text`, `email_html`, `account_email`, `queue_email`; templates
  `email_booked`, `email_cancelled`, `email_late_alert`, `email_broadcast`; the queueing
  functions behind them. Names are HTML-escaped (the v0.2 open issue, for these emails).
- `…_booking.sql`: `book_lesson`, `coach_book`, `cancel_booking`, `excuse_booking`,
  `record_payment`, `add_free_lesson`; internal `place_bookings`, `lock_booking_dates`,
  `package_price_cents`.
- `…_groups_accounts.sql`: `create_group`, `update_group`, `set_group_active`,
  `approve_account`, `username_available` (the one function anon may call).
- `…_settings.sql`: `get_public_settings`, `set_open_hours`, `add_exception`,
  `remove_exception`, `update_settings`, `post_announcement`, `remove_announcement`; checks
  that `reminder_time` and `digest_time` are before 24:00.
- Tests: `tests/db/booking.test.ts` (booking, the coach's options, emails, three race
  tests, the clock), `changes.test.ts` (cancel, excuse, payments), `groups.test.ts`,
  `settings.test.ts`; grant lists in `rls.test.ts` and `availability.test.ts`.
- Test harness (`tests/db/helpers.ts`, `vite.config.ts`): `openSession()` for race tests;
  connections are read-only outside each test's `begin read write`, so a test that times out
  can't commit; the fingerprint covers every setting and the seeded accounts (new
  `SEED_FINGERPRINT`); test files run one at a time, 30 s per test.
- Docs: TECH_SPEC §3, §5–§8, §10, §12; PRD BR-31; DESIGN §4 and §6 (messages for the new
  codes, and a coach table); DEV_SETUP §4; prompts 05–12; the comment in
  `src/lib/business.ts`.
- Review: eight read-only reviewers (41 findings, merged to 31), each finding checked by
  three skeptics; 19 confirmed and fixed. Code: customer text could carry the `{{site_url}}`
  placeholder into the coach's emails (now neutralised, and only the templates' paths become
  links); reactivating a group could race `create_group`; '24:00' reminder times; a series
  confirmation that promised free cancellation of a first lesson already locked; messages
  of only newlines; broadcasts to unconfirmed addresses. Tests: a timed-out test could
  commit; files waited on each other's locks; outbox and approved-customer assumptions;
  fingerprint gaps; a race assertion that could never fail. Docs: everything listed above.
**Next**: `prompts/05-auth-and-accounts.md`.
**Decisions**
- Herman: the coach may book in the past (it counts as used) and beyond the booking window.
- Herman: the race tests never commit. The loser waits for the winner's lock and gives up
  after a 3 s lock timeout; the refusal it would get after a commit (`overlap_other`,
  `credit_exceeded`, `gap_after`/`gap_before` across midnight) is tested in one
  transaction. So prompt 04's "the other fails gap_after or gap_before" is proven in two
  parts.
- Locks: the group row first, then `pg_advisory_xact_lock(20260929, days since
  2000-01-01)` for every MYT date `[start − gap, end + gap]` touches, sorted; the booking
  functions are volatile, so they see everything committed while they waited.
- `slot_check` has no gap option: the gap is the last check, so the coach's callers accept a
  gap result when he skips the gap, and only the weeks that need it get `gap_override`.
  Outside open hours he may start at any whole minute. Lesson lengths bind him too.
- Errors: one week fails with `slot_check`'s reason and detail; several with
  `repeat_conflict` {dates, clashes}; `credit_exceeded` {needed, can_still_book}; all codes
  are in TECH_SPEC §5.2–§5.4 and DESIGN §6.
- Emails: `coach_book` sends nothing; late alerts only for customers' changes (a start
  within 24 h, inclusive); cancellation emails always; broadcasts to approved customers
  whose address is confirmed or was invited; links use `{{site_url}}`, which mail-queue
  must replace in all three fields (prompt 11); coach emails wait while `coach_email` is ''.
- `excuse_booking` only once a lesson has started; `set_group_active` won't deactivate a
  group with upcoming lessons; `update_group` moves upcoming lessons to a new location;
  `record_payment`: a null amount is the price pro rata, a null date is today (MYT), no
  future dates.
- Names that differ from TECH_SPEC: `update_settings(p_settings)` (was `p`),
  `post_announcement(…, p_pinned)` for the design's "Pin as a banner" checkbox.
  `get_public_settings` is for every signed-in account, not anon, so signed-out pages use
  `DEFAULT_BUSINESS_NAME`.
- Packages: `group_balance` counts packages by lessons used, `booking_ledger` by lesson
  order, so after booking Sofia on Tue 29 Sep the balance says Package 2 (none left) while
  Sunday's lesson becomes Package 3 lesson 1 (TECH_SPEC §10 reworded).
**Open issues**
- `lesson_expiry_months` is stored, but nothing applies it (BR-24 is off by default and no
  rule is written). Prompt 10 shows it disabled unless Herman defines how expiry works.
- Lesson lengths bind the coach too: with lessons set to 1 hour only, he can't add a 2-hour
  lesson. Ask Herman if he wants that.
- Nothing limits how often a customer books and cancels; a script could fill the outbox
  (Gmail sends 100 a day). Not in the spec; add a limit if it ever matters.
- Accounts waiting for approval can read `payment_instructions` through
  `get_public_settings`. Fine for bank details meant for customers; restrict if Herman
  prefers.
- Prompt 09 must still build `pending_accounts()` and an admin-accounts `delete_account`
  for the Waiting for approval tab (the prompt now says so).
- Customer codes without their own message use DESIGN §6's generic row (`reasons.ts`,
  prompt 06).
- The first full test run once reported "Failed to start forks worker" for
  `tests/unit/routes.test.tsx` (that file didn't run); the second run was clean. If it
  happens again, run again.
- Still open from v0.2/v0.3: sign up as `herman` first; Auth reports trigger errors only
  as "Database error saving new user" (prompt 05); `bookings.group_id` has no `on delete`;
  `database.types.ts` lists internal functions too.
**Manual steps waiting on Herman**
- Review, then merge and push:
  `git switch main && git merge --ff-only 04-booking-and-payments && git push`.
- Done: prompt 03 merged; new nameservers set for swimclass.online at the registrar
  (propagating on 29 Sep).
- Still open: browser click-through, Cloudflare setup once the nameservers are live,
  package prices, Google 2-Step Verification; optional CA certificate check (v0.2).

## v0.3 · 28 Sep 2026 · Prompt 03: Availability engine
**State**: The availability engine is live on `swimclass-dev`
(`supabase/migrations/20260928120000_availability.sql`, applied with `npx supabase db push`);
`src/lib/database.types.ts` regenerated. Typecheck, lint, format and build pass;
`npm run test` runs 180 tests (46 unit, 134 database) and they pass twice in a row, leaving
the seed unchanged. Free start times and reasons match TECH_SPEC §10 exactly. Work is
committed on branch `03-availability-engine` (not pushed).
**Done**
- Migration: `open_windows`, `slot_check`, `lesson_travel`, `myt_text` (internal, no
  grant); `week_slots`, `week_busy`, `coach_week` (granted to `authenticated`); an index on
  `availability_exceptions (ends_at)`.
- `tests/db/availability.test.ts` (44 tests): the §10 tables for 1 and 2 hours, every
  expected reason with its exact detail, check order, start step, booking window in four
  session time zones, the Wed 7 Oct open/closed exceptions, midnight, travel minutes
  (override pairs, neighbours on other days and weeks), `week_busy` privacy, `coach_week`
  details and notes, permissions and grants. `tests/db/rls.test.ts` grant list updated.
- Docs: TECH_SPEC §5.1 (behaviour, decisions, JSON shapes), §5.2 (lock every date within
  the travel gap; the coach needs `slot_check` options and `coach_slot_check`), §5.4 (travel
  gap in `get_public_settings`), §6; prompts 04 (now also builds the §5.4 functions and
  `coach_slot_check`, adds a midnight concurrency test), 06, 07, 08 and 10 adjusted.
- Two reviews: seven angles with three skeptics per finding, then a read-only review of
  the revised code with two. No wrong answers for real bookings. Fixed: a null week start
  read as "all time" (now `invalid_week`); `coach_week` recomputing balances for each day;
  filters that couldn't use indexes; test gaps (check order, step origin, travel across
  weeks, exact details, case-insensitive privacy search); prompt 08 calling a function
  with no grant; §5.4 functions no prompt built.
**Next**: `prompts/04-booking-and-payments.md`.
**Decisions**
- Booking window (Herman): customers can book through the Sunday of the week
  `booking_window_weeks` after the current MYT week (on Mon 28 Sep with 4 weeks: up to Sun
  1 Nov). `past` = the start time has passed.
- Open windows are cut at MYT midnight, so a customer's lesson never crosses midnight;
  closed exceptions win over open ones. Start times step from the start of the window
  they are in (an exception at 3:10 pm shifts that evening; prompt 08's dialogs offer
  times on the step).
- `week_slots` uses the caller as the viewer, so the coach sees `overlap_other` for every
  lesson (names are in `coach_week`).
- Errors: `not_approved` (week_slots, week_busy: accounts waiting for approval),
  `not_your_group` (a customer's missing or other group), `not_found` (coach, no such
  group), `invalid_week`, `invalid_length`, `not_coach` (coach_week).
- JSON times are MYT text (`2026-09-29T19:30:00+08:00`); the `week_slots.starts_at` column
  is a timestamptz (UTC text through the API).
- Travel is in minutes: the gap, shortened next to a closer neighbour, and 0 between an
  override lesson and the neighbour it was squeezed next to, in the customer view too (as
  the design). The UI draws travel only inside open time.
- `slot_check` keeps the TECH_SPEC signature and first-failure order; prompt 04 adds the
  coach's options (TECH_SPEC §5.2).
- Domain: swimclass.online (Herman, noted under v0.2).
**Open issues**
- Codes without a DESIGN §6 message yet: `not_your_group`, `not_found`, `not_coach`,
  `invalid_week`, `invalid_length`, `off_step` (and the v0.2 trigger codes). `week_slots`
  rows only carry codes that have one; give the rest a generic message in
  `src/lib/reasons.ts` (prompt 06).
- Not load-tested with years of data. Before the fixes, the review measured `coach_week`
  at about 0.4 s with three years of synthetic bookings.
- `src/lib/database.types.ts` lists internal functions too (generation ignores grants);
  the browser can't call them.
- `supabase/.temp/linked-project.json` (CLI cache, not in git) says `swimclass` until the
  next `npx supabase link`; `npx supabase projects list` shows `swimclass-dev`.
- During the first review, one agent's test run committed a broken copy of these functions
  to the dev database (many agents running the migration inside test transactions at
  once). Herman approved the cleanup, then the real migration was pushed. Review agents
  now get read-only checks only.
- Still open from v0.2: prompt 09 pending accounts and "Remove"; Auth reports trigger
  errors only as "Database error saving new user" (prompt 05); `bookings.group_id` has no
  `on delete`; HTML-escape names in emails (prompt 11); sign up as `herman` first.
**Manual steps waiting on Herman**
- Review, then merge and push:
  `git switch main && git merge --ff-only 03-availability-engine && git push`.
- Still open: browser click-through, Cloudflare account, package prices, Google 2-Step
  Verification; optional CA certificate check (v0.2).
- Done: the dev project is renamed `swimclass-dev`.

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
- Domain: swimclass.online (bought), use it as the production address in prompt 12.
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
