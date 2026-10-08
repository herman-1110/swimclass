# Database map

Where everything in the database is defined now, so the current version of a function
can be found without reading every migration (ARCHITECTURE §4). Update this file in the
same commit as any migration that adds, replaces or drops something.

Everything lives in the `public` schema. What the website may call is decided by grants:
the API functions below are granted to `authenticated` (and one to `anon`); internal
functions have no grant, so only other functions can run them. `tests/db/rls.test.ts`
checks that list. Rules and wording: TECH_SPEC §3 to §8, DESIGN §6.

Migration names below drop the `supabase/migrations/` folder.

## Migrations

| Migration | Prompt | Contents |
|---|---|---|
| `20260928100000_schema` | 02 | enums, tables, constraints, indexes, the settings row, weekly hours |
| `20260928100100_triggers` | 02 | profile on sign-up, group member checks, `settings.updated_at` |
| `20260928100200_views` | 02 | `app_now`, `lessons_for`, `package_settings`; the three views |
| `20260928100300_rls` | 02 | RLS policies, grants, the helpers policies use |
| `20260928120000_availability` | 03 | open windows, `slot_check`, `week_slots`, `week_busy`, `coach_week` |
| `20260929100000_coach_slot_check` | 04 | `slot_check` with the coach's options; `coach_slot_check` |
| `20260929100100_emails` | 04 | time text, `email_text`/`email_html`, `queue_email`, the four templates |
| `20260929100200_booking` | 04 | booking, cancelling, excusing, payments, free lessons |
| `20260929100300_groups_accounts` | 04 | groups, approving accounts, `username_available` |
| `20260929100400_settings` | 04 | public settings, open hours, exceptions, settings, announcements |
| `20260929110000_update_email_links` | 04 | the confirmation links to `/my-classes` |
| `20260929110100_fix_email_link_pattern` | 04 | `email_html` links may contain `-` |
| `20260929110200_fix_email_text` | 04 | `email_text` also breaks up `{{` inside `{{{` |
| `20261004100000_hardening` | audit | customer change limit, coach writes only through functions, table caps, `username_available` length guard |
| `20261004120000_add_login_limiter` | 05 | `login_attempts` gets `ip` and a username cap; `check_login_attempt`, `record_login_success` |
| `20261005100000_pending_accounts` | 09 | `pending_accounts`: the accounts waiting for approval, with their email |
| `20261006100000_mail_queue` | 11 | the reminder and digest templates, `queue_daily_emails`, `claim_outbox`, `ack_outbox`, `email_log`; an index on unsent emails |
| `20261007100000_payment_limit` | Herman, 7 Oct | `record_payment` goes at most one package ahead of the lessons booked: `paid_ahead`, `too_many_lessons` |
| `20261008100000_profile_language` | HANDOFF v0.26 | `profiles.language` (sign-up, the account holder); Chinese dates and times; the four student emails in Chinese (the English ones renamed `…_en`) |

## Tables

| Table | Defined in | What it's for |
|---|---|---|
| `profiles` | `…100000_schema` (`language`: `…100000_profile_language`) | one per auth user (made by `handle_new_user`): username, name, phone, role, approved, language ('en', 'zh', or null: never chose) |
| `students` | `…100000_schema` | the swimmers of an account |
| `groups` | `…100000_schema` | 1 to 3 students of one account who book together; location, starting balances, active |
| `group_members` | `…100000_schema` | which students are in which group |
| `bookings` | `…100000_schema` | lessons: group, start and end, status, gap override, series |
| `payments` | `…100000_schema` | payments per group: lessons, amount, method, date, note |
| `availability_rules` | `…100000_schema` | the weekly open hours (MYT) |
| `availability_exceptions` | `…100000_schema` | Block time (`closed`) and Open extra time (`open`) |
| `announcements` | `…100000_schema` | the coach's messages to customers; pinned, removed |
| `settings` | `…100000_schema` | the one settings row (id 1) |
| `email_outbox` | `…100000_schema` (index on unsent rows: `…100000_mail_queue`) | emails waiting for the mailer, and those sent in the last 90 days; service role only (the coach reads it through `email_log`) |
| `daily_jobs` | `…100000_schema` | which daily email jobs ran for which date ('reminder', 'digest'); service role only |
| `login_attempts` | `…100000_schema` (`ip`, username cap: `…120000_add_login_limiter`) | the login rate limit (BR-4): username, IP, time, ok; kept a day; service role only |
| `booking_changes` | `…100000_hardening` | a customer's recent bookings and cancellations, for the 10-in-24-hours limit; no grants |

Enums (`…100000_schema`): `app_role`, `booking_status`, `payment_method`,
`exception_kind`.

## Views

All three run with the caller's rights (`security_invoker`), so RLS applies.

