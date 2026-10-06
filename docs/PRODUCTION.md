# Production

How the live site is set up and kept running: the website at `https://swimclass.online`
(Cloudflare), the Supabase project `swimclass` (Singapore), the Gmail mailer (Apps Script) and
the weekly backup (GitHub Actions). The dev project is in `DEV_SETUP.md`; the design behind all
this is TECH_SPEC §9, §12–§14.

**Herman** marks a step in a dashboard or one that needs your password; **Claude** marks what a
Claude Code session does. Commands run in PowerShell from `D:\DOWNLOAD\Swimming\swimclass`, one
line at a time (PowerShell 5.1 has no `&&`). `<prod-ref>` is the production project's ref: the
letters in its dashboard address, `supabase.com/dashboard/project/<prod-ref>`. The dev project's
ref is `uhrgtttvzqjrdtdzyzkr`.

## 1. Set up production (once, in this order)

### 1.1 Accounts and keys (Herman)
1. Supabase → **New project**: name `swimclass`, region **Southeast Asia (Singapore)**, a strong
   database password made of letters and digits (keep it in your password manager: the CLI and
   the backup need it).
2. Before anything else, in that project's **SQL Editor**, run
   `create role swimclass_production nologin;` (`supabase/seed.sql` refuses to run where this
   role exists, so the sample data can never land in production).
3. **Project Settings → API Keys**: the publishable key (`sb_publishable_…`). It is public: give
   it to Claude with `<prod-ref>`. The secret key stays in Supabase; never copy it anywhere.
4. Cloudflare dashboard → **Turnstile** → **Add widget**: name `swimclass`, hostname
   `swimclass.online`, mode **Managed**. The site key (public) goes to Claude; keep the secret
   key for 1.5.
5. Google, signed in as `hlyy1011@gmail.com`: <https://myaccount.google.com/apppasswords> → App
   name `Supabase swimclass prod` → **Create**. Copy the 16 letters (no spaces) for 1.3; Google
   shows them once.
6. The backup key pair (age):
   ```powershell
   winget install --id FiloSottile.age -e
   ```
   Close PowerShell and open it again, then:
   ```powershell
   age-keygen -o "$HOME\swimclass-backup-key.txt"
   ```
   It prints `Public key: age1…`: that goes into GitHub in 1.7. The file is the private key.
   With it anyone can read every backup, and without it no backup can be read: keep a second
   copy off this PC (a USB stick or your password manager), never in the repo, on GitHub or in
   a chat.

### 1.2 Database and functions
1. **Herman** (the link asks for the production database password):
   ```powershell
   npx supabase link --project-ref <prod-ref>
   npx supabase db push --dry-run
   npx supabase db push
   ```
   The dry run lists the migrations; the push applies them. No seed: `db push` never runs it.
2. **Claude** writes `D:\DOWNLOAD\Swimming\frontend-plan\review\prompt12\prod-functions.env`
   (outside the repo): a new random `MAIL_TOKEN` and `SITE_URL=https://swimclass.online` (no
   trailing slash: `mail-queue` puts it in front of the email links' paths, and it is the only
   origin `login` and `admin-accounts` accept).
