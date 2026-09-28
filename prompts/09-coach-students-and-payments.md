# Prompt 09: Students & payments, Add students, approvals

## CONTEXT
Coach schedule works (prompt 08). Now the money and people side. Read DESIGN §4
(Students & payments, Add students), PRD BR-2, BR-3, BR-6, BR-18 to BR-26, TECH_SPEC
§5.2 (`record_payment`, `add_free_lesson`, `excuse_booking`), §5.3, §7
(`admin-accounts`), and `design/AdminStudents.dc.html`, `design/AdminAddStudents.dc.html`.

## DIAGNOSE
1. Confirm `group_balance` through the API as herman matches the same view in the SQL
   editor at that moment (the §10 numbers are tested at the pinned clock).
2. Confirm `create_group`, `record_payment`, `approve_account` and the `admin-accounts`
   function work and refuse customers.
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
     4 lessons", or custom lessons), amount prefilled from the type price, Paid by
     (Cash, Transfer, FPX), date (today MYT), note, Save payment → `record_payment`,
     then the row updates everywhere. Below: Add a free lesson, Excuse a missed lesson
     (pick from the group's past lessons).
   - History drawer: payments and lessons (with package/lesson numbers, status).
   - Group actions in History: edit location, edit starting balances, deactivate.
   - Waiting for approval tab: new accounts with name, username, email, phone, sign-up
     date; Approve / Remove.
2. **Add students** (`/coach/students/new`), matching the design:
   - Account: pick an existing account or "Create a new account…" (name, username with
     availability check, email, phone → `admin-accounts create_account`, invite email).
   - Lesson type segmented (1-to-1/2/3) controlling 1–3 student rows; each row is
     either an existing student of that account (select) or a new name.
   - Pool location; "First package already paid" (then amount and method);
     "Starting balance" (advanced, collapsed): lessons already used / already paid.
   - Preview of what the customer will see; button "Add 3 students" / "Add student".
   - On success go back to the table with the new row highlighted.

## VALIDATION
- Table matches `group_balance` for all groups (TECH_SPEC §10 on the shifted Saturday); filters and counts correct (Unpaid 2,
  Last lesson 2).
- Recording Hana's payment turns her row Paid, removes her from Needs attention and
  from the coach digest's unpaid list.
- Creating a 1-to-3 group for zulaikha's account with three new names makes it appear
  in her Book screen's "Who's this lesson for?" with the 1-to-3 tag.
- Duplicate group (same students, active) is refused with a clear message.
- A new customer created by the coach receives an invite and can log in already
  approved; a self sign-up appears under Waiting for approval.
- Screens match the designs at 1440 px and remain usable at 1024 px.
- HANDOFF.md updated.
