# Prompt 05: Log in with username, sign-up, approval, accounts

## CONTEXT
Database rules are done (prompts 02–04). Now people need to get in.
Read PRD BR-1 to BR-5, TECH_SPEC §5.3 (`username_available`, `approve_account`), §5.4
(`get_public_settings`), §7 (`login`, `admin-accounts`), §9 (auth setup), §11 (routes and
guards), DESIGN §4 (Log in) and §6 (messages).
Supabase Auth itself uses email + password; the `login` Edge Function lets people
type a username instead, without ever exposing emails to the browser.

## DIAGNOSE
1. Confirm the profile trigger from prompt 02 creates profiles on sign-up.
2. Check Supabase Auth settings on the dev project: email provider on, confirm email
   on, site URL and redirect URLs include `http://localhost:5173`.
3. Custom SMTP is configured in prompt 11. Until then, only team-member emails
   receive auth emails; use seeded users for testing.
4. Confirm `supabase functions serve` works locally, or that you can deploy functions
   to the dev project. Stop and report if neither works.

## TASK
1. Edge Function `login` per TECH_SPEC §7, with the rate limit as redesigned after the
   4 Oct 2026 audit: normalise the username first, one service-role database function
   that locks, counts per username+IP and per IP, never locks an account out from many
   IPs (it asks for the CAPTCHA instead), and prunes; `login_attempts` gets `ip inet`
   and a username length check (a new migration). Identical `invalid_login` for every
   failure; returns the session. CORS limited to `SITE_URL` and localhost.
2. Edge Function `admin-accounts` (coach JWT required): `create_account` (invite by
   email with metadata; `approved = true`) and `send_password_reset`.
3. Pages (match DESIGN §4 and `design/Login.dc.html`):
   - Log in → calls `login`, then `supabase.auth.setSession`.
   - Sign up: username (live availability check with `username_available`, debounced),
     name, email, phone, password + confirm. `username_available` works signed out (anon)
     and signed in, and returns false for an invalid username too: check the format
     first, and say "That username is taken" only for a valid one. Check username format,
     name (1–100) and phone (≤ 30) before calling `signUp`: Auth reports a failed profile
     trigger only as "Database error saving new user". On success show "Check your email
     to confirm, then log in. Your coach may need to approve your account first."
   - Forgot password (email → `resetPasswordForEmail` with redirect to `/reset-password`,
     `ROUTES.resetPassword`) and
     Reset password (`updateUser`).
   - Waiting for approval (`/pending`) with a log-out button.
   - CAPTCHA (TECH_SPEC §9): when `VITE_TURNSTILE_SITE_KEY` is set, Log in, Sign up and
     Forgot password show Cloudflare Turnstile and send its token (`captchaToken` to
     Auth, `captcha_token` to `login`). Without the key (demo mode, dev) there is no
     widget. Add `https://challenges.cloudflare.com` to `script-src` and `frame-src`
     in `vite.config.ts`'s `securityHeaders` when the key is set, and load the widget's
     script only on those three pages.
   - Log in, Sign up, Forgot and Reset show `DEFAULT_BUSINESS_NAME` from
     `src/shared/config/business.ts` as the business name: they are signed-out pages, and
     `get_public_settings` is for signed-in accounts only (approved or not), not anon.
     Other pages, `/pending` included, read `business_name` from it.
4. Guards: signed out → `/login`; signed in but not approved → `/pending`; customers
   can't open `/coach/*`. The coach can open the customer pages from "View as
   customer" to check the layout; the coach has no groups there, so Book shows the
   empty state and booking is disabled.
   The session goes in `app/providers/SessionProvider.tsx` (ARCHITECTURE §3.2). The
   customer sidebar's "Signed in as …" line (DESIGN §3) waits for it: pass the
   profile's display name to `Sidebar` as `signedInAs` in `CustomerLayout`.
5. Account page: display name and phone (update own profile), email shown read-only,
   change password, log out.
6. Coach bootstrap (TECH_SPEC §9): `supabase/scripts/make-coach.sql` takes the coach's
   email, matches the confirmed address in `auth.users` (never the username: whoever
   signs up as `herman` first would get the role), and raises an error unless exactly
   one row changes and no other coach exists. A line in HANDOFF tells Herman to run it
   once, before the site is announced.

## VALIDATION
- Seeded `meiling` logs in with username and password; wrong password and unknown
  username show the same message; the 11th failed try within 15 minutes shows the
  "too many tries" message even with the right password; tries for `meiling` from a
  second IP still work (no lockout from many IPs), and `Meiling` counts as `meiling`.
- A new sign-up lands on `/pending` and can't book (RPC returns `not_approved`); after
  `approve_account` (coach only: call it signed in as herman; the Approve buttons come in
  prompts 08 and 09) they reach `/book`.
- A customer calling `admin-accounts` gets 403.
- Browser network tab: no email addresses of other users, no secret keys.
- Unit tests for the message mapping of auth errors.
- HANDOFF.md updated (include any Supabase dashboard steps Herman must do).
