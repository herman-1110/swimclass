# Prompt 11: Emails through Gmail (outbox, mail-queue, Apps Script, Auth SMTP)

## CONTEXT
Outbox rows are already created by the booking functions (prompt 04). Now they have
to be sent, and the evening reminders and coach digest have to be built. Everything
goes out from Herman's Gmail. Read PRD BR-32 to BR-37, TECH_SPEC §7 (`mail-queue`),
§8 (pipeline and Apps Script), §9 (Auth SMTP) and §14 (limits).

## DIAGNOSE
1. List the outbox rows the seed and tests produce and their `dedupe_key`s.
2. Confirm Edge Functions can be deployed to the dev project and secrets set.
3. Ask Herman to confirm he has 2-Step Verification on his Google account (needed for
   an App Password) and which Gmail address to use. Stop until he confirms.

## TASK
1. `queue_daily_emails(p_for_date)` (TECH_SPEC §5.5):
   - Customer reminder, one per account: subject "Swim lesson tomorrow, Sat 3 Oct";
     body lists each lesson (time, students, location), the cancellation rule
     (already locked by then) and a link to My classes.
   - Coach digest: subject like "Tomorrow: 3 lessons, first at 9:00 am"; lessons in order
     with location and travel gap to the next one, unpaid groups ("collect RM [price]"),
     last-lesson groups, accounts waiting for approval.
   - Record `daily_jobs`; running twice must not duplicate anything.
2. `claim_outbox`, `ack_outbox` (retry up to 5 attempts, then leave `last_error`).
3. Edge Function `mail-queue` per TECH_SPEC §7 (token check, due check in MYT, claim,
   ack). Return `{ emails: [...] }` for claim.
4. `apps-script/Code.gs` from TECH_SPEC §8 plus `apps-script/README.md` with click-by-
   click setup: new Apps Script project, paste code, Project Settings → Script
   Properties (`MAIL_QUEUE_URL`, `MAIL_TOKEN`, `SENDER_NAME`), run `install()`, approve
   permissions, check Executions log. Include how to stop it (delete the trigger).
5. Email templates: plain text + minimal HTML (no images, no tracking), times in MYT,
   sender name from settings, a footer "Sent by <business name>. Reply to this email to
   reach your coach." Replies go to Herman's Gmail naturally.
6. Supabase Auth custom SMTP (dev project first): `smtp.gmail.com`, port 587, Herman's
   Gmail and App Password, sender name; raise the Auth email rate limit; customise the
   confirm, invite and reset email templates to the same plain style. Write the exact
   steps in HANDOFF for prod.
7. Coach view: a small "Email log" in Settings (last 50 outbox rows: when, to, kind,
   sent or error) so Herman can check what went out.

## VALIDATION
- `tests/db/emails.test.ts`: with the clock at Fri 2 Oct 20:05 MYT, queueing for Sat
  3 Oct creates one reminder each for meiling (Aiman & Sofia 9:00 am), zulaikha, farah,
  and one coach digest listing 3 lessons; running again creates nothing new.
- Calling `mail-queue` without the token returns 401; with it, claim returns rows and
  marks them claimed; ack marks them sent; unacknowledged claims are re-claimable after
  15 minutes.
- End to end on the dev project: book a lesson inside 24 h as a test customer whose
  email is Herman's own → within 5 minutes Herman receives the confirmation and the
  late-change alert from his Gmail.
- Password reset email arrives through Gmail SMTP.
- When `MailApp.getRemainingDailyQuota()` is 0 the script sends nothing and the rows
  stay queued for the next day.
- HANDOFF.md updated.