3. **Herman**:
   ```powershell
   npx supabase secrets set --env-file ..\frontend-plan\review\prompt12\prod-functions.env
   npx supabase functions deploy login --use-api
   npx supabase functions deploy admin-accounts --use-api
   npx supabase functions deploy mail-queue --use-api
   npx supabase link --project-ref uhrgtttvzqjrdtdzyzkr
   npx supabase projects list
   ```
   The last two point the CLI back at `swimclass-dev` (if the link asks for a password, it is
   dev's, from `DATABASE_URL` in `.env.local`; the list marks the linked project), so an
   everyday `db reset --linked` can never wipe production.

### 1.3 Auth (Herman, production dashboard → Authentication)
1. **Sign In / Providers → Email**: on, **Confirm email** on, new sign-ups allowed; minimum
   password length 8 (as you set it on dev).
2. **URL Configuration**: Site URL `https://swimclass.online`; Redirect URLs
   `https://swimclass.online/**`.
3. **Emails → SMTP Settings → Enable custom SMTP**: sender email `hlyy1011@gmail.com`, sender
   name = the business name, host `smtp.gmail.com`, port `587`, minimum interval unchanged,
   username `hlyy1011@gmail.com`, password = the App Password from 1.1 → **Save**.
4. **Rate Limits → Rate limit for sending emails**: 25 an hour (check it after step 3, which
   may change it). It stops strangers making your Gmail send sign-up and reset emails.
5. **Emails → Templates**, from `supabase/templates/`, with "Swim Class" replaced by the
   business name; keep `{{ .ConfirmationURL }}` and `{{ .Data.username }}` as they are:
   Confirm signup "Confirm your email" (`confirmation.html`), Invite user "Your swim lesson
   account" (`invite.html`), Reset password "Reset your password" (`recovery.html`).

CAPTCHA comes in 1.5, once the site that shows the widget is live.

### 1.4 The website
1. **Claude** writes `.env.production.local` (it wins over `.env.local`, which holds dev's):
   `VITE_SUPABASE_URL=https://<prod-ref>.supabase.co`, the publishable key and
   `VITE_TURNSTILE_SITE_KEY`. Then `npm run build`, which refuses secret keys and writes
   `dist/_headers`, and checks `dist/` (no secret key; the CSP names the production project and
   Turnstile).
2. **Herman**, once: `npx wrangler login` (a browser page asks you to allow it). In the
   Cloudflare dashboard → `swimclass.online` → **DNS**, delete any A, AAAA or CNAME record for
   `swimclass.online` itself (a parking page, for example): the deploy can't attach the domain
   while one exists.
3. **Herman**: `npx wrangler deploy`. It uploads `dist/` and attaches `swimclass.online`
   (`wrangler.jsonc`; the `workers.dev` address stays off). The certificate can take a few
   minutes the first time.
4. **Claude** checks the live site: the headers (`curl -I`), a deep link such as
   `/coach/students` and an unknown asset path both return the app, the manifest and icons, and
   the first-load time (PRD §8).

### 1.5 The coach account (Herman)
1. Production dashboard → **Authentication → Attack Protection → CAPTCHA**: on, provider
   Turnstile, the secret key from 1.1 step 4 → Save.
2. On <https://swimclass.online/signup>: username `herman`, your own email (the one in your
   working copy of `supabase/scripts/make-coach.sql`), a password. The Turnstile check shows on
   the form. Click the link in the confirmation email (it comes from your Gmail now); the site
   says your account is waiting for approval.
3. **SQL Editor**: paste the whole of your working copy of `make-coach.sql` → **Run**. It says
   `Done: herman is the coach.` (It matches the confirmed email, not the username.)
4. Log in as `herman`: you land on Coach schedule. **Settings**: business name, your email
   (`hlyy1011@gmail.com`, for the evening digest and late-change alerts), open hours, prices,
   payment instructions, reminder and digest times → **Save changes**.

### 1.6 The mailer (Herman)
In the Apps Script project you used on dev (its timer has been off since 6 Oct), **Project
Settings → Script Properties**: `MAIL_QUEUE_URL` =
`https://<prod-ref>.supabase.co/functions/v1/mail-queue`, `MAIL_TOKEN` = the value after
`MAIL_TOKEN=` in `prod-functions.env`, `SENDER_NAME` = the business name. Run **poll** once
(it should end "Execution completed"), then **install**. **Executions** then shows a
Time-Driven run every 5 minutes. (`apps-script/README.md` has the clicks.)

### 1.7 Backups (Herman)
1. The workflow runs from `main`, so push first (the commands are in HANDOFF).
2. GitHub → the repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `BACKUP_AGE_RECIPIENT`: the `age1…` public key from 1.1 step 6.
   - `SUPABASE_DB_URL`: production dashboard → **Connect** → **Session pooler** → the URI, with
     `[YOUR-PASSWORD]` replaced by the database password (port 5432; GitHub can't reach the
     direct `db.<ref>.supabase.co` address).
3. **Actions → Backup → Run workflow** (branch `main`). It turns green in a few minutes; the
   run's page lists the artifact `swimclass-backup-<date>-<n>`.
4. Download it and read one file as in 5.2.

To try the whole chain before production exists, use dev's address in `SUPABASE_DB_URL` (the
`DATABASE_URL` line of `.env.local`), then change the secret to production's.

