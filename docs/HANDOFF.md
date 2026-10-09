# Handoff

Update this file at the end of every Claude Code session. Newest entry on top.
Keep entries short; link to files instead of pasting code.

## v0.27 · 9 Oct 2026 · Going live: English and Chinese, Remove payment
**State**: `chinese` (v0.26: stages 1 to 4 and Remove payment) is fast-forwarded into
`frontend-first` to go live (Herman, 9 Oct: "now i just have to make the system goes live with
the update i made"). The reader hasn't read the Chinese yet: their corrections ship later as
an ordinary website deploy. Not pushed or deployed when this was written.
**Checked before the merge**: typecheck, lint, format:check, unit (252 files, 1908 tests), a
production `vite build` into the scratchpad (names the production project; the `zh` chunk is
6.0 kB gzipped). `npm run test:db` on dev passed on 9 Oct with both migrations (299, v0.26).
**Decided**: "Unpaid packages allowed" stays 1 (Herman, 9 Oct: "can just remain 1 for now").
**Deploy** (Herman, PRODUCTION.md §3). The database goes before the website: the new site
reads `profiles.language` and calls `remove_payment`, so a site deployed first fails on every
signed-in page.
1. `git push origin frontend-first`; CI green; `git fetch . frontend-first:main`;
   `git push origin main`.
2. `npx supabase link --project-ref lzpvvgbnyyqzzohwncxc`; `npx supabase db push --dry-run`
   must list exactly `20261008100000_profile_language.sql` and
   `20261009100000_remove_payment.sql`; `npx supabase db push`; straight away
   `npx supabase link --project-ref uhrgtttvzqjrdtdzyzkr` (back to dev).
3. `npm run build`; `npx wrangler deploy`.
4. Claude checks the live site: headers, a deep link, the `zh` chunk, the toggle on /login.
5. PRODUCTION.md 1.3: Confirm signup template = the new `confirmation.html`. Until then a
   sign-up made in 中文 gets the English email.
**Next**: the live checks after the deploy; then v0.26 Next 1 and 2 (the reader, Waiting for
approval's shot, the corrections). Still open: PRODUCTION.md 1.3 and 1.8, the signed-in
first-load and Lighthouse checks, §2 students, HANDOFF v1.0. The local `chinese` branch can
go once `frontend-first` is pushed.

## v0.26 · 7–9 Oct 2026 · English and Chinese; removing a payment
**State**: the working copy is on the local branch `chinese` (stages 1 to 4, Remove payment
and these notes), which isn't pushed. Stage 4's and Remove payment's migrations are on dev
(Herman pushed them 8 and 9 Oct), not production.
`frontend-first` = `origin/frontend-first` = `origin/main` = 9914226 = v0.25, which is live: Herman pushed, ran the production `db push` (payment_limit) and `wrangler
deploy` on 7 Oct. Switch to `frontend-first` before Herman builds anything else for
production: the build takes the working tree. `supabase/scripts/make-coach.sql` stays
modified on purpose (Herman's email; never commit it).
**Also done 7 Oct**: Herman ran `frontend-plan/sql/remove-three-customers.sql` on production
(rehearsed on dev, rolled back): the accounts huishan (Hui Shan Ng), tester and uromom, with
their students Huishan, tester and Niga123, their lessons and payments, are gone; the final
check listed none. That also settles v0.25's "remove the tester's payments", and
`remove-uromom.sql` is no longer needed.
**Decisions** (Herman, 7 Oct: "1. Student screen only, 2. A, 3. B, 4. A")
- Student screens switch: Book, Schedule, My classes, Account, Log in, Sign up, Forgot and
  Reset password, Waiting for approval, Not found. The coach's screens stay English
  (`CoachLayout` pins English); "View as customer" follows the toggle.
- Simplified Chinese (简体).
- Emails go in the student's language: needs a migration (stage 4).
- At sign-in the account's saved language wins over the phone's (Herman, 8 Oct: "2. B"); an
  account that never chose takes the phone's choice, if the phone made one.
- An "EN | 中文" toggle at the top of every student page, remembered on each phone.
- Typed text stays as typed: names, pools, announcements, payment instructions.
- Claude writes the Chinese; a reader of Chinese checks it before it goes live (screenshots
  in `frontend-plan/out/zh/`, words in `frontend-plan/notes/i18n-glossary.md`).
**How it works**: each slice keeps its English words in a `words.ts` (`defineWords`, English
by default, so the tests need nothing) and its Chinese in `words.zh.ts` beside it.
`app/providers/LanguageProvider` loads every `*.zh.ts` at once, the first time 中文 is
picked (one `zh` chunk, `codeSplitting` in vite.config.ts), then switches. Pure functions
that build sentences take the words as an argument, defaulting to English.
**Database text students see**: `group_details.type_label` ("1-to-2"; the browser builds it
from `size` in Chinese) and `display_names` ("Aiman & Sofia", kept); the four student
emails (`email_booked`, `email_cancelled`, `email_broadcast`, `email_reminder`); the Auth
emails (confirm sign-up, reset password: Supabase templates, PRODUCTION.md 1.3). Error
details carry raw times (`myt_text`), so the browser formats them.
**Stages** (each: tests, zh screenshots, commit, show Herman, stop)
1. The toggle, the mechanism, `<html lang>`, a CJK font fallback, Chinese dates and times,
   the menu, Log in, Sign up, Forgot and Reset password, Waiting for approval, Not found.
2. Book and Schedule, with the customer messages (`messages.ts`) and slot reasons.
3. My classes and Account.
4. Migration: `profiles.language` (set at sign-up and by the toggle), Chinese student
   emails. Herman pushes it to dev; `test:db`; then production.
5. The reviewer's corrections; deploy.

**Stage 1** (done, not deployed): `shared/i18n/` (language.ts: the phone's choice in
localStorage `swimclass.language`; words.ts: `defineWords`, `ZhWords`, `registerChinese`;
context.ts: `useLanguage`, `useWords`; LanguageScope.tsx; pageLanguage.ts: `<html lang>`),
`app/providers/LanguageProvider` + `loadChinese.ts`, `shared/ui/LanguageToggle` (top right of
every student page; beside the business name on the sign-in card), the CJK font fallback,
Chinese in `formatTime`/`formatDay`/`formatDayMonth`/`formatDayMonthYear`/`formatRange`/
`formatDateList`/`formatHours`/`formatMinutes` (a `language` argument, English by default),
`messages.ts` (`language` option, `messagesIn`, `Readers`; every customer code in
`messages.zh.ts`), and Log in, Sign up, Forgot and Reset password, Waiting for approval, Not
found, the route loading and error screens, Log out, the tabs and sidebar. Each slice's words
are in `model/words.ts` + `model/words.zh.ts` (app/ and shared/ beside the code).
`app/providers/chinese.test.ts` checks every words.ts has its Chinese with the same key, that
Chinese files import types only, and that every customer message has Chinese.
**Stage 2** (done 8 Oct, not deployed; Herman: "continue … start now", so no wait for the
reader): Book and Schedule. New word pairs: `shared/ui/words.ts` (the kit: Days, Week,
Previous/Next week, Today, Legend, Close), `entities/{announcement,balance,group,schedule,
slot}/model/words.ts`, `features/book-lesson/model/words.ts`, `pages/{book,schedule}/model/
words.ts`. Pure functions that build sentences take a last `language` argument, English by
default, and read their words with `wordsIn` (as `messagesIn` does), so the coach's callers
and the old tests are unchanged: `packageTitle`/`packageCounts`/`packageCaption`/
`laterPackageCounts`/`unpaidPillLabel`/`bookPackageNote`, `formatDayKey`/`dayHeading`/
`formatWeekLabel`/`customerHourLabel`/`describeCustomerDay`, `unavailableTitle`,
`usageLine`/`lessonTitle`/`bookingSummaryState` (`language` in its input)/`pickATime`/
`cancelPolicyNote`/`repeatLabel`/`bookedHeading`/`bookedWhen`/`bookedPackageLine`,
`dayStripDays`/`coachAwayText`/`alreadyBookedText`. Components use `useLanguage`/`useWords`,
and CoachLayout keeps the coach's screens English.
- Chinese dates are built from the date (`zhParts` in `entities/schedule/model/labels.ts`):
  splitting "10月3日 周六" on spaces, as the English is split, gave weekday "10月3日".
- The type tag comes from the group's size in Chinese: `typeLabelIn(group, language)` in
  `entities/group` (一对一/一对二/一对三); English keeps the database's `type_label`.
- The success panel keeps what was booked (`BookedOutcome.lessons`) and writes the words when
  it shows, so the toggle changes it too.
- Schedule's hour lines are 24-hour in Chinese ("7:00" … "21:00"): "上午10" and "下午12" took
  two lines in the phone's 34 px column.
- Tests: `shared/i18n/registerAllChinese.ts` (tests only) registers every `*.zh.ts`; Chinese
  cases in labels, days and summary tests. Full unit run: 250 files, 1884 tests passed; the build
  keeps every Chinese word in the `zh` chunk (4.8 kB gzipped). Commit 9e6f354.
**Stage 3** (done 8 Oct, not deployed; Herman: "A", go on before the reader): My classes and
Account. New word pairs: `entities/{booking,payment}/model/words.ts`, `features/{cancel-lesson,
change-password,update-profile}/model/words.ts`, `pages/{my-classes,account}/model/words.ts`;
`balance` gained My classes' notes. Same pattern as stage 2 (a last `language` argument,
English by default): `lessonNumbers`/`upcomingPosition`/`packagePosition` (its separator is
now optional: ", " in English, " · " in Chinese, since "第 2 节，共 4 节" has a comma),
`lessonWhen`/`lessonDateRange`, `pastStatusLabel`/`pastLessonDetail`/`pastLessonNote`,
`methodLabel`, `accountPackageNote`, `cancelNote`/`cancelLabel`/`cancelTitle`/
`cancelDescription`/`cancelledNotice`, `cancelErrorOutcome` (`language` in its options).
The coach's words in the same files (History, the reason field, "Lesson cancelled. Grace will
get an email.") stay English and out of the word files; CoachLayout keeps those screens English.
- The tag and the type in every line come from `typeLabelIn(group, language)`.
- Known: My classes' "Lesson cancelled: …" notice and a refusal already shown stay in the
  language they were written in when the toggle flips (as on Log in); everything else follows.
- The dev server once served `LastPaid.tsx` as an empty module (Vite read it mid-write, so
  the page failed with "does not provide an export named"); re-saving the file fixed it.
- Tests: Chinese cases in position, when, past, notes, cancelWindow and copy tests. Full unit
  run: 250 files, 1891 tests passed; the `zh` chunk is now 6.0 kB gzipped, the main bundle has
  no Chinese.
**Stage 4** (done 8 Oct, Herman: "1. A, 2. B"; on dev, not production):
- Migration `20261008100000_profile_language.sql`: `profiles.language` ('en', 'zh', or null for
  never chose; null reads as English), updatable by the account holder (column grant, like
  name and phone); `handle_new_user` reads `language` from Sign up's metadata; Chinese date and
  time helpers (`myt_*_zh`); the four student emails in Chinese (`email_*_zh`). The English
  templates are renamed `email_*_en`, unchanged, and `email_booked`/`email_cancelled`/
  `email_broadcast`/`email_reminder` now pick one by the account's language, so the callers and
  dedupe keys are as before. The coach's late alert and digest stay English.
  `supabase/README.md` updated. After Herman's push to dev, `npm run test:db` passed (13 files,
  296 tests) and `db:types` matched the hand edit of `profiles`; the generated file (it also
  lists the new internal functions) replaced it.
- Browser: Sign up sends the screen's language (`SignUpInput.language`, Supabase and demo);
  `app/providers/AccountLanguage` (inside SessionProvider) saves the toggle on the account while
  signed in (`features/save-language`), and settles once per sign-in: the account's language
  wins; an account with none takes the phone's stored choice. Once only, so a profile read
  during a save can't switch the screen back. `isLanguage` is exported from
  `shared/i18n/language`.
- `supabase/templates/confirmation.html` has a Chinese body for a sign-up made in 中文
  (`{{ if and .Data.language (eq .Data.language "zh") }}`); the subject stays English. Herman
  pastes it in PRODUCTION.md 1.3 (updated). Invite (coach-made accounts have no language) and
  reset (metadata from sign-up time, not the toggle) stay English.
- Tests (full unit run: 251 files, 1895 passed): `AccountLanguage.test.tsx` (demo database:
  account wins, null takes the phone's, toggle saves and doesn't flip back);
  `tests/db/language.test.ts` (sign-up language, the grant and its check, each Chinese email,
  English kept for null) and `rls.test.ts` (the column). `frontend-plan/tools/zh-emails.mjs` renders the
  Chinese emails from the demo database into `frontend-plan/out/zh/emails.txt` and `.html`
  (pgq.mjs now loads PGlite from the repo).
**Don't deploy mid-way**: the reviewer hasn't read the Chinese yet, and the migration isn't on
production. The work stays on the `chinese` branch until stage 5.
**For the reviewer** (`frontend-plan/out/zh/`, 390 and 1280 px each unless named): stage 1:
`login`, `signup`, `forgot-password`, `reset-password` (the expired-link screen, as demo mode
shows it), `no-such-page` (Not found), `my-classes` (the toggle and the Chinese tabs only);
stage 2: `book`, `book@360`, `book-crossed-out`, `book-picked`, `book-booked` (Tue 29 Sep, as
meiling: a crossed-out 7:00 pm, 7:30 pm picked, then booked), `schedule`, `schedule@360`;
stage 3 (360, 390 and 1280 px): `my-classes` (replaces stage 1's), `account`, and at 390 and
1280 `my-classes-past` (past lessons and receipts open), `my-classes-cancel` (the
confirmation), `my-classes-cancelled` (the notice), from
`node frontend-plan/tools/zh-my-classes-steps.mjs 390`.
Waiting for approval has none yet: it needs a demo sign-up. Known: a refusal already on screen
("Wrong username or password") stays in its language when the toggle flips, until the next
try. Scripts that drive the demo (`tools/app.mjs` flows) stay in English; zh shots are their
own pass: `node frontend-plan/tools/zh-shots.mjs /book /schedule --as=meiling` (it sets
`swimclass.language` first; `--widths=360,390,1280` for more widths; Herman's `npm run dev` on
5173 must be running), and `node frontend-plan/tools/zh-book-steps.mjs 390` for Book's three
states. The glossary has stage 2's and stage 3's terms in a second and third table. Banner
drops its space after a full-width colon, so the coach's message reads "教练：…".
**Remove payment** (Herman, 9 Oct: "when i misclicked a package for a student i can remove
it"; on `chinese`, so it ships with stage 5):
- Migration `20261009100000_remove_payment.sql`: `remove_payment(p_payment_id)`, coach only;
  deletes the payment (a free lesson too), so `group_balance` is as it was without it and it
  leaves the customer's receipts; nobody is emailed. Takes the group's lock like
  `record_payment`. Errors `not_coach`, `not_found` (none, or already removed),
  `online_payment` (`gateway_ref` set: a payment gateway's record stays). A starting
  balance isn't a payment: Edit group changes it. Herman pushed it to dev on 9 Oct;
  `db:types` from dev gives the same `database.types.ts` as the hand-written entry.
- Students → a group's History → Payments: each payment has "Remove" ("Remove the RM 240
  payment of 22 Aug"), then "Remove this payment?" with what it was and what removing changes,
  focus on "Keep payment". After it, "Payment removed." takes focus (the row goes), and the
  package counts, payments and week refresh. Removed meanwhile in another tab: "This payment
  was already removed." (`features/record-payment`: `useRemovePayment`,
  `RemovePaymentButton`, `RemovePaymentConfirm`; `PaymentRow`'s history variant takes an
  `action`; `online_payment`'s words in the coach table.)
- Tests: unit (demo database) in `mutations.test.tsx`, `RemovePaymentConfirm.test.tsx` and
  `CoachStudentsPage.actions.test.tsx`; `tests/db/changes.test.ts` (a payment, a free lesson,
  the refusals) and `rls.test.ts` (the grant). `npm run test:db` on dev: 13 files, 299 tests
  pass (296 + 3).
**Open**
- Settled 9 Oct: "Unpaid packages allowed" stays 1 for now (Herman: "can just remain 1 for
  now"; v0.24's question), so Settings is unchanged.
- From earlier entries, still open: PRODUCTION.md 1.3 (Auth SMTP, templates) and 1.8 (smoke
  test), the signed-in first-load and Lighthouse checks, §2 students, HANDOFF v1.0 (v0.23's
  Next 2, 3).
  The Chinese sign-up and reset emails (stage 4) depend on 1.3's templates.
**Next**
1. Herman's reader reads the screens (`frontend-plan/out/zh/`), `emails.txt` and the glossary.
2. Stage 5: the reviewer's corrections (screens, `emails.txt`, the glossary); Waiting for
   approval's shot (a demo sign-up); then merge `chinese` into `frontend-first`, Herman pushes,
   the production `db push` (PRODUCTION.md §3; two migrations: profile_language and
   remove_payment), `npm run build`, `npx wrangler deploy`, and the new `confirmation.html` in
   the production dashboard (1.3).

## v0.25 · 7 Oct 2026 · Later packages show; payments at most one package ahead
**State**: local `frontend-first` adds this work on top of v0.24 (949b71f); nothing pushed.
The new migration `20261007100000_payment_limit.sql` is on dev, not production: the
auto-mode check refused Claude's `npx supabase db push` to dev ("Production Deploy"), so
Herman pushed it. Then `npm run test:db` passed on dev (12 files, 290 tests).
**Done** (Herman chose 1A, 2A and "remove payments")
- 1A: lessons booked past the current package get a bar per later package under it:
  "Package 3 · 1 booked · 3 left to book" on Book and My classes, "Package 3" / "1 booked ·
  3 left" on the Students table and cards (`laterPackages` in `entities/balance`). Checked in
  demo mode after booking Sofia an extra lesson (`frontend-plan/out/later-pkg-*.png`).
- 2A: `record_payment` refuses a payment that starts more than one package past the last
  package with a lesson (`paid_ahead` {package_no}), and one payment that would pay further
  than that, beyond a whole package (`too_many_lessons` {max}). A group that owes a payment
  can always pay (a unit test sweeps the balances). The panel shows paid_ahead's words in
  place of the form (`paidAheadPackageNo`); free lessons and excusing stay. The pro-rata db
  test now pays Aiman & Sofia 3 before 4.
- "Remove payments": waiting for Herman to run the read-only listing of payments since
  6 Oct on production (given in chat) and say which to delete; then a `DELETE` by id with the
  group's balance before and after, as `frontend-plan/sql/remove-tester-payments.sql`.
**Next**
1. Herman: push; production `db push` (PRODUCTION.md §3: link prod, `--dry-run`, push, link
   dev straight back); `npm run build`; `npx wrangler deploy`.
2. The tester's payments; "Unpaid packages allowed" (v0.24 Next 2); then v0.23's Next 2, 3.

## v0.24 · 7 Oct 2026 · The Unpaid pill names its package
**State**: local `frontend-first` adds v0.22, v0.23, 50b069a and this entry on top of
`origin` (d2b046a). The live site doesn't have 50b069a yet.
**Done** (Herman's reports from testing with a 1-to-1 tester)
- "A cancelled lesson stays in Package 1, and the next one goes to Package 2": not
  reproduced. A rolled-back db test on dev (deleted afterwards) booked 4 lessons, cancelled
  one 2 weeks ahead and booked again: Package 1 went to 3 booked, 1 left, and the new lesson
  became lesson 4 of Package 1. The cancel refreshes the balance on the device that cancels;
  on other devices the data goes stale after 30 s and reloads on the next tab focus or page
  open (a tab left open and focused doesn't reload by itself).
- "After a cancel they can book more than 1": BR-21 as built. With Package 1 paid,
  `unpaid_packages_allowed` 1 lets them book 4 past it (5 after the cancel). Herman was
  offered 0 (book only what's paid; nothing until the first payment) and hasn't chosen: it's
  a Settings change, no code.
- "The unpaid package should be 2, not 1": the Students table and cards and My classes put a
  plain "Unpaid" beside "Package 1 · 0 used · 4 booked" (package_no counts used lessons). Herman
  chose A: the pill now says "Package 2 unpaid" (`unpaidPillLabel`, the package the next
  payment pays for, as Needs attention and Record payment already did). 50b069a, with PRD
  BR-22 and DESIGN §3. Checked in demo mode at 390, 768 and 1280 (`frontend-plan/out/
  unpaid-pill-*.png`). Unit tests: the affected folders passed (148); the full run before
  the test edits failed only the 8 tests that expected "Unpaid".
- Claude Code's auto-mode check refused a `db query --linked` meant for dev ("Production
  Reads") and then a local `sed` of a migration.
**Next**
1. Herman: `git push origin frontend-first`; once CI is green, `git fetch . frontend-first:main`
   and `git push origin main`. Then `npm run build` and `npx wrangler deploy`.
2. Herman: choose "Unpaid packages allowed" (Settings → Packages): 1 as now, or 0.
3. Then v0.23's Next 2 and 3.

## v0.23 · 7 Oct 2026 · Mailer, www and backups on production
**State**: `origin/main` = `origin/frontend-first` = d2b046a. Local `frontend-first` adds
v0.22 (62552ec) and this entry. No code changed since v0.22. Herman did the steps below
between 12:30 and 12:55 am, with Claude checking; details in `frontend-plan/notes/prompt12.md`.
**Done**
- PRODUCTION.md 1.6, the mailer: the Apps Script points at production (poll, then install).
  The 5 waiting emails to `uromom`'s address (1 booking, 4 cancellations: Herman had cancelled
  its lessons in the app) went out at 00:30, no errors, no retries. Settings: business name
  Swim Class, coach email set, reminder and digest at 8 pm.
- 1.4 step 4 finished: Always Use HTTPS (`http://` → 301 `https://`, path and query kept) and
  the www Redirect Rule ("Redirect from WWW to root"): `https://www.swimclass.online/book?x=1`
  → 301 `https://swimclass.online/book?x=1`. DNS: `www` is a proxied CNAME to the apex.
- 1.7, backups: both secrets set; run 37498005725 attempt 2 passed in about 2 minutes
  (artifact `swimclass-backup-2026-10-07-1`, 178 kB, kept until 4 Jan 2027); it now runs every
  Sunday at 2 am. Attempt 1 failed in "Dump and encrypt": `SUPABASE_DB_URL` held Claude's
  shortened example host `aws-…pooler.supabase.com`. Lesson: never put "…" or another
  shortened part in a value Herman will paste; give the whole value or where to copy it.
- Herman made a new age key during 1.7: the public key `age134mny…` matches
  `C:\Users\User\swimclass-backup-key.txt`. The earlier `age1jj483…` has no private key any
  more; nothing was encrypted with it.
- 5.2 at about 1:15 am: Herman decrypted the artifact's data file with his key file and found
  production's `INSERT INTO "public"."settings"` row (Swim Class, 20:00 reminder and digest).
  The key opens the backups.
**Open**
- Herman copies the new key file to his spare place (a copy made before 00:37 is the dead
  key), and deletes the decrypted `data.sql` and the download.
- 1.3 (Auth SMTP, rate limit, templates, URL settings) is still unconfirmed. Until custom
  SMTP is on, sign-up and reset emails come from Supabase's own sender, which allows only a
  few emails an hour: §2's invites need it.
- 1.8: `uromom` has already been through sign-up, approval, booking, cancelling and the
  emails. Still unseen: a confirmation email through Gmail SMTP, the late-change alert, and
  the 8 pm jobs (reminder and digest) on production.
- `frontend-plan/sql/remove-uromom.sql` still works, but its header's counts are from 6 Oct:
  the 2 waiting emails have since been sent, so it deletes no emails now (sent ones stay in
  the log); it still removes the 4 lessons and the account.
- This session's read-only production queries (`db query --project-ref lzpv…`) were refused
  by Claude Code's auto-mode check ("Production Reads"); earlier sessions ran them.
**Next**
1. Herman pushes v0.22 and v0.23:
   `git push origin frontend-first`, then once CI is green
   `git fetch . frontend-first:main` and `git push origin main`.
2. Herman: 1.3; then 1.8 with `smoketest`; `remove-uromom.sql` if `uromom` was
   his test.
3. Claude: check 1.8's results and the 8 pm jobs on production (needs the production reads
   allowed, or Herman pasting the query output), the signed-in first-load and Lighthouse
   checks, then §2 with Herman and HANDOFF v1.0.

## v0.22 · 7 Oct 2026 · Production is live; the repo's edges and frontend-plan tidied
**State**: `origin/main` = `origin/frontend-first` = d2b046a (Herman pushed). Local
`frontend-first` adds this entry's commit. https://swimclass.online serves the production
build (Herman ran `wrangler login` and `deploy` on 6 Oct; the GoDaddy "Launching Soon" page is
gone). The production Supabase project is `swimclass`, ref `lzpvvgbnyyqzzohwncxc`
(Singapore); the CLI stays linked to dev. The checks and their results are in
`frontend-plan/notes/prompt12.md`.
- PRODUCTION.md §1 done: 1.1, 1.2 (17 migrations; the three functions; `MAIL_TOKEN` and
  `SITE_URL` match `frontend-plan/secrets/prod-functions.env`), 1.4 (headers, deep links,
  manifest, Turnstile on /login: `tools/pwa-check.mjs` ALL OK (15) on the live site; Log in
  first load 1.08 s on Fast 4G + 4× CPU; Web Analytics off; Always Use HTTPS on: `http://`
  → 301 `https://`), 1.5 (herman is the coach: his profile row had been deleted by hand and
  was put back with `frontend-plan/sql/restore-herman-profile.sql`, then make-coach.sql).
- Not done or not confirmed: 1.3 (Auth SMTP, rate limit, templates, URL settings: ask
  Herman), `www.swimclass.online` (still 522: the redirect rule isn't matching), 1.6 mailer,
  1.7 backup secrets and first run, 1.8 smoke test, §2 students, the signed-in first-load and
  Lighthouse checks, HANDOFF v1.0.
- A test customer `uromom` (approved, 1 group, lessons Wed 7, 21, 28 Oct 7:30 pm, 2 unsent
  emails) was on production; `frontend-plan/sql/remove-uromom.sql` (rehearsed, rolled back)
  deletes it if Herman runs it.
**Done** (Herman: "rearrange the files and folders into a cleaner architecture and remove the
files that are not needed"; he chose: trim frontend-plan, keep its name, light tidy in the repo)
- `src/` unchanged: it already follows ARCHITECTURE.md, and ESLint enforces it.
- Repo: README.md rewritten for the live site (it was the planning pack's); the 16 drawing
  PNGs moved into `design/screens/` (1.5 MB; `design/README.md` asked for them); the two
  `.gitkeep` files removed; PRODUCTION.md 1.2 points at the new secrets path and deploys the
  functions with `--project-ref`.
- `frontend-plan` 707 MB → 197 MB (almost all of it `tools/node_modules`). Deleted: the
  build's review screenshots, logs and scripts (399 MB), the portable Node (107 MB, the
  system Node 24 replaces it), design-png, the wave and final-review scripts, BUILDER_BRIEF,
  `tools/get-node24.ps1`, `tools/wt-setup.sh`, and the empty `worktrees/`. Kept, in new places
  (`frontend-plan/README.md` lists them):
  - `secrets/prod-functions.env` (was `review/prompt12/`), `secrets/dev-mail-queue.env`,
    `secrets/dev-mail-token.txt` (were `review/prompt11/`).
  - `tools/`: `seedshift.mjs`, `serve-live.mjs`, `live.mjs`, `lighthouse.mjs` (were
    `review/prompt06/`), `lib.mjs` (`review/prompt08/`), `devpasswords.mjs`
    (`review/prompt11/`, writes to `secrets/`), `pwa-check.mjs` (`review/prompt12/`; now
    ignores Turnstile's own console lines). Each ran from there: seedshift `check` (fingerprint
    matches), devpasswords `check` (13 accounts on the seed password), the libraries import,
    pwa-check on the live site.
  - `sql/` (tonight's production SQL), `notes/` (each prompt's NOTES.md, the 4 Oct security
    audit, the final review's triage and copy list), `specs/` (cited by code comments),
    `out/` (new screenshots).
- Older HANDOFF entries name `frontend-plan/review/...` paths that no longer exist; their
  notes are in `frontend-plan/notes/`.
**Next**
1. Herman pushes this commit (as in v0.20 Next 1).
2. Herman: the `www` redirect rule (Rules → Overview: on; Request URL
   `https://www.swimclass.online/*`; the `www` DNS record proxied), then PRODUCTION.md 1.3 if
   not done, 1.6 (the mailer, with `frontend-plan/secrets/prod-functions.env`'s token), 1.7,
   1.8; and `remove-uromom.sql` if `uromom` is his test.
3. Claude: once herman can sign in on a phone, the signed-in first-load and Lighthouse checks
   (Turnstile blocks a scripted login: a Chrome started by hand with a debugging port), then
   HANDOFF v1.0.

## v0.21 · 6 Oct 2026 · Design changes before go-live: wide laptops and dropdowns
**State**: `origin/main` = `origin/frontend-first` = bd33e60 (v0.20; Herman pushed it, so the
backup workflow is on `main`). Local `frontend-first` adds this entry's nine commits, not
pushed: Herman's design requests, built and checked in his 5173 (demo mode). Scripts,
screenshots and notes: `frontend-plan/review/design-1/` (outside the repo; `NOTES.md`).
Typecheck, lint, format, the production build and the full unit suite (1,858, demo mode) pass.
**Done**
- d495991: every dropdown (`shared/ui/Select`, used by Settings, Edit hours, Block and
  Open extra time, Record payment, Add students) loses the browser's arrow for an 18 px
  chevron in the text boxes' border, radius and height. With a mouse in Chrome or Edge 135+
  the open list is styled too (`Select.css`, `appearance: base-select`): white, radius 12,
  40 px options, the chosen one on `--accent-soft` with a tick, no "Choose…" placeholder in
  the list. Phones keep their own picker; other browsers their plain list. Checked: click,
  Escape, keyboard (Space, arrows, Enter) and Settings' Save noticing the change
  (`select-check.mjs`, 13 checks).
- e10ea0a: Esc on an open list inside a dialog closed the dialog too (the styled list is part of
  the page): `useModalDialog` now leaves an open select's keys alone, so Esc closes the list
  and a second Esc the dialog (Block time, Open extra time, Edit hours: `dialog-escape.mjs`,
  14 checks with the focus ring; a Dialog unit test).
- 98d7e3a (Herman's follow-up): the sidebar stays put while the page scrolls, as tall as the
  window, its bottom links at the bottom of the screen (a very short window scrolls it
  inside); Add students' form and preview (968 px) sit in the middle of the space from
  1024 px. `sidebar-check.mjs`: every page's sidebar in place after scrolling, Record
  payment's column too, Log out reachable in a 420 px tall window, Add students at 390–1920
  px with no sideways scrolling.
- The last commit: Add students' back link stays at the top left; only the title, form and preview
  move to the middle (Herman, from a screenshot; `backlink.mjs` at 390–1920 px).
- ab08b39: Book, Schedule and My classes stop at 1100 px in the middle of the space beside
  the sidebar instead of on its left; Account takes the same 1100 px from 1280 px, in two
  columns (your details | password and home screen). Settings' two columns grow with the
  window up to 760 px each (1568 px), Save changes above their right edge. Phones and the
  1024–1279 px layouts are unchanged (screenshots at 390, 1024, 1280, 1440, 1920). DESIGN §3
  (Select) and §5.
**Decisions** (Herman chose "the page stops early" for both, over "the right column is short")
- Centre the customer pages rather than stretch them: the drawings' proportions stay, and every
  customer page's title sits at the same place. Settings grows instead, like the other coach
  pages, so its title doesn't move between coach tabs.
- The styled open list only with a mouse: a phone's own picker suits a finger, and iPhones
  can't style it anyway.
**Open issues**
- With the styled list, an arrow key on a closed select opens the list instead of changing
  the value straight away (Chrome's behaviour for it).
**Next**: Herman pushes these nine commits (as in v0.20 Next 1); then v0.20 Next 2–3
(PRODUCTION.md §1.1; send Claude the three values).

## v0.20 · 6 Oct 2026 · Prompt 12, part 1: the code for going live
**State**: `origin/main` = `origin/frontend-first` = 80c18ee (v0.19; Herman pushed it). Local
`frontend-first` has the six commits below and this entry, not pushed. There is no production
project yet: everything left in prompt 12 starts with Herman's steps in `docs/PRODUCTION.md`
§1.1. Scripts and results are in `frontend-plan/review/prompt12/` (outside the repo; its
`NOTES.md` lists them, with the §13 security checklist item by item).
- DIAGNOSE 1: unit 1,852 passed (demo mode; then the Account tests again, 18); `npm run
  test:db` 286 on dev; typecheck, lint, format and the production build pass; no secret key in
  `dist/` or in any of the 222 commits.
- DIAGNOSE 2 (TECH_SPEC §13): all ten items pass or are built, except what production itself
  switches on: CAPTCHA (PRODUCTION.md 1.5), the Auth email limit (1.3), the live headers
  (1.4) and the first backup run (1.7). `npm audit` had one build-tool advisory, fixed.
- DIAGNOSE 3: the domain is `swimclass.online` (bought, v0.2); its nameservers are
  Cloudflare's.
- PWA, in a browser: the Account page's Home screen section at 390 and 1280 px, also for the
  coach (`account-hint.mjs`, 10 checks); the production build under `wrangler dev` with its
  real headers: Chrome reads the manifest with no errors and finds nothing stopping installation,
  the icons are PNGs, nothing logged on /login, a deep link and an unknown asset path return
  the app (`pwa-check.mjs`, 15 checks). `wrangler deploy --dry-run` accepts the config.
**Done**
- e6a46db: `npm audit fix` (source-map-js 1.2.2).
- b61e7dd: `public/manifest.webmanifest`, `public/icons/` (192, 512, maskable 512,
  apple-touch-icon 180, drawn by `frontend-plan/tools/icons.mjs`), the iOS tags in
  `index.html`, `robots.txt`, and Account's "Home screen" section
  (`pages/account/ui/HomeScreenHint.tsx` + test).
- b589c22, f737bcc (the checkout, so the CLI reads `supabase/config.toml` for the Postgres
  version): `.github/workflows/backup.yml`. It can't run on this PC (no Docker): Herman's
  first "Run workflow" is its test (PRODUCTION.md 1.7).
- bacfe20: `wrangler.jsonc` attaches `swimclass.online` and turns `workers.dev` off.
- 31211da: `docs/PRODUCTION.md` (setup checklist, moving students in, smoke test, deploying,
  watching, backups and restore, rotating keys, limits); TECH_SPEC §11, §12, §14; ARCHITECTURE,
  CLAUDE.md, README.
- `frontend-plan/review/prompt12/prod-functions.env`: production's `MAIL_TOKEN` and
  `SITE_URL`, for PRODUCTION.md 1.2 and 1.6.
**Next**
1. Herman pushes: `git push origin frontend-first`; once CI is green,
   `git fetch . frontend-first:main` and `git push origin main` (one command per line). The
   backup workflow is then on `main`; until its secrets are set (1.7), its Sunday run fails
   with "Set the SUPABASE_DB_URL and BACKUP_AGE_RECIPIENT secrets first."
2. Herman: PRODUCTION.md §1.1, then give Claude `<prod-ref>`, the publishable key and the
   Turnstile site key (all three are public).
3. PRODUCTION.md 1.2 to 1.8 in order, Claude doing the Claude steps; then §2 (moving the
   students in); then prompt 12's VALIDATION (first load and Lighthouse on the live site, the
   backup run, the smoke test, Supabase usage) and HANDOFF v1.0.
**Decisions**
- One address, `https://swimclass.online`: it is `SITE_URL`, the only origin Auth's links and
  the functions' CORS allow. `wrangler deploy` attaches it (`routes` in `wrangler.jsonc`)
  instead of a dashboard step; `workers.dev` and preview URLs are off. `www` isn't attached
  (optional later: a redirect rule to the bare domain).
- Backups: the job downloads the Supabase CLI release that matches `package.json` and checks
  its checksum, instead of `npm ci`, so no package install script runs in the job that holds
  the database address. `age` comes from Ubuntu's packages. The dumps are plain only in the
  runner's temp folder; only `.age` files are uploaded.
- Restore note: download the artifact, `age --decrypt` with the private key, then into a new
  project: migrations (`db push`), `delete from public.settings`, and `psql ... --file
  data.sql` (PRODUCTION.md §5). Not with `schema.sql`: Supabase's schema dump leaves out the
  `auth` schema, and with it the sign-up trigger on `auth.users`. The data dump includes
  Auth's accounts, so customers keep their passwords.
- PWA: no service worker (nothing to cache, and no stale API data); `theme-color` is the
  accent, as in the manifest; the hint hides when the site is open from the home screen.
- The production `MAIL_TOKEN` was made by Claude into a file outside the repo and never
  printed.
**Open issues**
- The restore hasn't been rehearsed: the free plan has two projects (PRODUCTION.md §5.3).
- First load and Lighthouse on signed-in production pages need a signed-in browser, and with
  CAPTCHA on a script can't log in. Plan: Chrome started by hand with its own profile and a
  debugging port, Herman logs in once as the smoke-test customer, and the scripts attach.
- From v0.19, still open: an ack after its claim was released can send an email twice; the
  coach has no "send reset" button.
**Manual steps waiting on Herman**
- Next 1 and 2. Then PRODUCTION.md §1 in order.

## v0.19 · 6 Oct 2026 · Prompt 11: emails through Gmail
**State**: `origin/main` = `origin/frontend-first` = dfb35c5 (prompt 11's code and docs; Herman
pushed it, CI green on both). Local `frontend-first` has this entry on top, not pushed. Dev is
back to the seed: after the end-to-end test Herman uninstalled the Apps Script trigger, turned
dev's custom SMTP off, ran `db reset --linked` (the fingerprint matches, the outbox and
`daily_jobs` are empty, the seeded password is swim-test-2026 again), removed
`VITE_DEMO=false` and deleted the dev App Password. On `swimclass-dev`
Herman ran `npx supabase db push` (the new migration), `secrets set --env-file` (`MAIL_TOKEN`)
and `functions deploy mail-queue --use-api`: Claude Code's safety check refused the push
("Modify Shared Resources"). Typecheck, lint, format, the full unit suite (1,852, demo mode)
and `npm run test:db` (286 on dev: 265 + 21 in `emails.test.ts`) pass. The scripts and
results are in `frontend-plan/review/prompt11/` (outside the repo; its `NOTES.md` lists them).
- DIAGNOSE 1: the seed queues no email; the tests' rows (all rolled back) have the keys
  `booked:<series>`, `late:<booking>:booked|cancelled`, `cancelled:<booking>` and
  `broadcast:<announcement>:<account>`. Dev's outbox and `daily_jobs` were empty.
- DIAGNOSE 2: functions deploy and secrets work on dev (login, admin-accounts, `SITE_URL`);
  Herman runs them.
- DIAGNOSE 3: Herman has 2-Step Verification on; the site sends from `hlyy1011@gmail.com`.
- VALIDATION:
  - `tests/db/emails.test.ts`: at Fri 2 Oct 20:05 MYT, Sat 3 Oct's reminders for meiling
    (Aiman & Sofia 9:00 am, "Free to cancel or reschedule until 3:00 am, Sat 3 Oct."),
    farah and zulaikha and one digest "Tomorrow: 3 lessons, first at 9:00 am" with the
    travel gaps and Hana unpaid; again → nothing; not before 20:00 or once the day began;
    `digest_time` 21:00 → the digest only then; `coach_email` '' → no digest, job recorded;
    Hana paid → not unpaid; Wei Jie "collect RM 240" with a price set and Kai's 30-minute gap
    "(less than your usual 1 hour)"; Sofia's last paid lesson on Sun 4 Oct; a sign-up waiting
    by username, not the name typed; "Tomorrow: no lessons"; a customer's two lessons in one
    email, and "It starts in less than 24 hours, so it can't be cancelled.". claim/ack:
    priority order, cap 50, fresh claims not handed out, re-claim after 15 minutes as a failed
    try, 5 tries, 500 characters, 90-day deletion, service role only; `email_log` for herman,
    `not_coach` for meiling, no grant for anon. The tests clear Sat 3 Oct's real jobs and
    emails inside their own transaction.
  - `supabase/functions/mail-queue/mail.test.ts` (unit): both placeholders in an HTML link are
    replaced, the subject too, `{ {` left alone; tomorrow in Malaysia; the token check.
  - Live on dev (`live-mailqueue.mjs`, 23 checks, ALL OK): no token or a wrong one → 401
    `unauthorized`; GET → 405; bad bodies → 400; meiling's booking → claim returns the
    confirmation with `http://localhost:5173/my-classes` twice in the link and no
    `{{site_url}}`, marked claimed; claim again → nothing; ack → sent; ack again → 0; her
    cancellation claimed and not acked → after 15.4 minutes handed out again with attempts 1
    and "The mailer took it but didn't say whether it was sent."; ack → sent.
  - End to end on dev, after `db reset --linked` and `devpasswords.mjs` (the seeded accounts'
    password changed: none left on swim-test-2026), Gmail SMTP, the three templates and the
    Apps Script set up by Herman: Coach email → `hlyy1011@gmail.com`; Add students' invite for
    `p11.test` (`hlyy1011+p11@gmail.com`) arrived through Gmail SMTP and was used at 3:10 pm;
    a second click said expired, so the coach's `send_password_reset` sent "Reset your
    password" through Gmail, and Herman set the password with it. As p11.test he booked Tue
    6 Oct 7:30 pm (inside 24 hours) and Wed 7 Oct 6:00 pm: the late-change alert and both
    confirmations came from his Gmail (claimed and sent at 3:29 pm by a hand-run `poll`; the
    late alert first; the timer hadn't fired yet when Herman uninstalled it to look). Settings
    → Email log as herman, live: the three rows "Sent 3:29 pm" at 1440 and 390 px
    (`live-emaillog-*.png`), no sideways scrolling, no errors. With the trigger installed
    again, the coach cancelled the 7:30 pm lesson at 3:44 pm ("Testing the mailer"): the
    timer sent the cancellation at 3:48 pm on its own. At 8:03 pm the timer's poll queued
    Wed 7 Oct's jobs once each (`daily_jobs` reminder and digest at 20:03:16) and sent the
    reminder "Swim lesson tomorrow, Wed 7 Oct" (6:00–7:00 pm for Test Swimmer at Palm Court,
    "Free to cancel or reschedule until 12:00 pm, Wed 7 Oct.") to `+p11` and the digest
    "Tomorrow: 1 lesson at 6:00 pm" (with "Test Swimmer: collect payment (no 1-to-1 price in
    Settings)") to Herman; the polls in the next 40 minutes added nothing. Herman received
    every email.
  - Not exercised: `MailApp.getRemainingDailyQuota()` at 0. `poll` returns before claiming
    anything when it is 0 or less (read in `Code.gs`), so the rows stay queued.
**Done**
- 73567dd, migration `…20261006100000_mail_queue` (TECH_SPEC §5.5): `email_reminder`,
  `email_digest`, `queue_daily_emails`, `claim_outbox`, `ack_outbox`, `email_log`,
  `ringgit_text`, `duration_text`, an index on unsent emails; `tests/db/emails.test.ts`, the
  grant list in `rls.test.ts`, the database map.
- f390df3: Edge Function `mail-queue` (`index.ts`, `mail.ts` + test; the unit project now also
  runs `supabase/functions/**/*.test.ts`); `config.toml` `[functions.mail-queue]` verify_jwt
  off and the local Auth templates; `supabase/templates/` (confirm, invite, reset).
- 97e0551: `apps-script/Code.gs` (TECH_SPEC §8 plus `uninstall()`), `apps-script/README.md`.
- 0b08841: Settings shows the Email log (`EMAIL_LOG_AVAILABLE` gone, `database.types.ts`
  regenerated from dev).
- dfb35c5: TECH_SPEC §5.5 and §12, ARCHITECTURE, DEV_SETUP §5.
**Next**
1. Herman pushes this entry: `git push origin frontend-first`; once CI is green,
   `git fetch . frontend-first:main` and `git push origin main` (in PowerShell 5.1 one
   command per line: it has no `&&`).
2. Prompt 12 (deploy and go live), with the production email steps below.
**Decisions**
- The digest (Herman, 6 Oct 2026): unpaid and last-lesson lists cover only tomorrow's groups
  (the full list stays on Needs attention); it comes on days with no lessons too ("Tomorrow:
  no lessons"). What to collect is whole packages at the group's price ("collect payment"
  while the price isn't set). Waiting sign-ups: the count and the first ten usernames.
- `attempts` counts failed tries (a failed ack, or a claim with no answer for 15 minutes), so
  the Email log's "Waiting" / "Not sent: …" stay right as built. A job runs only from its time
  on the evening before until the day begins; the digest job is recorded even while
  `coach_email` is ''.
- `mail-queue` has no CORS and its own replies; the token is compared through SHA-256 digests.
  A failure of `queue_daily_emails` is logged and the claim still goes ahead.
- `MAIL_TOKEN` is set from a file (`secrets set --env-file`), so it never appears in a command.
- The Auth templates live in `supabase/templates/` (the local stack reads them through
  `config.toml`); the hosted projects get them pasted, with "Swim Class" replaced.
**Open issues**
- A username may contain dots (`bit.ly` is valid), and Gmail turns that into a link in the
  digest's waiting list. Low risk (the coach's own email); not changed.
- If an ack arrives after its claim was released (15 minutes), that email can go out twice.
- An invitation link works once; a customer whose link was used or expired can use Forgot
  password with their address (works for invited accounts; checked on dev). The coach has
  no "send reset" button in the app (`send_password_reset` is API only).
- `coach_email` must be set in production Settings, or there is no digest and no late alert.
- A new Apps Script timer first fires at a random moment within its interval: after `install`,
  allow up to 5 minutes (more the first time) before deciding it doesn't run; Executions
  shows the Time-Driven runs.
- Dev has no Gmail any more: Auth's built-in mailer again (team members only, a couple an
  hour). Connecting Gmail to dev again needs the seeded password changed first
  (`frontend-plan/review/prompt11/devpasswords.mjs`) and the disconnect afterwards.
**Manual steps waiting on Herman**
- Next 1.
- Production email (prompt 12), in this order:
  1. Google, signed in as `hlyy1011@gmail.com`: https://myaccount.google.com/apppasswords →
     App name `Supabase swimclass prod` → Create; copy the 16 letters (no spaces), once.
  2. Supabase prod → Authentication → Emails → SMTP Settings → Enable custom SMTP: sender
     email `hlyy1011@gmail.com`, sender name = the business name, host `smtp.gmail.com`, port
     `587`, minimum interval unchanged, username `hlyy1011@gmail.com`, password = the App
     Password → Save.
  3. Authentication → Rate Limits → Rate limit for sending emails: 25 an hour (check it after
     step 2, which may change it).
  4. Authentication → Emails → Templates: Confirm signup "Confirm your email"
     (`confirmation.html`), Invite user "Your swim lesson account" (`invite.html`), Reset
     Password "Reset your password" (`recovery.html`), each with "Swim Class" replaced by the
     business name; keep `{{ .ConfirmationURL }}` and `{{ .Data.username }}`.
  5. Authentication → URL Configuration: Site URL = the production site; Redirect URLs
     `https://<site>/**`.
  6. A new `MAIL_TOKEN` for prod (64 hex characters) in a file outside the repo; with the CLI
     linked to prod: `npx supabase secrets set --env-file <file>`, `SITE_URL` = the production
     origin, `npx supabase functions deploy mail-queue --use-api` (with `login` and
     `admin-accounts`); link back to dev afterwards.
  7. Production Settings: Coach email `hlyy1011@gmail.com`, Business name.
  8. Apps Script: Script Properties `MAIL_QUEUE_URL` = `https://<prod-ref>.supabase.co/
     functions/v1/mail-queue`, `MAIL_TOKEN` = the prod token, `SENDER_NAME` = the business
     name; run `poll` once, then `install`; Executions shows Time-Driven runs every 5 minutes.
- As in v0.13: before prompt 12, the coach on production with `make-coach.sql`, Turnstile and
  the `age` key pair.

## v0.18 · 6 Oct 2026 · Prompt 10: coach Settings validated on dev and in demo mode
**State**: `origin/main` = `origin/frontend-first` = 58211a4 (v0.17; Herman pushed it). Local
`frontend-first` has this entry on top, not pushed. Prompt 10 found every TASK item already
built: the page by the frontend waves (v0.6–v0.11), `update_settings` and `set_open_hours` by
prompt 04. No code changed. Dev holds the seed as loaded (Herman ran `seedshift.mjs forward`,
then `restore`; the fingerprint matches; `npm run test:db` 265 pass). Typecheck, lint, format
and the full unit suite (1,846, demo mode) pass. The scripts and results are in `frontend-plan/review/prompt10/` (outside the
repo; its `NOTES.md` lists them).
- DIAGNOSE 1 (`diagnose.mjs`, on dev, refusals only): every PRD §7 setting is a `settings`
  column (the weekly hours are `availability_rules`; `business_name`, `coach_email` and
  `payment_instructions` are extra). meiling's `update_settings` and `set_open_hours` →
  `not_coach`; herman's 27 bad inputs are refused by the database with the documented codes
  (gap 500, −1, "60" and 1.5; step 45; lengths [90] and []; 4 students; cutoff 73; window 0;
  21 lessons; 3 unpaid; a negative price; "24:00" and "25:00"; 2001 characters; a bad email;
  a null switch; `id`, `updated_at` and unknown keys → `unknown_setting {keys}`; end before or
  at the start → `invalid_range {index}`; overlapping Saturday ranges → `overlapping_rules
  {weekday: 6}`; weekday 8 → `invalid_rules {index}`). The row and the hours were identical
  afterwards, `updated_at` too.
- DIAGNOSE 2 (`diagnose2.md`): no hard-coded business numbers in `src/` or the SQL. Every
  setting is read from `usePublicSettings` / `useCoachSettings`, the database rows or, in SQL,
  the `settings` row; no fallback is a number. What looks like one isn't a setting: the week
  grid's 7 am–10 pm frame, the dialog's 5:00 am–11:00 pm and 15-minute grid, option lists
  that repeat the schema's checks, `interval '2 hours'` (the longest lesson), BR-35's 24 hours,
  BR-16's and the login limiter's abuse limits.
- VALIDATION in demo mode (`validate.mjs`, 68 checks, ALL OK; Lighthouse accessibility 100 at
  390 and 1280) and live on dev with the sample week moved 14 days (18 read-only checks, then
  39, ALL OK):
  - Travel gap 30 → "Settings saved"; meiling's Book on the shifted Tuesday, 1 hour: 7:00 pm
    becomes free (7:00–9:00 pm instead of 7:30–9:00 pm); back to 60, as before.
  - Saturday from 8:00 am (the Edit dialog, then Save) → Save sends the whole week (all nine
    ranges stored); Book's shifted Saturday loses the 7:00 am start and starts at 8:00 am;
    back to 7:00 am, as before.
  - A gap of 500 passes the form (it only checks digits) and the database refuses it: "Travel
    gap has a value that isn’t allowed. Check it and save again." under the field and near
    Save, focus on the field, nothing saved. `set_open_hours` with the end before the start →
    `invalid_range`. meiling: `/coach/settings` sends her to Book, both functions →
    `not_coach`.
  - The dialog refuses an end before the start, overlapping ranges and a range left on
    "Choose", and offers 5:00 am–11:00 pm only; a range stored outside those hours from
    elsewhere shows as stored and "Set Monday hours" says "Open hours must be between 5:00 am
    and 11:00 pm.". Save is off until a value differs ("60 " is 60); the change notes show
    while a value differs; leaving with changes asks "Leave without saving?".
  - Demo only: prices ("260.5" → 26050, shown "260.50", cleared → null), payment instructions
    (trimmed; meiling sees them on My classes), switches, times ("7:30 PM" → 19:30), lengths;
    the form's own words for "1.5" and "24:00"; the database's for a bad email; and the open
    hours plus gap 500 in one Save: "Your open hours were saved, but your other changes
    weren’t. Travel gap has a value…", the hours stored, the gap still to save.
  - The page matches `design/AdminSettings.dc.html` at 1440 px and `AdminSettingsPhone.dc.html`
    at 390 px (known differences in NOTES: Save off until a change, the chip format, "Not set"
    for [PRICE], expiry off, the booking-confirmations words). Two columns from 1280 px, one
    up to 760 px below, the Save bar above the tab bar under 768 px; no sideways scrolling at
    360–1920 px.
**Done**
- Nothing in the repo but this entry: prompt 10's TASK was already built and passes.
**Next**
1. Herman pushes `frontend-first` (`git push origin frontend-first`); once CI is green,
   `git fetch . frontend-first:main` and `git push origin main`.
2. Prompt 11 (emails through Gmail). Nothing reads `reminder_time` or `digest_time` yet: the
   prompt builds the reminders and digest that use them (BR-32, BR-33). Dev's `email_outbox` has no
   unsent rows (6 Oct: `restore-dry` found none to delete).
**Decisions**
- No `db reset --linked` after the live run: it changed only the travel gap and Saturday's
  hours, each put back through the page, and checked the `settings` row and
  `availability_rules` before and after over a read-only connection. The fingerprint leaves
  out `updated_at` and the rules' ids, so `restore` alone brought the seed back. Later live
  checks of settings can do the same.
- Live checks never click a time on Book (BR-35 would alert Herman for a lesson within 24
  hours); reading the free times is enough.
**Open issues**
- "Lesson reminder to customers · Sent the evening before" (the drawing's words) reads oddly
  if Herman picks a morning `reminder_time`; the reminder is still sent the day before (BR-32).
- From v0.17: Supabase's own mailer allows a couple of emails an hour until prompt 11's Gmail
  SMTP; `send_password_reset` with an `sb_secret_` key and an invite to a non-team address (500
  `unknown`, v0.13); demo-mode dates use the real date, not `DEMO_NOW`; `dist/` is wired to
  `swimclass-dev`: never deploy it.
**Manual steps waiting on Herman**
- Next 1.
- As in v0.13: dev's Auth URL settings (DEV_SETUP §5); before prompt 12, the coach on
  production with `make-coach.sql`, Turnstile and the `age` key pair.

## v0.17 · 5 Oct 2026 · Prompt 09: Students & payments, Add students, approvals
**State**: `origin/main` = `origin/frontend-first` = cb9f0d4 (v0.16; Herman pushed it). Local
`frontend-first` has prompt 09's commits and this entry on top, not pushed. On `swimclass-dev`
Herman ran `npx supabase db push` (the new migration) and `npx supabase functions deploy
admin-accounts --use-api`: Claude Code's safety check refused both to the session this time
("Modify Shared Resources"). The frontend waves had built both screens (v0.6–v0.11); prompt 09
added the two missing backend pieces and checked everything on the real backend. Dev holds the
seed as loaded: after the live checks the unit suite ran against dev by mistake (Done, f1039da)
and Herman reloaded it (`npx supabase db reset --linked`); the fingerprint matches. Typecheck,
lint, format, the build and the full unit suite (1,846, demo mode) pass; `npm run test:db` 265 pass on dev
(262 + 3 new).
The scripts and results are in `frontend-plan/review/prompt09/` (outside the repo; its
`NOTES.md` lists them).
- DIAGNOSE 1 (`diagnose.mjs`, read-only): herman's `group_balance` through the API and the
  same view over SQL at the same moment are identical for all 13 groups.
- DIAGNOSE 2: meiling gets `not_coach` from `create_group`, `record_payment`,
  `add_free_lesson`, `excuse_booking`, `update_group`, `set_group_active`, `approve_account`
  and `pending_accounts`, and 403 `not_coach` from `admin-accounts` (`create_account`,
  `delete_account`). herman's `delete_account` answers 404 `not_found` for a made-up id and
  409 `account_approved` for meiling.
- DIAGNOSE 3: as built. `shared/ui` Table, Tabs (the filter strip, `?filter=`), SidePanel
  (Record payment beside the table from 1280 px, a drawer below), Figure, SegmentBar, Pill and
  Tag; `pages/coach-students/ui` PackagesTable, PackageCards, StudentsFigures, PaymentPanel,
  HistoryDrawer, WaitingAccounts. Other screens open the panel by address:
  `coachStudentsPay(groupId)` → `?pay=<group>` (the Schedule's Needs attention),
  `coachStudentsHistory` → `?history=<group>` (the "that group" links), and Add students
  returns with `?added=<group>` and router state (no email in the address).
- VALIDATION in demo mode (`validate.mjs`, 81 checks, ALL OK) and live on dev with the sample
  week moved 14 days (the same script on Herman's 5173 with `VITE_DEMO=false`, 70 checks, ALL
  OK; the PC had too little memory for a second server):
  - The table matches `group_balance` for all 13 groups (TECH_SPEC §10 on the shifted
    Saturday): figures "2 Unpaid · Hana, Wei Jie", "2 On last lesson · Priya, Sofia",
    "15 Students · 13 packages"; tabs All 13, Unpaid 2, Last lesson 2, Paid 11; needs-action
    first; search by student and by account.
  - Record payment for Hana: "1-to-1 · Package 6 · 4 lessons", no price set so the
    `price_not_set` words and the coach types the amount, a future date refused
    (`invalid_date`); Save payment → "Payment saved", her row turns Paid with History, and she
    leaves Unpaid and the Schedule's Needs attention.
  - The panel beside the table at 1280 and 1440 px, a drawer at 768 and 1024, full screen at
    390; History has Payments, Lessons and Group.
  - Add students for zulaikha: 1-to-3 with Hakim, Iman and Zara → `?added=`, "3 students
    added.", the row highlighted; on her Book, "Who’s this lesson for?" lists them with the
    1-to-3 tag. The same students again → `duplicate_group` with "that group" → its History.
    A typed name equal to one of the account's students reads "Existing student".
  - The new group's location and starting balance edited, deactivated and reactivated;
    deactivating Hana is refused ("This group has 2 upcoming lessons…").
  - Waiting for approval, live on 5173 (`accounts-live.mjs`, with Herman's address): the Sign
    up page as a visitor → "Confirm your email"; herman sees Test Signup p09.signup with the
    email and "Not confirmed" (table and phone card) and on Needs attention; Remove →
    "Sign-up removed." and the Auth user is gone. Then Add students → Create a new account…
    with the same address: "Student added · Invite sent to …", the account approved and not
    waiting; Herman clicked the invite, chose a password on /reset-password and saw "New
    password saved. You’re signed in as p09.invite." (the address confirmed, signed in).
    Supabase's own mailer refused the invite three times first (429, DESIGN §6's words,
    nothing created): it allows a couple of emails an hour until prompt 11.
  - No sideways scrolling on either page at 360–1920 px. Lighthouse accessibility 100 on both
    at 390 and 1280 px, live.
**Done**
- 97175ff, migration `…20261005100000_pending_accounts`: `pending_accounts()`, coach only,
  security definer, granted to `authenticated`: the customers with `approved = false`, oldest
  first, with `account_email` and `email_confirmed`. Never a view over `auth.users`. Database
  tests in `groups.test.ts`, the grant list in `rls.test.ts`, the database map.
  `database.types.ts` regenerated from dev afterwards: identical to the hand edit.
- f613513, `admin-accounts` `delete_account {account_id}` → `{ok: true}`: `auth.admin.deleteUser`
  for a customer still waiting for approval with no groups (`not_found` 404,
  `account_approved` 409, `has_groups` 409; the checks read as the coach). Demo mode's
  stand-in refuses the same way. `usePendingAccounts` reads `pending_accounts()` (its own
  query, `accountKeys.waiting()`); the Waiting list always has the Email column and phone cards
  say "Not confirmed" too; Remove is on (`REMOVE_SIGN_UP_AVAILABLE` is gone). TECH_SPEC §5.3,
  §7, ARCHITECTURE §4.2, §4.3.
- a964fea: TECH_SPEC §10's expected balances list all 13 groups (Daniel, Aina, Nurul were only
  in the seed and the tests).
- f1039da: the unit tests always run in demo mode. After `restore`, while `.env.local` still
  had `VITE_DEMO=false` for the live checks, the session ran the full unit suite, and Vitest
  read that too: for six minutes the tests booked, cancelled and excused seed lessons, recorded
  payments, made groups, posted announcements, added Block time and changed settings and names
  on swimclass-dev (`frontend-plan/review/prompt09/damage.log`). No real person was emailed:
  the outbox rows were to @example.com and unsent, and the sign-ups hit Auth's 429. Herman
  reloaded dev; mode `test` now means demo mode whatever `.env.local` says (checked with
  `VITE_DEMO=false` still set). DEV_SETUP §5 says so next to the `VITE_DEMO=false` step.
**Next**
1. Herman pushes `frontend-first` (`git push origin frontend-first`); once CI is green,
   `git fetch . frontend-first:main` and `git push origin main`.
2. Prompt 10 (coach Settings). Live checks: the same forward, check, restore loop. Settings
   edits change seed rows (`settings`, open hours) that `restore` can't undo: put each value
   back, or have Herman reload dev (`npx supabase db reset --linked`) afterwards.
**Decisions**
- The two new refusals' words (DESIGN §6, proposed for Herman's OK): `account_approved` "This
  account is already approved, so it can't be removed. Refresh to see the latest.";
  `has_groups` "This account has a group of students, so it can't be removed. Approve it
  instead."
- `delete_account`'s groups check is load-bearing: groups go with the profile (on delete
  cascade) but their bookings and payments don't, so an account with a group is never deleted.
- `has_groups` was checked in the database-backed demo mode and the unit tests, not live: it
  needs a waiting account with a group, and a second sign-up needs a second team address.
- With too little memory for a second Vite server, live checks ran on Herman's 5173 with
  `VITE_DEMO=false` (`admin-accounts` and the invite links need that origin anyway). Put
  `.env.local` back before running anything else.
**Open issues**
- Supabase's own mailer allows only a couple of emails an hour (429
  `over_email_send_rate_limit`) until prompt 11's Gmail SMTP: the live invite waited for it.
- From v0.13: `send_password_reset` with an `sb_secret_` key; an invite to a non-team address
  (500 `unknown`). (The reload emptied dev's `email_outbox`: v0.15's 10 unsent rows are gone.)
- In demo mode a sign-up's date and a payment's `created_at` are the real date, not `DEMO_NOW`.
- `dist/` is this session's `npm run build`: no demo code, wired to `swimclass-dev`; never deploy
  it, prompt 12 builds the real one.
**Manual steps waiting on Herman**
- Next 1.
- As in v0.13: dev's Auth URL settings (DEV_SETUP §5); before prompt 12, the coach on
  production with `make-coach.sql`, Turnstile and the `age` key pair.

## v0.16 · 5 Oct 2026 · Prompt 08: coach Schedule validated on dev and in demo mode
**State**: `origin/main` = `origin/frontend-first` = 174aafc (v0.15; Herman pushed it). Local
`frontend-first` has one fix and this entry on top, not pushed. Prompt 08 found every TASK item
already built by the frontend waves (v0.6–v0.11) and checked it on the real backend. Dev holds
the seed as loaded (fingerprint matches; `npm run test:db` 262 pass before and after).
Typecheck, lint, format, the build and 1,840 unit tests pass. The scripts and results are in
`frontend-plan/review/prompt08/` (outside the repo; its `NOTES.md` lists them).
- DIAGNOSE 1 on `swimclass-dev`: herman logs in through `login`; `coach_week` gives the
  documented days (open, closed, exceptions, lessons with travel minutes, package position,
  `unpaid`, `last_lesson`, `gap_override`); Kai's Fri 2 Oct lesson has travel 0/60 and Wei
  Jie's 60/0. With the week shifted, through the API: `coach_book` (no email queued),
  `add_exception` (shows in `coach_week` as extra open time), `post_announcement` with
  `p_send_email` false (no email), then `remove_exception`, `remove_announcement` and the
  coach's `cancel_booking` (one "cancelled" email to the customer, no late alert).
- DIAGNOSE 2: meiling gets `not_coach` from `coach_week`, `coach_slot_check`, `coach_book`,
  `add_exception`, `remove_exception`, `post_announcement`, `remove_announcement`,
  `approve_account` and `excuse_booking`; `slot_check` has no grant (404).
- DIAGNOSE 3: as built (DESIGN §4, `shared/ui/WeekGrid`): 56 px an hour (28 px rows of 30
  minutes) from 7 am to 10 pm, longer when the week's open hours or lessons fall outside it.
- VALIDATION in demo mode (`validate.mjs`, 79 checks, ALL OK) and live on dev with the
  sample week moved 14 days (the same script, 82 checks, ALL OK):
  - The drawn week at 1440 px matches `design/AdminSchedule.dc.html` (`compare-demo-1440.png`):
    header actions, week navigation with Today, legend, lesson blocks ("1-to-2 · Palm Court",
    "Vista Heights" for 1-to-1, Chloe's "2 lessons", Kai's "Gap override"), travel before Wei
    Jie and none between Wei Jie and Kai, closed blocks, the 320 px side column to the edge.
    At 390 px the day view matches `AdminSchedulePhone.dc.html` block by block for Sat 26 Sep
    and Sat 3 Oct, with Today, Needs attention and Message below. No sideways scrolling at
    360–1920 px; the day view under 768, the grid from 768, the side column from 1280.
  - Today for Sat 26 Sep (demo clock): Ethan 9:00 am "done", Aiman & Sofia 5:00 pm, Hana
    7:30 pm (also `CoachSchedulePage.test.tsx`). Live, Today matched `coach_week` for Mon 5 Oct
    ("No lessons today."). Needs attention: Hana and Wei Jie unpaid with Record payment
    (`/coach/students?pay=<group>`), Priya and Sofia on their last paid lesson.
  - Open extra time Wed 3:00–5:30 pm: meiling's Book offers 3:00 and 4:00 pm that day, and a
    week later starts at 5:30 pm. Block time Mon 7:00–9:00 pm: nothing from 7:00 to 8:30 pm
    ("Your coach isn’t available 7:00–9:00 pm."), the next Monday still has 7:00 pm. Both
    removed from the week's list; the weekly hours unchanged. Blocking over lessons warns
    "These lessons stay booked".
  - Add booking at 3:00 pm on a weekday: "It’s outside your open hours…" with Book off; with
    "Outside open hours" on it books, and no email is queued. Another group at 3:30 pm with
    both toggles on: "It overlaps another lesson at 3:00–4:00 pm." and Book stays off. Wei Jie
    (can still book 1), 2 weeks: "This group can book 1 more lesson before paying…", then
    "Book anyway" books both (can still book −1).
  - Lesson details (group, account, location, package position, balance); Cancel lesson with a
    reason (500 characters): the booking is cancelled, the balance restored, one "cancelled"
    email to the customer with the reason, no late alert. A test lesson booked yesterday offers
    Mark as excused and then uses nothing; a future one doesn't offer it.
  - Message all customers (1000 characters, pinned): the pinned list shows it, meiling sees the
    banner on Schedule and My classes, and live queued 12 "broadcast" emails, one per approved
    customer with a confirmed or invited address; Remove takes the banner down. Approve
    (demo only): "Siti Aminah approved."
- Lighthouse accessibility on `/coach/schedule`: 100 at 390 and 1280 in demo mode; live 100
  at 1280 and 96 at 390 (Decisions).
**Done**
- The coach's day buttons are named by their own words: "Sat 3, 3 lessons" for the text
  "Sat 3 3 lessons" (DayStrip puts a space before the caption), "Sat 3" while the week loads
  (v0.14's open issue; Lighthouse's `label-content-name-mismatch`). The grid's day lists keep
  "Saturday 3 Oct, 3 lessons". Nothing moves on screen: the phone strip's screenshots before
  and after are byte-identical at 390 and 360 px.
- Prompt 08 now says Today has no Unpaid flag (Decisions).
- `frontend-plan/review/prompt06/seedshift.mjs restore` also deletes the announcements,
  Block time / Open extra time ranges and unsent emails made since `forward` (the coach's
  Remove only hides a message, and the fingerprint counts them), and `restore-dry` runs the
  same steps rolled back. Herman ran `forward` and `restore`: 5 test bookings, 2 messages and 14
  unsent emails went, and the fingerprint matches. Its first rename ran too
  (`shift-started-at.2026-10-05T01-53-18-617Z.txt`), so the next `forward` notes a fresh time.
**Next**
1. Herman pushes `frontend-first` (`git push origin frontend-first`); once CI is green,
   `git fetch . frontend-first:main` and `git push origin main`.
2. Prompt 09 (students and payments). Live checks can use the same loop: Herman runs
   `seedshift.mjs forward`, Claude runs its checks and `seedshift.mjs restore-dry`, Herman runs
   `restore`, Claude runs `npm run test:db`. `restore` now also deletes the payments, groups,
   students and accounts made since `forward` (deleting an account's login removes its
   profile); `seedshift.mjs selftest` makes one of each in a rolled-back transaction and
   checks that the fingerprint matches after the deletes. It can't undo an edit to a seed
   row, so live checks edit only what they made (the new group's location, a lesson the
   check booked yesterday), and record payments as new rows.
**Decisions**
- Today has no "Unpaid, collect today" and no "first lesson of Package 6": Herman dropped them
  on 2 Oct 2026 (DESIGN §4, v0.10); the prompt's VALIDATION predates that.
- Lighthouse's `target-size` at 390 px live: on the unshifted week, Wei Jie's Record payment
  link starts 3 px under the sticky tab bar at the first scroll position and scrolls clear, as
  Book's chips under its sticky summary (v0.14).
- The coach's day-button names drop the month ("Sat 3, 3 lessons"): a name must contain what the
  button shows for someone using speech, and the week above the strip names the month.
- Live checks change only what `restore` deletes: the coach books test lessons and cancels or
  excuses those, and removes what it adds. Approving an account stays in demo mode (dev has no
  account waiting, and a sign-up can't be undone).
**Open issues**
- In demo mode a message's "Posted" date and a sign-up's date are the real date, not
  `DEMO_NOW` (`now()` defaults in PGlite). Live they are right.
- From v0.15: dev's `email_outbox` holds 10 unsent rows from prompts 06 and 07 (this session's
  went with `restore`); delete them before `mail-queue` runs on dev (prompt 11). From v0.13:
  `send_password_reset` with an `sb_secret_` key, the invite to a non-team address (500
  `unknown`).
- `dist/` is now this session's `npm run build`: no demo code, but wired to `swimclass-dev`
  from `.env.local`, with no Turnstile key. Still never deploy it; prompt 12 builds the real one.
**Manual steps waiting on Herman**
- Next 1.
- As in v0.13: dev's Auth URL settings (DEV_SETUP §5); before prompt 12, the coach on
  production with `make-coach.sql`, Turnstile and the `age` key pair.

## v0.15 · 5 Oct 2026 · Prompt 07: Schedule, My classes and Account validated on dev and in demo mode
**State**: `origin/main` = `origin/frontend-first` = cf60234 (v0.14; Herman pushed it). Local
`frontend-first` has only this entry on top, not pushed. Prompt 07 needed no code changes:
the frontend waves built every TASK item (v0.6–v0.11), and this session checked them on the
real backend. Dev holds the seed as loaded (fingerprint matches; `npm run test:db` 262 pass
before and after). The scripts and results are in `frontend-plan/review/prompt07/` (outside
the repo; its `NOTES.md` lists them).
- DIAGNOSE 1 on `swimclass-dev` (`diagnose.mjs`, read-only, after `test:db`): meiling logs in
  through `login`; `get_public_settings` (cutoff 6 hours, window 4 weeks, no payment
  instructions yet), `group_details`, `group_balance`, `booking_ledger` (her 3 lessons),
  `bookings` (RLS: hers only) and `week_busy` for the sample week and this week (only the
  documented keys; no names, locations or other ids; `booking_id` and `group_id` only on
  hers; a null week gives `invalid_week`). `cancel_booking` was called only where it refuses,
  so nothing changed: a made-up id and weijie's lesson give `not_your_booking`; her own Sat
  3 Oct lesson, past its cutoff, gives `locked` {`cutoff_at`: "2026-10-03T03:00:00+08:00"}
  and is still booked afterwards.
- DIAGNOSE 2: reused from prompt 06: SegmentBar (the package bar), PackageSummary
  (`variant="account"`), Tag, Dialog, WeekNav, CoachBanner. Already built for prompt 07:
  WeekGrid in `shared/ui`; CustomerWeekGrid, CustomerWeekText, CustomerScheduleLegend and
  `useCustomerWeek` in entity `schedule`; LessonRowLayout, PastLessonRow, HistoryLessonRow,
  `useUpcomingLessons` and `usePastLessons` in entity `booking` (the prompt's LessonRow is
  LessonRowLayout plus `pages/my-classes/ui/UpcomingLessonRow`); `features/cancel-lesson`,
  `update-profile`, `change-password` and `log-out`.
- VALIDATION in demo mode (`validate.mjs`, 99 checks, ALL OK):
  - Schedule opens on this week with Previous disabled; Next stops after 4 weeks
    (`booking_window_weeks`); a `?week=` before or past the window snaps to it. The sample
    week as meiling matches `design/Schedule.dc.html` block by block, per day and kind:
    closed, other people's lessons as Booked with no text, travel, hers as "You" (Sat
    9:00 am, Sun 5:00 pm). Travel shows only inside open time: none before Priya's Tue
    5:30 pm lesson, none between Wei Jie and Kai on Fri 2 Oct. The hidden list reads each
    day ("Tue 29 Sep: free 7:30 pm to 10:00 pm", "Thu 1 Oct: no free time"); the legend and
    the note are there; days from today link to `/book?day=…` (past days are plain); Tab
    reaches the week buttons and the day links with a focus ring, and Enter on Tue opens
    Book on Tue.
  - My classes lists one row per lesson in `booking_ledger` that hasn't ended, in order,
    each with "lesson N of 4" from the ledger ("Package 3, lesson 1 of 4" for a later
    package), the location and the deadline: "Today, 5:00–6:00 pm … Locked" with "Under 6
    hours to go…", and "Free to cancel until 3:00 am, Sat 3 Oct." `cancel_booking` called
    directly on the Locked lesson gives `locked`, and it stays booked. Packages match
    `group_balance` for both groups ("Package 2 · 3 used · 1 booked · fully booked"), with
    the paid date and method. With prices and payment instructions set as the coach (the
    seed has none), Sofia's note reads "… Pay RM 240 before or at its first lesson." in
    #9A3412, and How to pay shows the instructions.
  - Cancel by keyboard: Tab to "Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia", Enter,
    and the confirmation has the prompt's words with focus inside; Escape returns focus to
    the button; "Cancel lesson" shows the notice, the row goes, the booking is cancelled,
    the package counts drop, and Book shows 9:00 am free. A lesson cancelled behind the
    open confirmation answers `not_booked` in DESIGN §6's words ("This lesson is no longer
    booked. Refresh to see the latest.") with Close, and the list refreshes. "Past lessons
    and receipts" starts collapsed (`aria-expanded`) and lists the cancelled lessons and
    the payments.
  - Account: Name and Phone are editable, the username and email are text; a new phone
    survives a reload; "Save new password" works and meiling signs in with it; Log out
    ends on Log in. The coach's pinned announcement shows at the top of Schedule and My
    classes.
  - No sideways scrolling on the three pages at 360–1920 px, and at 390 × 844 the tab bar
    leaves the last item clear. The screens match the drawings at 390 and 1280 px
    (`demo-*.png`); the differences are the seed's "Palm Court" (drawn "Palm Court pool")
    and the business name.
- Lighthouse accessibility is 100 on `/schedule`, `/my-classes` and `/account` at 390 and
  1280 px, in demo mode and live.
- Live on dev before the shift (`live-readonly.mjs`, read-only): no console errors, the
  `week_busy` bodies hold no names, Packages match `group_balance`, and Past shows her three
  seed lessons as Done.
- VALIDATION live on dev, the sample week moved 14 days (Herman ran `seedshift.mjs forward`
  and `restore`): the same `validate.mjs`, 94 checks, ALL OK. The 9 `week_busy` responses in
  the browser hold no names, usernames or locations. meiling booked Tue 13 Oct 7:30 pm (Aiman
  & Sofia) and Wed 14 Oct 5:30 pm (Sofia) and cancelled both: one by keyboard on the screen
  (7:30 pm was then free on Book), one behind the open confirmation (`not_booked`). The only
  failed request was that `not_booked` (HTTP 400, which Chrome logs as an error). The first
  of two runs flagged two things in the script, not the app (Decisions). `restore` deleted
  the 4 test bookings and their 8 `booking_changes` rows; the fingerprint matches and
  `npm run test:db` passes (262).
- The test on the JSON that the prompt asks for was already there:
  `tests/db/availability.test.ts`, "contains no names, locations or other accounts’ ids"
  (prompt 03).
**Done**
- This entry. No code changes.
**Next**
1. Herman pushes `frontend-first` (`git push origin frontend-first`); once CI is green,
   `git fetch . frontend-first:main` and `git push origin main`.
2. Prompt 08 (coach schedule). Its live checks can use the same forward, validate, restore
   loop (v0.14 Next 3). `forward` keeps an existing `shift-started-at.txt` and `restore`
   uses its time, so `seedshift.mjs restore` now renames that file on success (adding the
   time) and the next `forward` notes a fresh one. That rename hasn't run yet: prompt 08's
   `restore` is its first use (this session moved the file by hand).
**Decisions**
- The Locked row was checked in demo mode only. Live, a lesson inside the 6-hour cutoff would
  have to start today, and booking a lesson in the next 24 hours queues the coach's
  late-change alert (BR-35) to Herman's real address. The live `locked` refusal is
  DIAGNOSE's.
- A group shows Unpaid on My classes when no payment covers its current package, even with
  `group_balance.unpaid` false (live before the shift: Sofia has used 8 of 8 paid, and
  Package 3 isn't paid). That is BR-22 (`owesPayment`), as built. While a group owes, the
  Unpaid pill takes the place of the paid date; the first live run's check expected the
  date, and its other flag was the provoked `not_booked` 400.
- Live checks never cancel a seed booking: `restore` deletes only bookings made since
  `forward`, so a cancelled seed booking would keep the fingerprint from matching. Later
  prompts' live checks should book their own lessons and cancel those.
**Open issues**
- Dev's `email_outbox` holds 10 unsent rows from the live checks (prompt 06: 2 "booked";
  prompt 07: 4 "booked", 4 "cancelled"), all to meiling@example.com; `restore` doesn't touch
  the outbox. Delete the unsent rows before `mail-queue` runs on dev (prompt 11).
- From v0.14: the coach's day buttons run the date and caption together (prompt 08). From
  v0.13: `send_password_reset` with an `sb_secret_` key, the invite to a non-team address
  (500 `unknown`), `dist/` holding a demo build (never deploy it).
**Manual steps waiting on Herman**
- Next 1.
- As in v0.13: dev's Auth URL settings (DEV_SETUP §5); before prompt 12, the coach on
  production with `make-coach.sql`, Turnstile and the `age` key pair.

## v0.14 · 5 Oct 2026 · Prompt 06: Book validated on dev and in demo mode
**State**: `origin/main` = `origin/frontend-first` = 892ade5 (v0.13; Herman pushed it). Local
`frontend-first` has this entry and two small fixes on top, not pushed. Dev holds the seed
as loaded again (fingerprint matches; `npm run test:db` 262 pass). Typecheck, lint and
format pass. The full run of both Vitest projects (2,102 tests, the database ones on dev) had
5 failures, all fixed below: one test expecting the old DayStrip text, and 4 login-limit
database tests; those files now pass (142 unit tests, 19 database tests). Book was built in the
frontend waves (v0.6–v0.11); prompt 06 found every TASK item already there and checked it on
the real backend. The scripts and results are in `frontend-plan/review/prompt06/` (outside
the repo).
- DIAGNOSE on `swimclass-dev` (`diagnose.mjs`, read-only): meiling logs in through `login`;
  `get_public_settings` gives one row, `group_details` her two active groups,
  `group_balance` both balances, `week_slots` this week's and next week's starts.
- Components and hooks: Segmented, OptionRow, DayStrip, Chip, SegmentBar and Tag in
  `shared/ui`; GroupPicker, PackageSummary, TimeChipGrid in their entities; BookingSummary in
  `features/book-lesson`. TASK 1's hooks: `usePublicSettings`, `useMyGroups`,
  `useAccountBalances` (the prompt's `useGroupBalance`), `useWeekSlots`,
  `useLatestAnnouncement`.
- Today's MYT date is `mytDateKey(useNow())` (the real clock; `DEMO_NOW` in demo mode), the
  week starts on its Monday (`mytWeekStart`), and `bookableWindow` gives this week plus
  `booking_window_weeks` more, ending on a Sunday.
- On dev with demo mode off (Vite on 5290, signed in with Auth directly because `login`'s
  CORS allows only 5173): Book loads for meiling with every call going to Supabase and no
  errors; the day strip and chips are identical with the browser in Malaysia, Los Angeles and
  Auckland time (`live-tz.mjs`); Lighthouse accessibility is 100 at 390 and 1280 px.
- VALIDATION in demo mode (`validate.mjs`, the same migrations and seed in PGlite; 30 checks,
  ALL OK, and again with the browser in Los Angeles time): Tue 29 Sep 1 hour frees 7:30–9:00
  pm and crosses out 5:30–7:00 pm; 7:00 pm shows "7:00 pm isn’t available" and the gap_after
  words, and Book is disabled; 2 hours frees 7:30 and 8:00 pm, and Thursday is fully booked;
  Sofia shows "New bookings start Package 3."; booking 7:30 pm for Aiman & Sofia by keyboard
  only (Tab to the chip, Space, Tab to Book, Enter) shows the confirmation, and 7:30 pm then
  reads "It overlaps Aiman & Sofia’s lesson at 7:30–8:30 pm."; a start taken between picking
  it and pressing Book comes back from `book_lesson` as `overlap_mine` in words; "Repeat
  weekly for 5 weeks" from Sun 27 Sep refuses with `repeat_conflict` naming Sun 4 Oct; no
  sideways scrolling at 360, 390, 768, 1024, 1280, 1440 and 1920 px.
- Lighthouse in demo mode: 96 at 390 px, 100 at 1280. The 4 points are `target-size`: at
  390 × 844 the chips start under the sticky booking summary, as drawn; scrolling brings every
  chip and the help line clear of it (`footer-overlap.mjs`).
- Unit tests for the reason messages, the repeat label and the week start were already there
  (`messages.test.ts`, `repeatWeeks.test.ts`, `time.test.ts`, `bookableWindow.test.ts`).
**Done**
- DayStrip: a space between the weekday and the date, so a day's text reads "Mon 5" and its
  label "Mon 5 Oct, …" contains it (WCAG 2.5.3; Lighthouse's label-in-name check). Nothing
  moves on screen: Book's screenshots before and after are byte-identical at 390 and 1280
  px. Three tests read the day buttons' text and now expect the space. The coach's day
  buttons still run the date and caption together ("Mon 28" then "1 lesson"); look at that
  with prompt 08.
- `tests/db/login.test.ts`: each test starts with no login tries (deleted inside its own
  transaction, so rolled back). The tests count every row for a username, and real logins
  on dev leave rows for a day: prompt 05's validation and this session's DIAGNOSE left 6
  for meiling, so 4 tests failed until the rows aged out.
- Prompt 06's Sofia bullet now says what the database does (Decisions).
- VALIDATION live on dev, the same `validate.mjs` with the sample week moved 14 days (to Mon
  12 Oct): all 30 checks pass, with real bookings (Aiman & Sofia Tue 13 Oct 7:30 pm by
  keyboard only; Sofia Wed 14 Oct 5:30 pm behind the screen) and both refusals in words
  (`overlap_mine`; `repeat_conflict` naming Sun 18 Oct). Chrome logs each refusal as "Failed
  to load resource: 400": PostgREST answers a refusal with HTTP 400 and
  `{code: "P0001", message: "overlap_mine", details: "<json>"}` (`check-400.mjs`), which is
  what `toAppError` reads. Claude Code's safety check refused to let the session move dev's
  data, so Herman ran `seedshift.mjs forward` and `restore` with `!`. After `restore`, the seed
  fingerprint matches again and `npm run test:db` passes (262).
**Next**
1. Herman pushes `frontend-first` (`git push origin frontend-first`); once CI is green,
   `git fetch . frontend-first:main` and `git push origin main`.
2. Prompt 07.
3. To run live booking checks again later (prompt 07's, say), about 10 minutes, Monday to
   Friday (shifted lessons from the sample Saturday must still be ahead), `forward` and
   `restore` in one sitting (`npm run test:db` fails while the week is shifted):
   - Claude starts the live server from the swimclass folder:
     `VITE_DEMO=false node ../frontend-plan/review/prompt06/serve-live.mjs` (port 5290).
   - Herman runs, with `!` in Claude Code:
     `D:/DOWNLOAD/node.exe D:/DOWNLOAD/Swimming/frontend-plan/review/prompt06/seedshift.mjs forward`
     (the sample week moves to next week).
   - Claude runs `MODE=live node validate.mjs` in that folder (it reads how far the week
     moved).
   - Herman runs the same command with `restore`: it deletes only the bookings made since
     `forward`, moves the week back, and commits only if the seed fingerprint then matches.
     If it prints "rolled back", the week stays shifted: tell Claude, who looks at what else
     changed on dev before anything is reset.
   - Claude runs `npm run test:db`.
**Decisions**
- Sofia's Tue 29 Sep lesson: the prompt said the summary would read "uses Package 3, not
  paid yet". The ledger numbers lessons by start time, so Tuesday takes Package 2's last
  lesson and her Sunday lesson moves into Package 3, and Book says "uses 1 lesson from
  Package 2 · Package 3 isn’t paid yet" (TECH_SPEC §10; Herman's answer to triage 1–2 in
  v0.10). The prompt now says so.
- Lighthouse's `target-size` at 390 px stays: the summary is sticky by design (DESIGN §4,
  `design/Main.dc.html`) and every chip can be scrolled clear of it.
**Open issues**
- The first live Vite run in this session re-optimised the shared `node_modules/.vite`
  before it moved to its own cache. If Herman's `npm run dev` on 5173 acts oddly, stop it
  and start it again.
- From v0.13: `send_password_reset` with an `sb_secret_` key, the invite to a non-team
  address (500 `unknown`), `dist/` holding a demo build (never deploy it).
**Manual steps waiting on Herman**
- Next 1.
- As in v0.13: dev's Auth URL settings (DEV_SETUP §5); before prompt 12, the coach on
  production with `make-coach.sql`, Turnstile and the `age` key pair.

## v0.13 · 5 Oct 2026 · Prompt 05: built, deployed to dev, validated
**State**: `origin/main` = `origin/frontend-first` = 5d97c94 (v0.12, CI green). Local
`frontend-first` has prompt 05's commits on top, not pushed. On `swimclass-dev` (Herman ran
`supabase login`; the session linked the CLI): the migration `…120000_add_login_limiter` is
applied, `SITE_URL=http://localhost:5173` is set, and `login` and `admin-accounts` are
deployed (`verify_jwt` false for both). Checks:
- Typecheck, lint, format; the full unit suite (1,840 tests); `npm run test:db` on dev (262,
  with the 19 new login-limit tests). Both functions pass `deno check`.
- Prompt 05's VALIDATION, live on dev (`frontend-plan/review/prompt05/validate.mjs`, ALL OK):
  meiling logs in through `login`, and the reply holds only the two tokens (no email); a wrong
  password and an unknown username get the same 401 `invalid_login`; `Meiling` counts as
  `meiling`; the 11th try after 10 failures is 429 `too_many_attempts` even with the right
  password; another page's origin gets 403; `admin-accounts` answers 401 signed out, 403
  `not_coach` to meiling, and reaches its checks for herman (`invalid_username`,
  `username_taken`; nothing created, no email).
- The client IP can't be faked: Cloudflare, in front of Supabase, refuses a request that sets
  `CF-Connecting-IP` itself (its own 403 page), and a made-up `X-Forwarded-For` didn't
  change the IP recorded (`login_attempts.ip` was the real one).
- "Tries from a second IP still work" can't be sent from one PC; `tests/db/login.test.ts`
  checks it in the database (10 failures from one IP leave another IP free).
- Dev's Auth (its public settings): email sign-in on, sign-ups on, Confirm email on. The Site
  URL and redirect URLs aren't public: Herman checks them (Manual steps).
- A production build has no secret key and no demo code; the only addresses in it are the
  forms' examples (`name@example.com`, `you@example.com`).
- A demo build with Turnstile's always-pass test key, served by `wrangler dev` with the real
  headers, shows the widget on Log in, Sign up and Forgot password at 390 and 1280 px with
  nothing blocked, and meiling logs in through it
  (`frontend-plan/review/security/captcha-check.mjs`).
- `npm run db:types` regenerated `database.types.ts` (only additions: `booking_changes`,
  `login_attempts.ip`, the two login functions).
**Done**
- 2a8a00d, migration `…120000_add_login_limiter`: `login_attempts` gets `ip inet` and a
  64-character username cap; `check_login_attempt` (service role only) locks per username
  then IP, prunes rows older than a day, refuses after 10 failures per username+IP or 30 per
  IP in 15 minutes, otherwise records the try as a failure *before* the sign-in (so parallel
  tries all count) and returns the account's email; `record_login_success` marks it and
  forgets that username's earlier failures from that IP. Demo mode's login uses the same
  functions now. `supabase/README.md`, ARCHITECTURE §4.2/§4.3 updated.
- f7f3d07, `supabase/functions/`: `login` and `admin-accounts` (TECH_SPEC §7 rewritten to
  match), `_shared/http.ts` (CORS for `SITE_URL` only, JSON refusals) and `_shared/clients.ts`
  (reads `SUPABASE_SECRET_KEYS`/`SUPABASE_PUBLISHABLE_KEYS`). `config.toml`: `verify_jwt =
  false` for both; local Auth site URL `http://localhost:5173` and Confirm email on. Both
  type-check with `deno check` (Deno 2.9 through `npx deno@2`).
- 9847449: Cloudflare Turnstile on Log in, Sign up and Forgot password when
  `VITE_TURNSTILE_SITE_KEY` is set (`shared/ui/Captcha.tsx`, `shared/lib/hooks/useCaptcha.tsx`,
  `shared/lib/turnstile.ts`); the CSP allows `https://challenges.cloudflare.com` only then.
  Words for `captcha_required`, `captcha_failed`, `captcha_unavailable`,
  `over_request_rate_limit` (DESIGN §6).
- 6a10ee5: `supabase/scripts/make-coach.sql` (by confirmed email; exactly one row; no other
  coach). Tried in PGlite: placeholder left, a coach already there, no such email, success.
- Already built in the frontend waves and unchanged: the pages, guards (signed out →
  `/login`, unapproved → `/pending`, customers kept out of `/coach/*`), `SessionProvider`,
  the sidebar's "Signed in as", the Account page, `DEFAULT_BUSINESS_NAME` on signed-out pages.
- DEV_SETUP §5: deploying the functions, the `SITE_URL` secret, the dashboard's Auth
  settings, `VITE_DEMO=false`, and Turnstile's test keys.
**Next**
1. Herman pushes `frontend-first` (`git push origin frontend-first`); once CI is green,
   `git fetch . frontend-first:main` and `git push origin main`.
2. Optional, Herman: the sign-up path on dev with `VITE_DEMO=false` in `.env.local` (Auth
   emails only team members until prompt 11, so use your own Gmail): sign up → confirm →
   `/pending`; then approve it signed in as herman (the Approve buttons come in prompts
   08 and 09) → `/book`. Demo mode already shows the same flow, and the unit tests cover it.
   Watch the browser's Network tab while logging in: no one else's email, no secret key.
3. Prompt 06.
**Decisions** (Herman left them to Claude)
- The "CAPTCHA instead of a lockout" for many-IP failures is the CAPTCHA Auth asks on
  every sign-in in production; `check_login_attempt` doesn't flag usernames, as a flag could
  only be checked by a token Auth checks anyway.
- `login` signs in with the publishable key so Auth checks the CAPTCHA (a secret-key client
  skips it). Forwarding the client IP to Auth (`Sb-Forwarded-For`) needs the secret key, so
  it isn't done: Auth's own per-IP allowance for password sign-ins (150 per 5 minutes,
  bursts of 30) is shared by every login through the function. Plenty for one coach's
  customers; the CAPTCHA and the limiter come first.
- Two functions, not one: `check_login_attempt` records the try as a failure before the
  sign-in, and `record_login_success` marks it after, so parallel tries can't slip past.
- `admin-accounts` checks the coach by calling `is_coach()` and `approve_account` as the
  caller (with their JWT), not with the service role. An address that signed up with
  another username and never confirmed is refused as `email_taken`.
- CORS allows exactly `SITE_URL`'s origin (dev's is `http://localhost:5173`).
**Open issues**
- `send_password_reset` (unused until prompt 09) assumes Auth skips its CAPTCHA for the
  secret key; Auth's source says so for `service_role`, untried with an `sb_secret_` key.
- An invite to a non-team address on dev fails as 500 `unknown` (`email_address_not_authorized`);
  map it in prompt 09 if needed.
- `dist/` holds a demo build with Turnstile's test key: never deploy it.
- The validation leaves rows in dev's `login_attempts` (deleted after a day); it doesn't
  touch anything the database tests fingerprint.
**Manual steps waiting on Herman**
- Now, in the dev dashboard → Authentication → URL Configuration (DEV_SETUP §5): Site URL
  `http://localhost:5173`; Redirect URLs `http://localhost:5173/**`. Then Next 1.
- Before the site is announced (prompt 12), on production: sign up as `herman` with your own
  email, confirm it, put that email in `supabase/scripts/make-coach.sql` and run it once in
  the SQL editor.
- At go-live (prompt 12): a Turnstile widget for the site's domain: its site key in
  `.env.production.local`, its secret in Auth → Attack Protection → CAPTCHA.
- Still open from v0.12: an `age` key pair for backups (prompt 12); optional: a GitHub
  noreply email; Cloudflare, package prices, Google 2-Step Verification and the CA
  certificate check.

## v0.12 · 4 Oct 2026 · Pushed; security audit and fixes
**State**: `origin/main` is 6d4abdb (v0.11): Herman pushed it himself, since Claude Code's
safety check blocks pushing from the session, and GitHub CI passed. `frontend-first` (=
local `main` plus this work) is not pushed. At 15ae3bd typecheck, lint and format pass, and the build passed at
37bb6ab. The full unit run was stopped by Claude Code for low memory before it finished;
the files these changes touch passed in partial runs (booking, cancelling and Settings in
demo mode with the migration, 371 tests; every form with new limits, 409). GitHub CI
runs the whole suite once `frontend-first` is pushed (Next 1). The hardening migration is applied
to `swimclass-dev` and `npm run test:db` passes there (243 tests). The old worktrees and
all 20 `fe/*` branches are removed (all were merged and clean).
**Done** (Herman pasted a security checklist, then: "The decisions you reason it and made
it yourself". The findings and their outcomes are in
`frontend-plan/review/security/audit-2026-10-04.md`, outside the repo because the repo is
public.)
- Secrets: none was ever committed (173 commits, every branch), none is in the production
  bundle, and `npm audit` is clean. Only the URL and publishable key reach the browser.
- 0fe7260, migration `20261004100000_hardening`, applied with `supabase db push --db-url`:
  - A customer may book or cancel 10 times in 24 hours (`too_many_changes` {limit}; PRD
    BR-16). A repeat booking counts once; the coach never counts. A trigger counts in the
    new `booking_changes` table.
  - The coach's direct writes on open hours, exceptions, announcements and settings are
    revoked; the functions check, trim and cap what is written.
  - Table caps match the functions' (notes and reasons 500, payment instructions 2000),
    plus payments ≤ 100 lessons and RM 100,000, starting balances ≤ 10,000, and at most 50
    open-hours ranges (`too_many_rules`). `username_available` refuses input over 64.
  - `database.types.ts` wasn't regenerated (`db:types` needs the CLI link; only the new
    table is missing, and the browser never reads it).
- 7e79ac0: the customer message for the limit (DESIGN §6).
- 37bb6ab: the build writes `dist/_headers` (Content-Security-Policy with only the site's
  files and the Supabase project, frame-ancestors 'none', HSTS, nosniff, X-Frame-Options,
  Referrer-Policy, Permissions-Policy, COOP), and refuses secret keys in `VITE_` values.
  Settings' Save bar CSS moved from a `<style>` element to `SaveBar.css`. Checked with
  `wrangler dev` on a demo build (`frontend-plan/review/security/csp-check.mjs`): every
  page at 390 and 1280 px, nothing blocked; an injected inline script is refused.
- 4a4ceb6: CI has a read-only token, actions pinned to commits, no stored credentials.
- ee0f492: `maxLength` on every text box (passwords 72, Auth's bcrypt limit).
- 02f75ce, 15ae3bd: TECH_SPEC §7, §9, §12, §13 and prompts 05, 11, 12 now describe the safer
  designs to build: the login limit per username+IP and per IP with no lockout from many
  IPs, Cloudflare Turnstile CAPTCHA, a low Auth email limit, the coach made by confirmed
  email, encrypted backups (the repo is public), `.env.production.local`, and changing
  dev's public seed passwords before Gmail is connected to dev. `config.toml`'s password
  minimum is 8. (15ae3bd repairs 02f75ce, whose `String.replace` pasted a copy of the
  spec's first half into §7.)
**Next**
1. Herman pushes `frontend-first` first (`git push origin frontend-first`), so CI runs the
   full unit suite off this PC; once it is green, `git fetch . frontend-first:main` and
   `git push origin main`.
2. The wiring (prompts 05–11), building the login limiter and CAPTCHA as prompt 05 now
   says. Run `npm run db:types` once the CLI is linked.
**Decisions** (Herman left them to Claude)
- CAPTCHA: yes, Cloudflare Turnstile (free), built with prompt 05 and switched on in
  prompt 12.
- Sign-up stays open, with CAPTCHA and the coach's approval.
- The change limit is 10 in a rolling 24 hours, hard-coded: it is an abuse limit like the
  login limit (TECH_SPEC §7), not a business setting, so it isn't in `settings`.
- Migrations go to `swimclass-dev` with `npx supabase db push --db-url "$DATABASE_URL"`
  (the session pooler, port 5432), which keeps the migration history in step.
- Not done, with reasons in the audit file: a per-recipient email cap, un-approving an
  account, phone and name format checks, removing the dev project ref from docs.
**Manual steps waiting on Herman**
- Push `frontend-first` to `main`.
- Done: Node 24, Supabase minimum password length 8 (dev), `D:\d` deleted.
- Still open: at go-live, a Cloudflare Turnstile widget and an `age` key
  pair for backups (prompt 12); optional: a GitHub noreply email for future commits; v0.6's
  Supabase CLI link, Cloudflare, package prices, Google 2-Step Verification and the CA
  certificate check.

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
