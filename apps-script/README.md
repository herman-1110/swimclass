# The Gmail mailer (Apps Script)

`Code.gs` sends the site's emails (booking confirmations, cancellations, late-change alerts,
messages to customers, the evening reminders and your "Tomorrow's schedule") from your Gmail.
Every 5 minutes it asks the `mail-queue` Edge Function for the emails waiting in the outbox,
sends them, and reports back which went out (TECH_SPEC §8). Replies come straight to your
Gmail. Settings → Email log shows what went out.

Gmail allows 100 recipients a day. When they are used up, the script sends nothing, and the
rest wait in the outbox and go out the next day, oldest first.

## Before you start

- The `mail-queue` function is deployed to the Supabase project, and its `MAIL_TOKEN` secret is
  set (HANDOFF lists the commands). You need the same token below.
- You know the project's address: Supabase dashboard → Project Settings → API → Project URL,
  like `https://abcdefghijklmnop.supabase.co`.

## Set it up (once per Supabase project)

1. In Chrome, sign in to Google with the Gmail address the site sends from (customers see it
   as the sender). If you have several Google accounts, use a window where only that one is
   signed in, or choose it in the account menu: the script sends from whoever owns it.
2. Open <https://script.google.com> and click **New project**.
3. Click **Untitled project** at the top and name it, for example `swimclass mailer`.
4. In `Code.gs`, select all the sample code and delete it. Paste the whole of this folder's
   `Code.gs`. Click the save icon (or Ctrl+S).
5. Click **Project Settings** (the gear icon on the left). Scroll to **Script Properties** and
   click **Add script property** three times:

   | Property         | Value                                                             |
   | ---------------- | ----------------------------------------------------------------- |
   | `MAIL_QUEUE_URL` | the Project URL plus `/functions/v1/mail-queue`                   |
   | `MAIL_TOKEN`     | the token you set as the `MAIL_TOKEN` secret                      |
   | `SENDER_NAME`    | your business name, as in Settings → Business name                |

   Click **Save script properties**.
6. Click **Editor** (the `< >` icon on the left). In the toolbar, choose **poll** in the list
   of functions and click **Run**. The first time, Google asks for permission:
   - **Review permissions** → choose your account.
   - "Google hasn't verified this app": click **Advanced** → **Go to swimclass mailer
     (unsafe)**. It is your own script, so this is expected.
   - Allow it to **send email as you**, **connect to an external service** and **run when you
     are not present**.

   The log at the bottom should end with "Execution completed". An error such as
   `mail-queue answered 401` means the token or the URL doesn't match: check step 5.
7. Choose **install** in the list of functions and click **Run**. It starts the 5-minute timer.
8. Check it: **Triggers** (the clock icon on the left) shows `poll`, Time-based, every 5
   minutes. **Executions** (the list icon) shows each run; a failed one shows its error.

## Stop it

Choose **uninstall** in the list of functions and click **Run**, or open **Triggers**, click
the ⋮ next to `poll` and **Delete trigger**. Nothing is sent after that; emails wait in the
outbox until you run **install** again.

## Move it to another Supabase project

Change `MAIL_QUEUE_URL` and `MAIL_TOKEN` in Project Settings → Script Properties. Emails
already waiting in the old project's outbox stay there.

## If you change Code.gs

Paste the new version over the old one and save. The trigger keeps running the new `poll`.