| View | Defined in | What it's for |
|---|---|---|
| `group_details` | `…100200_views` | each group's members, type and display names ("Aiman & Sofia") |
| `booking_ledger` | `…100200_views` | counted lessons per group in order: package number, "lesson 2 of 4", used |
| `group_balance` | `…100200_views` | per group: used, booked, paid, unpaid, `can_still_book`, last paid lesson |

## API functions

Granted to `authenticated`; the coach's functions check `is_coach()` first. Errors are
listed in each function's header comment in its migration.

| Function | Defined in | Who | What it does |
|---|---|---|---|
| `username_available` | `…100300_groups_accounts` | anyone (also `anon`) | sign-up's live username check |
| `get_public_settings` | `…100400_settings` | signed in | the settings customers may see |
| `week_slots` | `…120000_availability` | approved customers, coach | every start time of a week, with why each clashes |
| `week_busy` | `…120000_availability` | approved customers, coach | a week's open, closed and booked blocks, without names |
| `book_lesson` | `…100200_booking` | approved customers | book one lesson or several weeks for their group |
| `cancel_booking` | `…100200_booking` | approved customers, coach | cancel a lesson (customers before the cutoff) |
| `coach_week` | `…120000_availability` | coach | the coach's week: every booking with names and balances |
| `coach_slot_check` | `…100000_coach_slot_check` | coach | Add booking's live clash reason |
| `coach_book` | `…100200_booking` | coach | Add booking, with the coach's overrides |
| `excuse_booking` | `…100200_booking` | coach | excuse a lesson that has started |
| `record_payment` | `…100000_payment_limit` | coach | record a payment for a group, at most one package ahead of the lessons booked |
| `add_free_lesson` | `…100200_booking` | coach | a free lesson: a payment of 1 lesson, RM 0 |
| `create_group` | `…100300_groups_accounts` | coach | Add students |
| `update_group` | `…100300_groups_accounts` | coach | change a group's location and starting balances |
| `set_group_active` | `…100300_groups_accounts` | coach | deactivate or reactivate a group |
| `approve_account` | `…100300_groups_accounts` | coach | approve a sign-up |
| `pending_accounts` | `…100000_pending_accounts` | coach | the accounts waiting for approval, with their email from `auth.users` |
| `email_log` | `…100000_mail_queue` | coach | the latest emails (50 by default, at most 200), newest first: when, to whom, kind, sent, tries, last error |
| `set_open_hours` | `…100400_settings` | coach | replace the weekly open hours |
| `add_exception` | `…100400_settings` | coach | Block time or Open extra time |
| `remove_exception` | `…100400_settings` | coach | remove one of those |
| `update_settings` | `…100400_settings` | coach | change settings |
| `post_announcement` | `…100400_settings` | coach | message all customers (banner and email) |
| `remove_announcement` | `…100400_settings` | coach | take a message down |

## Service-role functions

Granted only to `service_role`, which the Edge Functions use (TECH_SPEC §7).