### 1.8 Smoke test (Herman, with Claude checking)
With a test customer on the live site, before telling anyone about it:
1. In a private window, sign up as `smoketest` with `hlyy1011+smoke@gmail.com`; confirm it from
   the email.
2. As `herman`: approve it (Coach schedule → Needs attention, or Students & payments → Waiting
   for approval), then **Add students** for that account: 1-to-1, one student.
3. As `smoketest`: book two lessons, one of them tomorrow. Two confirmation emails arrive (a
   lesson less than 24 hours away also sends you a late-change alert).
4. Cancel the other lesson: a cancellation email arrives.
5. In the evening, at the reminder time: the reminder for tomorrow's lesson arrives, and your
   digest. **Settings → Email log** shows each of them as sent.
6. Clean up as `herman`: cancel the remaining lesson, then **Students & payments** → the group's
   **History** → **Deactivate group**. (An account with a group can't be removed; it stays,
   with no active group.)

## 2. Move your students in
Do this after 1.8 and before announcing the site. Add booking emails nobody, so customers only
hear about the site from the message at the end.
1. For each customer account: **Add students** → Account: **Create a new account…** (name,
   username, email, phone) → lesson type, the students' names (1 to 3), pool location →
   **Set a starting balance**: the lessons already used and already paid before today.
   Each new account gets the "Your swim lesson account" email with a link to set a password.
   The link works once; an expired one is fixed with **Forgot password** on the login page.
   Auth sends at most 25 emails an hour (1.3 step 4): add about 20 accounts an hour.
   A second group on the same account (say, siblings who swim separately): **Add students**
   again and choose the existing account.
2. Their upcoming lessons: **Coach schedule → Add booking** (group, date, start, length, repeat
   weeks). The coach may book in the past or beyond the booking window. A past lesson you add
   counts as used, so don't count it in the starting balance too. Tight pairs: **Skip travel
   gap**. Times outside open hours or between the usual start times: **Outside open hours**. A
   group past its credit: **Book anyway**.
3. Check Students & payments: each group's package, used, booked and Paid/Unpaid look right.
4. **Message all customers** (Coach schedule): for example "Our new booking site is live:
   https://swimclass.online. Your lessons are already in My classes. To log in, use the link in
   the email 'Your swim lesson account', or Forgot password." Gmail sends 100 recipients a
   day; more wait for the next day.

## 3. Deploy a change
- **The website**: `npm run build` (it reads `.env.production.local`), then
  `npx wrangler deploy` (Herman). Check `curl -I https://swimclass.online/login` afterwards.
  `dist/` then holds a production build: never deploy one made with dev's values or in demo
  mode.
- **A migration**: `npm run test:db` on dev first. Then link to production, `db push --dry-run`,
  `db push`, and link back to dev (as in 1.2).
- **An Edge Function**: link to production, `npx supabase functions deploy <name> --use-api`,
  link back to dev.
- **The mailer**: paste the new `Code.gs` over the old one and save; the timer keeps running.

## 4. Watch
- **Apps Script → Executions**: a run every 5 minutes, few failures. If it stops, emails wait
  in the outbox, and with no requests at all Supabase pauses the project after a week (restore
  it from the dashboard).
- **Settings → Email log**: "Not sent: …" rows say why.
- **GitHub → Actions → Backup**: a green run every Sunday. GitHub turns schedules off in a
  public repo after 60 days without a commit (it emails first): **Enable workflow** there.
- **Supabase → Reports / Usage** once a month against the limits in §7.

## 5. Backups
### 5.1 What is in them
Every Sunday at 2 am (Malaysia), `.github/workflows/backup.yml` dumps the schema and the data,
encrypts both with age to the public key in `BACKUP_AGE_RECIPIENT`, and keeps them 90 days as
an artifact of the run: `swimclass-<date>-schema.sql.age` and `swimclass-<date>-data.sql.age`.
The data covers every table in `public` and Auth's accounts (emails and password hashes), so
customers keep their passwords after a restore. Auth's settings (SMTP, templates, URLs,
CAPTCHA), the Edge Function secrets and Storage are not in it.

