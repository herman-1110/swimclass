# Prompt 11: Emails through Gmail (outbox, mail-queue, Apps Script, Auth SMTP)

## CONTEXT
Outbox rows are already created by prompt 04's functions (booking, cancelling, broadcasts)
with the templates in `supabase/migrations/…_emails.sql` (`email_booked`,
`email_cancelled`, `email_late_alert`, `email_broadcast`, footer included). Now they have
to be sent, and the evening reminders and coach digest have to be built with that file's
helpers: `myt_when_text` (and its parts `myt_day_text`, `myt_time_text`,
`myt_range_text`), `email_text` (wrap all free text in it: names, locations, the business
name), `email_html` (escapes the text and makes the site links clickable), `queue_email`,
`account_email`. Links are written as `{{site_url}}/my-classes` (also `/book`,
`/coach/schedule` or the bare `{{site_url}}`; paths may contain `-`), which `mail-queue`
fills in. Everything
goes out from Herman's Gmail. Read PRD BR-32 to BR-37, TECH_SPEC §7 (`mail-queue`), §8
(pipeline and Apps Script), §9 (Auth SMTP) and §14 (limits).

## DIAGNOSE
1. List the outbox rows the seed and tests produce and their `dedupe_key`s.
2. Confirm Edge Functions can be deployed to the dev project and secrets set.
3. Ask Herman to confirm he has 2-Step Verification on his Google account (needed for
   an App Password) and which Gmail address to use. Stop until he confirms.

## TASK
1. `queue_daily_emails(p_for_date)` (TECH_SPEC §5.5):
   - Customer reminder, one per account: subject "Swim lesson tomorrow, Sat 3 Oct";
     body lists each lesson (time, students, location), the cancellation deadline of
     each lesson, worded like `email_booked` ("Free to cancel or reschedule until
     3:00 am, Sat 3 Oct." or "It starts in less than 6 hours, so it can't be
     cancelled."; with the default 8 pm reminder and 6-hour cutoff most of tomorrow's
     lessons can still be cancelled), and a link to My classes
     (`{{site_url}}/my-classes`).
   - Coach digest: subject like "Tomorrow: 3 lessons, first at 9:00 am"; lessons in order
     with location and travel gap to the next one, unpaid groups ("collect RM [price]"),
     last-lesson groups, accounts waiting for approval.
   - Reminders are due at `reminder_time` and the digest at `digest_time` (PRD BR-32,
     BR-33): the function queues each job only once it is due, and records each on its
     own (`daily_jobs` 'reminder' and 'digest' for `p_for_date`, tomorrow's date).
     Running it again must not duplicate anything.
2. `claim_outbox`, `ack_outbox` (retry up to 5 attempts, then leave `last_error`).
3. Edge Function `mail-queue` per TECH_SPEC §7 (token check; `queue_daily_emails` with
   tomorrow's MYT date, which decides what is due; claim, ack). Return
   `{ emails: [...] }` for claim. Before returning the claimed rows, replace
   every `{{site_url}}` in `subject`, `body_text` and `body_html` (may be null) with
   `SITE_URL`: `replaceAll`, since an HTML link has it twice; `SITE_URL` is the bare
   origin, no trailing slash.
4. `apps-script/Code.gs` from TECH_SPEC §8 plus `apps-script/README.md` with click-by-
   click setup: new Apps Script project, paste code, Project Settings → Script
   Properties (`MAIL_QUEUE_URL`, `MAIL_TOKEN`, `SENDER_NAME`), run `install()`, approve
   permissions, check Executions log. Include how to stop it (delete the trigger).
5. Email templates: plain text + minimal HTML (no images, no tracking), times in MYT,
   sender name = the Apps Script `SENDER_NAME` property, set to the business name
   (TECH_SPEC §8), a footer "Sent by <business name>. Reply to this email to
   reach your coach." Replies go to Herman's Gmail naturally. The booked, cancelled,
   late-alert and broadcast templates exist (prompt 04; the coach's late alert ends
   "Sent by <business name>." only); the reminder and digest are new. Coach bookings
   send nothing, late alerts are only for customers' changes, and broadcasts reach only
   approved customers whose address is confirmed or was entered by the coach (invited).
6. Supabase Auth custom SMTP (dev project first): `smtp.gmail.com`, port 587, Herman's
   Gmail and App Password, sender name; raise the Auth email rate limit; customise the
   confirm, invite and reset email templates to the same plain style. Write the exact
   steps in HANDOFF for prod.
7. Coach view: a small "Email log" in Settings (last 50 outbox rows: when, to, kind,
   sent or error) so Herman can check what went out. The coach can't read
   `email_outbox`, so add `email_log(p_limit int default 50)` (TECH_SPEC §5.5: coach
   only, security definer, granted to `authenticated`; returns created_at, to_email,
   kind, sent_at, attempts, last_error), with its grant in `tests/db/rls.test.ts`.
   Never grant anything on `email_outbox` itself.

## VALIDATION
- `tests/db/emails.test.ts`: with the clock at Fri 2 Oct 20:05 MYT, queueing for Sat
  3 Oct creates one reminder each for meiling (Aiman & Sofia 9:00 am), zulaikha, farah,
  and one coach digest listing 3 lessons; running again creates nothing new. Once
  `mail-queue` runs on dev (after 8 pm on Fri 2 Oct 2026, real time), `daily_jobs` and
  the outbox already hold Sat 3 Oct's real rows, so the test clears them inside its own
  transaction first (it is rolled back) and reads only the rows it adds.
- After Hana's payment is recorded (prompt 09), the digest no longer lists her as
  unpaid.
- Calling `mail-queue` without the token returns 401; with it, claim returns rows and
  marks them claimed; ack marks them sent; unacknowledged claims are re-claimable after
  15 minutes.
- No claimed row contains `{{site_url}}`; a unit test replaces both placeholders in an
  HTML link (`<a href="{{site_url}}/my-classes">{{site_url}}/my-classes</a>`).
- End to end on the dev project. First Herman reloads the dev database
  (`npx supabase db reset --linked`): the outbox sends oldest first, and rows queued
  while trying prompts 05–10 (to the seed's `@example.com` addresses) would go out
  first, bounce and use up the 100-a-day quota. Then set Coach email in Settings to
  Herman's Gmail (the seed's is `herman@example.com`). Book a lesson inside 24 h as a
  test customer whose email is Herman's own → within 5 minutes Herman receives the
  confirmation and the late-change alert from his Gmail. Reload again before the next
  `npm run test:db` (the seed check covers settings).
- Password reset email arrives through Gmail SMTP.
- When `MailApp.getRemainingDailyQuota()` is 0 the script sends nothing and the rows
  stay queued for the next day.
- HANDOFF.md updated.