| Function | Defined in | Who | What it does |
|---|---|---|---|
| `check_login_attempt` | `…120000_add_login_limiter` | `login` | the login limit: refuses after 10 failures per username and IP or 30 per IP in 15 minutes (`too_many_attempts`), else records the try as a failure and returns the account's email |
| `record_login_success` | `…120000_add_login_limiter` | `login` | marks a try a success; forgets that username's earlier failures from that IP |
| `queue_daily_emails` | `…100000_mail_queue` | `mail-queue` | queues tomorrow's reminders (from `reminder_time`) and the coach digest (from `digest_time`), once each per date (`daily_jobs`) |
| `claim_outbox` | `…100000_mail_queue` | `mail-queue` | hands out up to 50 unsent emails (reminders, digests and late alerts first, then the oldest); releases claims older than 15 minutes as a failed try; deletes rows sent or given up on more than 90 days ago |
| `ack_outbox` | `…100000_mail_queue` | `mail-queue` | records a claimed email as sent, or as a failed try (up to 5; the error's first 500 characters) |

Also granted to `authenticated`, because RLS policies and the views run them with the
caller's rights: `is_coach`, `is_approved`, `my_account_id` (`…100300_rls`) and
`app_now`, `lessons_for`, `package_settings` (`…100200_views`). They only answer about
the caller or read settings.

## Internal functions (no grant)

| Function | Defined in | What it does |
|---|---|---|
| `handle_new_user` | `…100000_profile_language` | trigger: a profile for every new auth user, with the language Sign up sends |
| `check_group_member` | `…100100_triggers` | trigger: members belong to the group's account; group size limit |
| `check_group_not_empty` | `…100100_triggers` | trigger, checked at commit: a group keeps at least one member |
| `check_account_change` | `…100100_triggers` | trigger: groups and students never move to another account |
| `touch_updated_at` | `…100100_triggers` | trigger: `settings.updated_at` |
| `myt_text` | `…120000_availability` | an instant as MYT text with its offset, for JSON |
| `open_windows` | `…120000_availability` | a day's open windows: weekly hours plus and minus exceptions |
| `lesson_travel` | `…120000_availability` | travel to draw next to each booked lesson |
| `slot_check` | `…100000_coach_slot_check` | the one check of whether a lesson fits (BR-8 to BR-12) |
| `myt_day_text`, `myt_time_text`, `myt_range_text`, `myt_when_text` | `…100100_emails` | dates and times as email text ("Sat 3 Oct, 9:00–10:00 am") |
| `html_escape` | `…100100_emails` | escape text for HTML emails |
| `email_text` | `…110200_fix_email_text` | neutralise `{{` in free text put into emails |
| `email_html` | `…110100_fix_email_link_pattern` | an email's HTML from its text, with the templates' links |
| `account_email` | `…100100_emails` | an account's address from `auth.users` (also read by `pending_accounts`) |
| `queue_email` | `…100100_emails` | add one email to the outbox, once per dedupe key |
| `email_booked`, `email_cancelled`, `email_broadcast`, `email_reminder` | `…100000_profile_language` | the student emails: each picks `…_zh` for an account whose language is 'zh', else `…_en` |
| `email_booked_en` | `…110000_update_email_links` (renamed in `…100000_profile_language`) | the booking confirmation in English |
| `email_cancelled_en`, `email_broadcast_en` | `…100100_emails` (renamed in `…100000_profile_language`) | a cancelled lesson, the coach's message, in English |
| `email_late_alert` | `…100100_emails` | the coach's late-change alert |
| `email_booked_zh`, `email_cancelled_zh`, `email_broadcast_zh`, `email_reminder_zh` | `…100000_profile_language` | the same four student emails in Chinese |
| `myt_period_zh`, `myt_day_text_zh`, `myt_time_text_zh`, `myt_range_text_zh`, `myt_when_text_zh` | `…100000_profile_language` | dates and times in Chinese: 10月3日 周六 晚上7:30–8:30 |
| `queue_booked_emails`, `queue_cancelled_emails`, `queue_broadcast_emails` | `…100100_emails` | who gets which email after a change |
| `email_reminder_en` | `…100000_mail_queue` (renamed in `…100000_profile_language`) | the evening reminder to one account in English: its lessons on a date, each with its cancel deadline |
| `email_digest` | `…100000_mail_queue` | the coach's "Tomorrow's schedule": lessons with travel gaps, unpaid and last-lesson groups among them, sign-ups waiting |
| `ringgit_text`, `duration_text` | `…100000_mail_queue` | "RM 260", "1 hour 30 min" for emails |
| `lock_booking_dates` | `…100200_booking` | the booking-date locks that stop two bookings racing |
| `package_price_cents` | `…100200_booking` | a group's package price, pro rata |
| `place_bookings` | `…100200_booking` | the shared booking steps behind `book_lesson` and `coach_book` |
| `limit_booking_changes` | `…100000_hardening` | trigger: a customer's 10 bookings or cancellations in 24 hours (`too_many_changes`) |
| `limit_open_hours_rules` | `…100000_hardening` | trigger: at most 50 open-hours ranges (`too_many_rules`) |

## Triggers

| Trigger | Table | Function |
|---|---|---|
| `on_auth_user_created` | `auth.users` | `handle_new_user` |
| `group_members_check` | `group_members` | `check_group_member` |
| `groups_not_empty`, `group_members_not_empty` (checked at commit) | `groups`, `group_members` | `check_group_not_empty` |
| `groups_account_change`, `students_account_change` | `groups`, `students` | `check_account_change` |
| `settings_touch_updated_at` | `settings` | `touch_updated_at` |
| `bookings_limit_changes_insert`, `bookings_limit_changes_cancel` | `bookings` | `limit_booking_changes` |
| `availability_rules_limit` (per statement) | `availability_rules` | `limit_open_hours_rules` |

## Other files

- `seed.sql`: the sample data (week of Mon 28 Sep 2026). Dev project only, never prod.
- `scripts/`: SQL run by hand. `shift-seed.sql` moves the sample week forward
  (TECH_SPEC §10); `make-coach.sql` makes the coach's confirmed email the coach, once
  per project (TECH_SPEC §9).
- `functions/`: the Edge Functions (TECH_SPEC §7): `login` and `admin-accounts`
  (prompt 05), `mail-queue` (prompt 11; `mail.ts` holds its plain helpers, unit-tested by
  Vitest). `_shared/` holds the website's door (`http.ts`: CORS, JSON, refusals) and the
  Supabase clients (`clients.ts`).
- `templates/`: the Auth emails (confirm sign-up, invite, reset password) in the site's plain
  style, pasted into the dashboard by hand (HANDOFF v0.19); `config.toml` points the local
  stack at them.