### 5.2 Download and read one (Herman)
GitHub → **Actions → Backup** → a run → **Artifacts** → download, and unzip it. Then:
```powershell
age --decrypt -i "$HOME\swimclass-backup-key.txt" -o "$HOME\Downloads\data.sql" "$HOME\Downloads\swimclass-2026-10-11-data.sql.age"
```
(with the file's real name). `data.sql` is plain SQL: it starts with
`SET session_replication_role = replica;` and has an `INSERT INTO "public"."settings"` line.
Delete the decrypted file when you are done: it holds every customer's contacts.

### 5.3 Restore
For a lost or broken production database. Not rehearsed yet: try it once on a spare project.
1. A new Supabase project in Singapore (the free plan has two: pause `swimclass-dev` first if
   needed), marked as production (1.1 step 2), linked, and `npx supabase db push`. The
   migrations rebuild every table, function, policy and trigger; use them, not
   `schema.sql`, which leaves out the sign-up trigger on Auth's accounts (it is for reference).
2. SQL Editor: `delete from public.settings;` (the migration's default row; the backup holds
   the real one).
3. Load the data with `psql` (PostgreSQL's command-line tools; the Windows installer can install
   only those):
   ```powershell
   psql "<the new project's Session pooler URI>" --single-transaction --variable ON_ERROR_STOP=1 --file data.sql
   ```
   The first line turns triggers off for the load, so nothing runs twice.
4. Set up the rest as in §1: Edge Function secrets and deploys (1.2), Auth (1.3), the CAPTCHA
   secret (1.5), `.env.production.local` with the new URL and key, build and deploy (1.4), the
   mailer's `MAIL_QUEUE_URL` (1.6) and the backup's `SUPABASE_DB_URL` (1.7). Everyone logs in
   again.

## 6. Rotate a key
Do it when a key may have leaked, or when someone who saw it no longer should have.
- **`MAIL_TOKEN`**: a new value in `prod-functions.env`, `secrets set --env-file` on production
  (linked as in 1.2, then link back), then the same value in Apps Script's Script Properties.
  Between the two the mailer gets 401s; emails wait in the outbox, nothing is lost.
- **Supabase secret key**: **Project Settings → API Keys** → create a new secret key, deploy the
  three functions again, then delete the old key.
- **Publishable key**: create a new one, put it in `.env.production.local`, build and deploy,
  then delete the old one.
- **Database password**: **Project Settings → Database → Reset database password**, then the
  `SUPABASE_DB_URL` secret on GitHub and your password manager.
- **Gmail App Password**: delete it at <https://myaccount.google.com/apppasswords>, create a new
  one, and put it in Auth's SMTP settings (1.3 step 3).
- **Turnstile secret**: Cloudflare → Turnstile → the widget → **Rotate secret key**, then Auth's
  CAPTCHA setting (1.5 step 1).
- **Backup key**: a new pair (1.1 step 6), the new public key in `BACKUP_AGE_RECIPIENT`. Keep the
  old private key for 90 days: the older backups need it.
- **A person's password**: Forgot password on the login page.

## 7. Free-tier limits to watch
- **Supabase free plan**: 500 MB database, 5 GB egress a month, 50,000 monthly active users,
  500,000 Edge Function calls a month (the mailer makes about 9,000), two active projects, no
  automatic backups (hence §5). It pauses a project after a week with no requests; the mailer's
  calls every 5 minutes prevent that.
- **Auth emails**: 25 an hour (our setting, 1.3 step 4), sent through Gmail SMTP.
- **Gmail through Apps Script**: 100 recipients a day; the rest go the next day.
- **Apps Script**: timers may run 90 minutes a day in total (each poll takes seconds) and fetch
  URLs 20,000 times a day (the mailer: about 300 to 600).
- **Cloudflare**: static files are free and unlimited (the site has no Worker code). Turnstile
  is free.
- **GitHub Actions**: free for a public repo; artifacts are kept 90 days. Schedules stop after
  60 days without a commit (§4).
