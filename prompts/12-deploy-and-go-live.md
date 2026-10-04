# Prompt 12: Deploy, backups and go-live

## CONTEXT
Everything works on the dev project. Now production, backups and moving Herman's real
students in. Read TECH_SPEC §2, §9, §12, §13, §14 and PRD §8. Many steps happen in web
dashboards: write them as a checklist for Herman and do the code parts yourself.

## DIAGNOSE
1. Run the full test suite (`npm run test` and `npm run test:db`) and a production
   build; stop if anything fails.
2. Run the TECH_SPEC §13 security checklist against the code and report each item.
3. Ask Herman which domain he wants now: none (free Cloudflare address) or a domain he
   has bought (for example `swimclass.online`). Don't block on it; domain can come later.

## TASK
1. **Production Supabase** (checklist for Herman, commands for you):
   - Create project `swimclass` in Southeast Asia (Singapore); note URL and keys.
   - Before linking or pushing, mark it as production: in its SQL editor run
     `create role swimclass_production nologin;` (`supabase/seed.sql` refuses to run where
     this role exists).
   - `npx supabase link --project-ref <ref>`, `npx supabase db push` (no seed!).
   - Update the settings row (the migration creates it) with Herman's email and prices,
     and add his real open hours (the weekly template is only in the dev seed).
   - Deploy `login`, `admin-accounts`, `mail-queue`; set `MAIL_TOKEN` (new random value)
     and `SITE_URL` (the bare production origin, no trailing slash, like
     `https://swimclass.online`: `mail-queue` puts it in front of the email links' paths).
   - Auth (TECH_SPEC §9): confirm email on, Site URL and redirect URLs = production URL,
     custom SMTP with Gmail (same as dev), templates, minimum password length 8, a low
     email rate limit (about 20–30 an hour), and CAPTCHA with Cloudflare Turnstile
     (create the widget in Herman's Cloudflare account; the secret goes in Auth, the site
     key in `.env.production.local` as `VITE_TURNSTILE_SITE_KEY`).
   - Before the site is announced, Herman signs up as `herman` with his own email and
     confirms it; run `supabase/scripts/make-coach.sql` with that email (it matches the
     confirmed address, not the username).
   - Link the CLI back to `swimclass-dev` (`npx supabase link --project-ref <dev ref>`)
     so everyday `--linked` commands (`db reset --linked` wipes the database) keep
     targeting dev. `npx supabase projects list` marks the linked project.
2. **Cloudflare**: production values in `.env.production.local` (URL, publishable key,
   Turnstile site key; it wins over `.env.local`, which holds dev's), `npm run build`
   (it refuses secret keys and writes `dist/_headers`), `npx wrangler deploy`. Check the
   security headers with `curl -I` on a page. Optional custom domain on the Worker. Check deep links
   (`/coach/students`) load after refresh (SPA fallback).
3. **PWA**: `manifest.webmanifest` (name "Swim Class", short name, theme `#0B5E7A`,
   white background, 192/512 px icons, `display: standalone`), iOS meta tags, and an
   "Add to Home Screen" hint on the Account page. No service-worker caching of API data.
4. **Apps Script (prod)**: second script project or the same one pointed at prod
   (`MAIL_QUEUE_URL`, new `MAIL_TOKEN`); run `install()`.
5. **Backups** (TECH_SPEC §12): `.github/workflows/backup.yml` weekly (Sunday 2 am MYT)
   dumping the schema and the data (`supabase db dump`, then `--data-only`) with
   `SUPABASE_DB_URL` from GitHub secrets, encrypting both with `age` to Herman's public
   key (`BACKUP_AGE_RECIPIENT`; the private key stays with him, never on GitHub), and
   uploading only the encrypted files as an artifact with 90-day retention. The repo is
   public, so an unencrypted dump would publish customers' contacts. Add a manual "Run workflow" trigger and test it.
   Write a restore note in HANDOFF.
6. **Go-live data**: a short guide for Herman: add each customer account (invite),
   add their groups with starting balances, then add upcoming lessons with Add booking
   (`coach_book`): in the past or beyond the booking window if needed (a past lesson
   counts as used, so don't count it in the starting balance too), Skip travel gap for
   tight pairs, Outside open hours for times outside them or off the start step, Book
   anyway for groups past their credit. Add booking emails nobody, so then send a
   broadcast with the link.
7. **Smoke test** on production with a test customer: sign up → approve → book two
   lessons, one of them tomorrow → confirmation email → cancel the other →
   cancellation email → evening reminder for tomorrow's lesson. Afterwards cancel its
   remaining lessons and deactivate its group: an account with groups can't be deleted
   (`delete_account` is only for unapproved accounts with no groups).
8. Final HANDOFF v1.0: how to run, deploy, restore a backup, rotate keys, and the list
   of free-tier limits to watch (TECH_SPEC §14).

## VALIDATION
- Production site loads in under 3 s on PRD §8's profile (Fast 4G, 4× CPU;
  `frontend-plan/tools/perf.mjs`), signed-in pages too; Lighthouse performance and
  accessibility ≥ 90 on Book and Schedule.
- `curl` to a deep link returns the app; unknown asset paths return the app, not 404.
- No secret key in the built files: `grep -rE 'sb_secret_[A-Za-z0-9_-]{10,}' dist/` is
  empty (a plain `sb_secret` also matches supabase-js's own code).
- `curl -I` on the site shows the Content-Security-Policy and the other headers.
- The backup artifact holds only `.age` files, and Herman can decrypt and read one.
- Backup workflow run succeeded and the artifact downloads.
- Smoke test passed; the Apps Script execution log shows runs every 5 minutes.
- Supabase dashboard shows the project active; free-tier usage well under limits.
- HANDOFF v1.0 written.
