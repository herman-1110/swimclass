# Prompt 05: Log in with username, sign-up, approval, accounts

## CONTEXT
Database rules are done (prompts 02–04). Now people need to get in.
Read PRD BR-1 to BR-5, TECH_SPEC §7 (`login`, `admin-accounts`), §9 (auth setup),
§11 (routes and guards), DESIGN §4 (Log in) and §6 (messages).
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
1. Edge Function `login` per TECH_SPEC §7: rate limit via `login_attempts`, identical
   `invalid_login` for every failure, returns the session. CORS limited to `SITE_URL`
   and localhost.
2. Edge Function `admin-accounts` (coach JWT required): `create_account` (invite by
   email with metadata; `approved = true`) and `send_password_reset`.
3. Pages (match DESIGN §4 and `design/Login.dc.html`):
   - Log in → calls `login`, then `supabase.auth.setSession`.
   - Sign up: username (live availability check with `username_available`, debounced),
     name, email, phone, password + confirm; on success show "Check your email to
     confirm, then wait for your coach to approve your account".
   - Forgot password (email → `resetPasswordForEmail` with redirect to `/reset`) and
     Reset password (`updateUser`).
   - Waiting for approval (`/pending`) with a log-out button.
4. Guards: signed out → `/login`; signed in but not approved → `/pending`; customers
   can't open `/coach/*`. The coach can open the customer pages from "View as
   customer" to check the layout; the coach has no groups there, so Book shows the
   empty state and booking is disabled.
5. Account page: display name and phone (update own profile), email shown read-only,
   change password, log out.
6. Coach bootstrap: a SQL snippet in `supabase/snippets/make-coach.sql` and a line in
   HANDOFF telling Herman to run it once.

## VALIDATION
- Seeded `meiling` logs in with username and password; wrong password and unknown
  username show the same message; the 11th failed try within 15 minutes shows the
  "too many tries" message even with the right password.
- A new sign-up lands on `/pending` and can't book (RPC returns `not_approved`); after
  `approve_account` they reach `/book`.
- A customer calling `admin-accounts` gets 403.
- Browser network tab: no email addresses of other users, no secret keys.
- Unit tests for the message mapping of auth errors.
- HANDOFF.md updated (include any Supabase dashboard steps Herman must do).
