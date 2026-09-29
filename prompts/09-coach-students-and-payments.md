# Prompt 09: Students & payments, Add students, approvals

## CONTEXT
Coach schedule works (prompt 08). Now the money and people side. Read DESIGN §4
(Students & payments, Add students) and §6 (messages), PRD BR-2, BR-3, BR-6, BR-18 to
BR-26, TECH_SPEC §5.2 (`record_payment`, `add_free_lesson`, `excuse_booking`), §5.3, §7
(`admin-accounts`), DESIGN §5 (responsive), and `design/AdminStudents.dc.html`,
`design/AdminAddStudents.dc.html` and their `…Phone.dc.html` pairs.

## DIAGNOSE
1. Confirm `group_balance` through the API as herman matches the same view in the SQL
   editor at that moment (the §10 numbers are tested at the pinned clock).
2. Confirm `create_group`, `record_payment`, `approve_account` and the `admin-accounts`
   function work and refuse customers. `pending_accounts` and `delete_account` don't
   exist yet: TASK 1 builds them. Run `npm run test:db` first: real calls change the
   dev database, and afterwards the database tests stop until Herman reloads it
   (`npx supabase db reset --linked`, DEV_SETUP §4).
3. List the table/filter components you'll build and how the right panel is opened from
   other screens (for example `/coach/students?pay=<group_id>` from Needs attention).

## TASK
1. **Students & payments** (`/coach/students`):
   - Search (student or account name), "Add students" button.
   - Figures: Unpaid (names), On last lesson (names), Students · packages.
   - Filter tabs with counts: All, Unpaid, Last lesson, Paid, Waiting for approval.
     Default sort: needs action first (unpaid, then last lesson, then the rest by name).
   - Table (DESIGN §3 Table): Students (names, account, location), Type tag, Package
     (number, bar, counts), Status pill + note ("Starts today", "Since 18 Sep",
     "Last lesson 1 Oct", "New student"), Last paid (date, method), Action (Record
     payment for unpaid rows, History otherwise).
   - Right panel "Record payment": group, package (prefilled "1-to-1 · Package 6 ·
     4 lessons", or custom lessons), amount prefilled from the type price (pro rata for
     custom lessons: price × lessons / `lessons_per_package`, rounded to the cent, which
     is what `record_payment` uses for a null amount; with no price set a null amount
     fails `price_not_set`, so the coach must type the amount), Paid by
     (Cash, Transfer, FPX), date (today MYT; a future date is refused: `invalid_date`),
     note (up to 500 characters), Save payment → `record_payment(p_group_id, p_lessons,
     p_amount_cents, p_method, p_paid_on, p_note)`, then the row updates everywhere.
     Below: Add a free lesson (`add_free_lesson`), Excuse a missed lesson (pick from the
     group's booked lessons that have started → `excuse_booking`).
   - History drawer: payments and lessons (with package/lesson numbers, status).
   - Group actions in History: edit location, edit starting balances (both
     `update_group`: null keeps a value; a new location also moves the group's upcoming
     booked lessons), deactivate and reactivate (`set_group_active`). Deactivating is
     refused while lessons are booked ahead (`has_upcoming_lessons` {`count`}): say how
     many and that they must be cancelled first, and each cancellation emails the
     customer. Reactivating is refused while an active group has the same students
     (`duplicate_group`).
   - Waiting for approval tab: new accounts with name, username, email, phone, sign-up
     date; Approve (`approve_account`) / Remove. The coach can't read other accounts'
     emails (they stay in `auth.users`) and nothing removes an account yet, so build
     both here (a new migration, its grant in `tests/db/rls.test.ts`, TECH_SPEC §5.3
     and §7): `pending_accounts()`, coach only (security definer, granted to
     `authenticated`; never a view over `auth.users`), returning id, username,
     display_name, phone, email (through `account_email`), whether the email is
     confirmed, and created_at for customers with `approved = false`; and an
     `admin-accounts` action `delete_account {account_id}` (`auth.admin.deleteUser`),
     only for unapproved accounts with no groups.
2. **Add students** (`/coach/add-students`), matching the design:
   - Account: pick an existing account or "Create a new account…" (name, username with
     availability check through `username_available`, email, phone → `admin-accounts
     create_account`, invite email).
   - Lesson type segmented (1-to-1/2/3) controlling 1–3 student rows; each row is
     either an existing student of that account (select) or a new name.
     `create_group` takes `{"student_id"}` or `{"name"}` items and every `{"name"}`
     makes a new student, so when a typed name matches one of the account's students
     the form selects that student instead.
   - Pool location; "First package already paid" (then amount and method: a payment of
     `lessons_per_package` lessons dated today; prefill the amount from the type price,
     and with no price set the coach types it, since a null amount fails
     `price_not_set`); "Starting balance" (advanced, collapsed): lessons already used /
     already paid.
   - Preview of what the customer will see; button "Add 3 students" / "Add student" →
     `create_group`. Errors (`duplicate_group`, `group_full`, `invalid_name`, …) show
     DESIGN §6's coach messages.
   - On success go back to the table with the new row highlighted.

## VALIDATION
- Table matches `group_balance` for all groups (TECH_SPEC §10 on the shifted Saturday); filters and counts correct (Unpaid 2,
  Last lesson 2).
- Recording Hana's payment turns her row Paid and removes her from Needs attention.
- Creating a 1-to-3 group for zulaikha's account with three new names makes it appear
  in her Book screen's "Who's this lesson for?" with the 1-to-3 tag.
- Duplicate group (same students, active) is refused with a clear message.
- A new customer created by the coach receives an invite and can log in already
  approved (until prompt 11 sets up SMTP, invite one of Herman's own addresses: only
  team members receive auth emails); a self sign-up appears under Waiting for approval.
- herman sees a self sign-up's email under Waiting for approval; customers calling
  `pending_accounts` or `delete_account` are refused, and `delete_account` refuses
  approved accounts and accounts with groups.
- Screens match the designs at 1440 px and the `…Phone` drawings at 390 px, with no
  sideways scrolling at DESIGN §5's widths: Record payment sits beside the table from
  1280 px, opens as a drawer at 768–1279 px and full screen on phones.
- HANDOFF.md updated.
