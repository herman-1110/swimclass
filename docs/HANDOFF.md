# Handoff

Update this file at the end of every Claude Code session. Newest entry on top.
Keep entries short; link to files instead of pasting code.

## v0.0 · 27 Sep 2026 · Planning done, no code yet
**State**: Repo contains only the planning pack (CLAUDE.md, docs/, prompts/, design/).
**Next**: `prompts/01-project-setup.md`.
**Decisions so far**
- Static React app on Cloudflare; all rules in Supabase SQL functions; emails from Gmail
  through Apps Script polling the `mail-queue` Edge Function (TECH_SPEC §1).
- Packages belong to groups (1-to-1/2/3 from one account); coach creates groups.
- One unpaid package allowed; no lesson expiry; repeat weekly is all-or-nothing.
- Domain optional (swimclass.online considered); site works on the free Cloudflare address.
**Open issues**: none.
**Manual steps waiting on Herman**: create GitHub repo, Supabase account, Cloudflare
account; decide package prices; turn on Google 2-Step Verification (needed for the
Gmail App Password in prompt 11).

---
Template for new entries:

## vX.Y · <date> · <prompt number and title>
**State**: what works now, how to run it.
**Done**: bullet list with file paths.
**Next**: the next prompt, and anything half-finished.
**Decisions**: anything that changes or clarifies the docs (also update the doc).
**Open issues**: bugs, questions for Herman, shortcuts to revisit.
**Manual steps waiting on Herman**: accounts, keys, settings he must do himself.
